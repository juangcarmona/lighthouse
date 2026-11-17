import { createHash } from 'node:crypto';
import { validatePublishable } from './process-publication.mjs';
import { readActionsJson } from './actions-artifact.mjs';

const sha = value => createHash('sha256').update(value).digest('hex');
export const canonical = value => JSON.stringify(value, (_key, item) => item && typeof item === 'object' && !Array.isArray(item) ? Object.fromEntries(Object.keys(item).sort().map(key => [key, item[key]])) : item);
export const acceptanceDigest = value => sha(canonical(value));
const revision = value => /^[a-f0-9]{40}$/.test(value ?? '');
const positive = value => Number.isSafeInteger(value) && value > 0;
function parseJson(text) { try { return JSON.parse(text); } catch { throw Error('Invalid source JSON'); } }
const marker = '<!-- lighthouse-delivery-decision:v1 -->';
const policyPath = '.lighthouse/delivery-acceptance.json';
function requireThat(condition, reason) { if (!condition) throw Error(reason); }

async function sourceFile(api, path, ref) {
  requireThat(revision(ref) && typeof path === 'string' && /^[\w./-]+$/.test(path) && !path.split('/').some(part => !part || part === '.' || part === '..'), 'Invalid immutable source reference');
  const file = await api(`contents/${path}?ref=${ref}`);
  requireThat(file.type === 'file' && file.encoding === 'base64' && file.size <= 65536, 'Source file unavailable or exceeds 64 KiB');
  const bytes = Buffer.from(file.content, 'base64');
  requireThat(bytes.length === file.size && createHash('sha1').update(Buffer.concat([Buffer.from(`blob ${bytes.length}\0`), bytes])).digest('hex') === file.sha, 'Source file content identity mismatch');
  return { path, revision: ref, blob: file.sha, sha256: sha(bytes), content: bytes.toString('utf8') };
}

export async function acceptancePolicy(api, repository, ref) {
  const repo = await api('');
  requireThat(repo.full_name === repository && positive(repo.id) && repo.owner?.type === 'User' && positive(repo.owner.id), 'First acceptance route requires an identified personal repository owner');
  const file = await sourceFile(api, policyPath, ref);
  const policy = parseJson(file.content);
  requireThat(policy.schemaVersion === 1 && policy.enabled === true && policy.route === 'repository-owner' && policy.repositoryId === repo.id && policy.ownerId === repo.owner.id && policy.producer?.workflow === '.github/workflows/lighthouse-delivery-acceptance.yml' && revision(policy.producer.workflowBlob) && typeof policy.producer.operator === 'string' && policy.producer.operator.length > 0, 'Acceptance route or producer not explicitly adopted');
  const tip = await api(`commits/${encodeURIComponent(repo.default_branch)}`);
  const current = await sourceFile(api, policyPath, tip.sha);
  requireThat(current.blob === file.blob, 'Acceptance policy is no longer current; a new decision is required');
  const workflow = await sourceFile(api, policy.producer.workflow, tip.sha);
  requireThat(workflow.blob === policy.producer.workflowBlob, 'Adopted producer workflow changed');
  const installed = await api('actions/workflows/lighthouse-delivery-acceptance.yml');
  requireThat(installed.state === 'active' && installed.path === policy.producer.workflow, 'Adopted producer is unavailable');
  return { repo, policy, reference: { path: policyPath, revision: ref, blob: file.blob, sha256: file.sha256 } };
}

async function retainedSubject(api, item) {
  const source = await sourceFile(api, item?.path, item?.revision);
  if (item.sha256) requireThat(item.sha256 === source.sha256, 'Scope or criteria digest changed');
  return { path: source.path, revision: source.revision, blob: source.blob, sha256: source.sha256 };
}

export async function prepareAcceptance(api, repository, input) {
  const { repo, reference } = await acceptancePolicy(api, repository, input.policyRevision);
  requireThat(positive(input.issue) && positive(input.pullRequest), 'An exact issue and PR are required');
  const issue = await api(`issues/${input.issue}`), pr = await api(`pulls/${input.pullRequest}`);
  requireThat(!issue.pull_request && positive(issue.id) && positive(pr.id) && pr.base.repo.id === repo.id && pr.head.repo?.id === repo.id && revision(pr.head.sha), 'Candidate identity does not match the adopted repository');
  const binding = { repository: { id: repo.id, fullName: repository }, workItem: { id: issue.id, number: issue.number, url: issue.html_url }, candidate: { kind: 'pull-request', id: pr.id, number: pr.number, head: pr.head.sha, url: pr.html_url }, scope: await retainedSubject(api, input.scope), criteria: await retainedSubject(api, input.criteria), policy: reference };
  const decision = { schemaVersion: 1, route: 'repository-owner', binding, outcome: 'accepted', corrects: [], replacement: null, reason: 'Replace with the owner delivery decision reason.' };
  return { schemaVersion: 1, binding, bindingDigest: acceptanceDigest(binding), comment: decisionComment(decision), effect: 'Prepared only; the repository owner must author a new explicit decision. No source decision or remote mutation was created.' };
}

export function decisionComment(decision) { return `${marker}\n\`\`\`json\n${JSON.stringify(decision, null, 2)}\n\`\`\``; }
export function parseAcceptanceDecision(body) {
  requireThat(typeof body === 'string' && Buffer.byteLength(body) <= 65536 && body.startsWith(marker), 'Not a bounded delivery-decision source');
  const match = body.match(/^<!-- lighthouse-delivery-decision:v1 -->\n```json\n([\s\S]+)\n```\s*$/);
  requireThat(match, 'Malformed delivery-decision source');
  const decision = parseJson(match[1]);
  requireThat(decision.schemaVersion === 1 && decision.route === 'repository-owner' && ['accepted', 'rejected', 'revoked', 'superseded'].includes(decision.outcome), 'Unsupported delivery decision');
  requireThat(Array.isArray(decision.corrects) && decision.corrects.length <= 32 && decision.corrects.every(id => /^github:[1-9][0-9]*:issue-comment:[1-9][0-9]*$/.test(id)) && new Set(decision.corrects).size === decision.corrects.length && typeof decision.reason === 'string' && decision.reason.trim().length > 0 && decision.reason.length <= 4096, 'Invalid correction references or decision reason');
  requireThat(['accepted', 'rejected'].includes(decision.outcome) || decision.corrects.length > 0, 'Withdrawal requires explicit predecessor decisions');
  requireThat(decision.outcome === 'superseded' ? /^github:[1-9][0-9]*:issue-comment:[1-9][0-9]*$/.test(decision.replacement) : decision.replacement === null, 'Invalid replacement decision');
  return decision;
}

async function authenticateSource(api, repository, commentId) {
  requireThat(positive(commentId), 'Invalid source comment ID');
  const comment = await api(`issues/comments/${commentId}`);
  const decision = parseAcceptanceDecision(comment.body), binding = decision.binding;
  const adopted = await acceptancePolicy(api, repository, binding?.policy?.revision);
  const { repo } = adopted;
  requireThat(canonical(binding.policy) === canonical(adopted.reference), 'Policy binding changed');
  requireThat(comment.id === commentId && comment.user?.id === repo.owner.id && comment.user.type === 'User' && comment.created_at === comment.updated_at, 'Source must be an unedited explicit owner decision');
  requireThat(binding.repository?.id === repo.id && binding.repository.fullName === repository && positive(binding.workItem?.number) && comment.issue_url === `https://api.github.com/repos/${repository}/issues/${binding.workItem.number}`, 'Source repository or work item mismatch');
  const issue = await api(`issues/${binding.workItem.number}`), pr = await api(`pulls/${binding.candidate?.number}`);
  requireThat(!issue.pull_request && issue.id === binding.workItem.id && issue.html_url === binding.workItem.url && binding.candidate.kind === 'pull-request' && pr.id === binding.candidate.id && pr.html_url === binding.candidate.url && pr.base.repo.id === repo.id && pr.head.repo?.id === repo.id && pr.head.sha === binding.candidate.head, 'Candidate or work item changed');
  requireThat(canonical(await retainedSubject(api, binding.scope)) === canonical(binding.scope) && canonical(await retainedSubject(api, binding.criteria)) === canonical(binding.criteria), 'Retained scope or criteria mismatch');
  return { ...adopted, decision, source: { id: comment.id, url: comment.html_url, createdAt: comment.created_at, updatedAt: comment.updated_at, body: comment.body, sha256: sha(comment.body), actor: { id: comment.user.id, login: comment.user.login } }, id: `github:${repo.id}:issue-comment:${comment.id}` };
}

async function authenticateProducer(api, adopted, producer, { producing = false } = {}) {
  requireThat(producer?.kind === 'github-actions' && positive(producer.runId) && positive(producer.attempt), 'Eligible producer execution is required');
  const run = await api(`actions/runs/${producer.runId}/attempts/${producer.attempt}`);
  requireThat(run.id === producer.runId && run.run_attempt === producer.attempt && run.repository?.id === adopted.repo.id && run.event === 'workflow_dispatch' && run.actor?.id === adopted.repo.owner.id && run.triggering_actor?.id === adopted.repo.owner.id && run.path === adopted.policy.producer.workflow && run.head_sha === producer.revision && revision(run.head_sha), 'Producer execution is not the adopted owner-dispatched workflow');
  requireThat(producing ? ['queued', 'in_progress'].includes(run.status) : run.status === 'completed' && run.conclusion === 'success', 'Producer execution is not usable');
  const workflow = await sourceFile(api, run.path, run.head_sha);
  requireThat(workflow.blob === adopted.policy.producer.workflowBlob && producer.workflowBlob === workflow.blob, 'Producer workflow content is not adopted');
  return run;
}

export async function produceAcceptance(api, repository, commentId, execution) {
  const authenticated = await authenticateSource(api, repository, commentId);
  const workflow = await sourceFile(api, authenticated.policy.producer.workflow, execution.revision);
  const producer = { kind: 'github-actions', runId: execution.runId, attempt: execution.attempt, revision: execution.revision, workflowBlob: workflow.blob, observedAt: new Date().toISOString() };
  await authenticateProducer(api, authenticated, producer, { producing: true });
  const receipt = { schemaVersion: 1, id: authenticated.id, route: 'repository-owner', decision: authenticated.decision, source: authenticated.source, producer };
  validatePublishable({ 'receipt.json': JSON.stringify(receipt) });
  return receipt;
}

async function sourceHistory(api, issue) {
  const comments = [];
  for (let page = 1; page <= 10; page++) {
    const batch = await api(`issues/${issue}/comments?per_page=100&page=${page}`);
    requireThat(Array.isArray(batch), 'Source history unavailable'); comments.push(...batch);
    if (batch.length < 100) return comments;
  }
  throw Error('Source history exceeds 1000-comment bound; completeness unavailable');
}

async function retainedHistory(api, repository, readArtifact) {
  const receipts = [], seenRuns = new Set();
  let expectedRuns;
  for (let page = 1; page <= 10; page++) {
    const result = await api(`actions/workflows/lighthouse-delivery-acceptance.yml/runs?event=workflow_dispatch&per_page=100&page=${page}`);
    requireThat(Array.isArray(result.workflow_runs) && result.total_count <= 1000, 'Producer history exceeds bound or is incomplete');
    expectedRuns ??= result.total_count;
    requireThat(expectedRuns === result.total_count, 'Producer history changed during collection; retry verification');
    for (const run of result.workflow_runs) {
      requireThat(!seenRuns.has(run.id), 'Producer history pagination contains duplicates'); seenRuns.add(run.id);
      const artifacts = await api(`actions/runs/${run.id}/artifacts?per_page=100`);
      requireThat(Array.isArray(artifacts.artifacts) && artifacts.total_count === artifacts.artifacts.length && artifacts.total_count <= 100, 'Producer artifact history incomplete');
      const retained = artifacts.artifacts.filter(a => /^lighthouse-delivery-acceptance-[1-9][0-9]*-[1-9][0-9]*$/.test(a.name));
      requireThat((run.conclusion !== 'success' || retained.length > 0) && retained.every(a => !a.expired), 'Producer receipt expired or missing; historical corrections cannot be excluded');
      for (const artifact of retained) receipts.push(await readArtifact(api, repository, run.id, artifact.name, 'receipt.json'));
      requireThat(receipts.length <= 1000, 'Retained decision history exceeds bound');
    }
    if (result.workflow_runs.length < 100) { requireThat(seenRuns.size === expectedRuns, 'Producer history pagination incomplete'); return receipts; }
  }
  throw Error('Producer history exceeds pagination bound');
}

export async function verifyAcceptance(api, repository, { binding, receipts = [] }, { readArtifact = readActionsJson, now = () => new Date().toISOString() } = {}) {
  const observedAt = now(), unavailable = reason => ({ schemaVersion: 1, status: 'unavailable', reason, recoveryOwner: 'repository-owner', observedAt, bindingDigest: acceptanceDigest(binding ?? null), historyCoverage: 'incomplete' });
  try {
    const adopted = await acceptancePolicy(api, repository, binding?.policy?.revision);
    requireThat(binding.repository?.id === adopted.repo.id && binding.repository.fullName === repository && positive(binding.workItem?.number), 'Requested repository or work item mismatch');
    const refreshed = await prepareAcceptance(api, repository, { policyRevision: binding.policy.revision, issue: binding.workItem.number, pullRequest: binding.candidate?.number, scope: binding.scope, criteria: binding.criteria });
    requireThat(canonical(refreshed.binding) === canonical(binding), 'Requested candidate binding is stale or invalid');
    requireThat(Array.isArray(receipts) && receipts.length <= 100, 'Receipt collection exceeds bound');
    const retained = await retainedHistory(api, repository, readArtifact);
    const history = await sourceHistory(api, binding.workItem.number);
    const sources = [];
    for (const comment of history.filter(c => c.user?.id === adopted.repo.owner.id && c.body?.startsWith(marker))) {
      const decision = parseAcceptanceDecision(comment.body);
      if (acceptanceDigest(decision.binding) === acceptanceDigest(binding)) sources.push(comment);
    }
    const relevant = retained.filter(r => acceptanceDigest(r.decision?.binding ?? null) === acceptanceDigest(binding));
    requireThat(relevant.every(r => receipts.some(s => canonical(s) === canonical(r))), 'Required retained history omitted from consumer input');
    const verified = new Map();
    for (const receipt of receipts) {
      requireThat(receipt.schemaVersion === 1 && receipt.route === 'repository-owner', 'Unsupported receipt version or route');
      if (acceptanceDigest(receipt.decision?.binding) !== acceptanceDigest(binding)) continue;
      validatePublishable({ 'receipt.json': JSON.stringify(receipt) });
      const source = await authenticateSource(api, repository, receipt.source?.id);
      requireThat(receipt.id === source.id && canonical(receipt.decision) === canonical(source.decision) && canonical(receipt.source) === canonical(source.source), 'Retained receipt and authenticated source differ');
      await authenticateProducer(api, source, receipt.producer);
      const artifact = await readArtifact(api, repository, receipt.producer.runId, `lighthouse-delivery-acceptance-${receipt.source.id}-${receipt.producer.attempt}`, 'receipt.json');
      requireThat(canonical(artifact) === canonical(receipt), 'Receipt was not retained by the adopted producer execution');
      if (verified.has(receipt.id)) requireThat(canonical(verified.get(receipt.id).decision) === canonical(receipt.decision) && canonical(verified.get(receipt.id).source) === canonical(receipt.source), 'Conflicting retry at one logical decision');
      else verified.set(receipt.id, receipt);
    }
    requireThat(sources.length === verified.size && sources.every(c => verified.has(`github:${adopted.repo.id}:issue-comment:${c.id}`)), 'Decision history has missing producer receipts');
    for (const receipt of verified.values()) if (receipt.decision.replacement) {
      const match = receipt.decision.replacement.match(/^github:([1-9][0-9]*):issue-comment:([1-9][0-9]*)$/);
      requireThat(Number(match[1]) === adopted.repo.id, 'Replacement belongs to another repository');
      const replacement = await authenticateSource(api, repository, Number(match[2]));
      requireThat(replacement.id !== receipt.id && replacement.decision.outcome === 'accepted', 'Supersession must name a separate owner acceptance source; replacement qualification remains independent');
    }
    const corrected = new Set();
    for (const receipt of verified.values()) for (const id of receipt.decision.corrects) {
      requireThat(id !== receipt.id && verified.has(id), 'Correction predecessor missing or self-referential'); corrected.add(id);
    }
    const visited = new Set(), visiting = new Set();
    const visit = id => {
      requireThat(!visiting.has(id), 'Cyclic correction history');
      if (visited.has(id)) return;
      visiting.add(id);
      for (const prior of verified.get(id).decision.corrects) visit(prior);
      visiting.delete(id); visited.add(id);
    };
    for (const id of verified.keys()) visit(id);
    const active = [...verified.values()].filter(r => !corrected.has(r.id));
    requireThat(active.length <= 1, 'Conflicting decisions require an explicit owner correction');
    const current = active[0];
    return { schemaVersion: 1, status: current?.decision.outcome ?? 'pending', decisionId: current?.id ?? null, reason: current ? 'Authenticated owner decision for this exact binding' : 'Adopted healthy route has no owner decision for this binding', observedAt, bindingDigest: acceptanceDigest(binding), historyCoverage: 'complete-at-observation', decisionIds: [...verified.keys()].sort(), sourceUrls: sources.map(s => s.html_url).sort(), limitations: ['Current only as of observation; artifact expiry, edited sources or inaccessible history make acceptance unavailable.', 'PR candidates only; artifact and delegated routes are unavailable.'] };
  } catch (error) { return unavailable(error.message); }
}
