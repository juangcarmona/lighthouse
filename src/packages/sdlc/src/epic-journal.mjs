import { writeFile } from 'node:fs/promises';
import { isDeepStrictEqual } from 'node:util';
import { issueComments } from './stage-dispatch.mjs';
import { readActionsJson } from './actions-artifact.mjs';
import { epicCorrelation, epicJournalKey } from './epic-github.mjs';

const marker = '<!-- lighthouse-epic-journal:';
const positive = value => Number.isSafeInteger(Number(value)) && /^[1-9][0-9]*$/.test(String(value));
const sha = value => /^[a-f0-9]{40}$/.test(value ?? '');
const keyFor = epicJournalKey;
const artifactName = (parent, attempt) => `lighthouse-epic-journal-${parent}-${attempt}`;

function checkedReceipt(key, receipt, repository, parent) {
  if (!receipt || receipt.schemaVersion !== 1 || !['intent', 'created', 'linked', 'cancelled', 'merging', 'accepted'].includes(receipt.state) || !isDeepStrictEqual(receipt.correlation, epicCorrelation(receipt.correlation)) || receipt.correlation.repository !== repository || receipt.correlation.parent !== parent || keyFor(receipt.correlation) !== key) throw Error('Invalid epic journal receipt');
  const resource = receipt.resource;
  if (receipt.state === 'intent' && resource !== undefined || ['created', 'linked', 'merging', 'accepted'].includes(receipt.state) && !resource || resource !== undefined && (!positive(resource.id) || !positive(resource.number) || Object.keys(resource).sort().join(',') !== 'id,number')) throw Error('Epic receipt resource is invalid');
  const publication = receipt.publication;
  const needsPublication = receipt.correlation.kind === 'pull-request' && (['created', 'linked', 'merging', 'accepted'].includes(receipt.state) || receipt.state === 'cancelled' && !!resource);
  if (needsPublication && (!publication || !positive(publication.run) || !Number.isSafeInteger(publication.attempt) || publication.attempt < 1 || !sha(publication.head) || Object.keys(publication).sort().join(',') !== 'attempt,head,run') || !needsPublication && publication !== undefined) throw Error('Epic publication receipt is invalid');
  const merge = receipt.merge, merging = ['merging', 'accepted'].includes(receipt.state);
  if (merging && (receipt.correlation.kind !== 'pull-request' || !merge || !sha(merge.head) || merge.head !== publication.head || !sha(merge.base) || !sha(merge.candidate) || !Number.isSafeInteger(merge.review) || merge.review < 1 || receipt.state === 'accepted' && !sha(merge.commit) || Object.keys(merge).sort().join(',') !== (receipt.state === 'accepted' ? 'base,candidate,commit,head,review' : 'base,candidate,head,review')) || !merging && merge !== undefined) throw Error('Epic merge receipt is invalid');
  const refusal = receipt.refusal;
  if (refusal !== undefined && (receipt.correlation.kind !== 'pull-request' || receipt.state !== 'linked' || !refusal || refusal.status !== 405 || !sha(refusal.head) || !sha(refusal.base) || !sha(refusal.candidate) || !Number.isSafeInteger(refusal.review) || refusal.review < 1 || Object.keys(refusal).sort().join(',') !== 'base,candidate,head,review,status')) throw Error('Epic refusal receipt is invalid');
  const readiness = receipt.readiness;
  if (readiness !== undefined && (receipt.correlation.kind !== 'aggregate' || receipt.state !== 'linked' || !readiness || !sha(readiness.head) || !sha(readiness.base) || !sha(readiness.candidate) || Object.keys(readiness).sort().join(',') !== 'base,candidate,head')) throw Error('Epic aggregate readiness receipt is invalid');
  for (const field of ['checks', 'headChecks']) {
    const checks = receipt[field];
    if (checks === undefined) continue;
    const identity = checks?.identity;
    if (field === 'headChecks' && identity?.candidate !== identity?.head) throw Error('Epic head check identity is invalid');
    if (!['pull-request', 'aggregate'].includes(receipt.correlation.kind) || !resource || !checks || !identity || !sha(identity.head) || !sha(identity.base) || !sha(identity.candidate) || identity.branch !== `lighthouse/verification-${resource.number}-${identity.candidate}` || !Array.isArray(identity.workflows) || !identity.workflows.length || identity.workflows.length > 8 || new Set(identity.workflows).size !== identity.workflows.length || identity.workflows.some(name => !/^[\w.-]+\.ya?ml$/.test(name)) || !['not-sent', 'requested', 'observed'].includes(checks.reference) || !checks.requests || Array.isArray(checks.requests) || typeof checks.requests !== 'object' || Object.keys(checks).sort().join(',') !== 'identity,reference,requests' || Object.keys(identity).sort().join(',') !== 'base,branch,candidate,head,workflows') throw Error('Epic check identity is invalid');
    for (const [name, request] of Object.entries(checks.requests)) if (!identity.workflows.includes(name) || !request || !['requested', 'acknowledged', 'observed'].includes(request.state) || Object.keys(request).sort().join(',') !== (request.state === 'observed' ? 'run,state' : 'state') || request.state === 'observed' && !positive(request.run)) throw Error('Epic CI request is invalid');
  }
  const expected = [...(receipt.checks ? ['checks'] : []), ...(receipt.headChecks ? ['headChecks'] : []), 'correlation', ...(merge ? ['merge'] : []), ...(publication ? ['publication'] : []), ...(readiness ? ['readiness'] : []), ...(refusal ? ['refusal'] : []), ...(resource ? ['resource'] : []), 'schemaVersion', 'state'].sort().join(',');
  if (Object.keys(receipt).sort().join(',') !== expected) throw Error('Epic receipt has unexpected fields');
  return receipt;
}

function parseEntry(comment, repository, parent) {
  if (comment.user?.login !== 'github-actions[bot]' || comment.user.type !== 'Bot' || comment.issue_url !== `https://api.github.com/repos/${repository}/issues/${parent}` || !positive(comment.id)) throw Error('Untrusted epic journal comment');
  const matches = [...(comment.body ?? '').matchAll(/<!-- lighthouse-epic-journal:(\{[^\n]*\}) -->/g)];
  if (matches.length !== 1) throw Error('Missing or ambiguous epic journal marker');
  const value = JSON.parse(matches[0][1]);
  const workflow = value.workflowRevision !== undefined || value.workflowRef !== undefined;
  if (workflow && (!sha(value.workflowRevision) || typeof value.workflowRef !== 'string' || !value.workflowRef || value.workflowRef.length > 250)) throw Error('Invalid epic workflow identity');
  const fields = ['attempt', 'key', 'parent', 'receipt', 'repository', 'revision', 'runId', 'schemaVersion', ...(workflow ? ['workflowRevision', 'workflowRef'] : [])].sort().join(',');
  if (Object.keys(value).sort().join(',') !== fields || value.schemaVersion !== 1 || value.repository !== repository || value.parent !== parent || !positive(value.runId) || !Number.isSafeInteger(value.attempt) || value.attempt < 1 || !sha(value.revision) || typeof value.key !== 'string') throw Error('Invalid epic journal identity');
  checkedReceipt(value.key, value.receipt, repository, parent);
  return value;
}

// The marker identifies a candidate; only the owner-triggered run and its retained artifact authenticate it.
export async function readEpicResourceReceipt({ api, repository, owner, correlation, sourceRevision, defaultBranch, resource, allowedStates = ['linked'], readArtifact = readActionsJson }) {
  if (!isDeepStrictEqual(correlation, epicCorrelation(correlation)) || correlation.repository !== repository || !sha(sourceRevision) || !defaultBranch || resource && (!positive(resource.id) || !positive(resource.number)) || !Array.isArray(allowedStates) || !allowedStates.length || allowedStates.some(state => !['linked', 'accepted'].includes(state))) throw Error('Invalid epic resource admission');
  const parent = correlation.parent, key = keyFor(correlation);
  const comments = await issueComments(api, parent);
  const candidates = comments.filter(c => c.user?.login === 'github-actions[bot]' && c.user.type === 'Bot' && c.body?.includes(marker)).map(c => ({ comment: c, entry: parseEntry(c, repository, parent) })).filter(item => item.entry.key === key);
  if (candidates.length !== 1) throw Error('Epic resource journal is missing or ambiguous');
  const { comment, entry } = candidates[0], receipt = entry.receipt;
  if (entry.revision !== sourceRevision || !allowedStates.includes(receipt.state) || !isDeepStrictEqual(receipt.correlation, correlation) || resource && !isDeepStrictEqual(receipt.resource, resource)) throw Error('Epic resource receipt does not match the current identity');
  const origin = await api(`actions/runs/${entry.runId}/attempts/${entry.attempt}`);
  if (String(origin.id) !== String(entry.runId) || origin.run_attempt !== entry.attempt || origin.path !== '.github/workflows/lighthouse-sdlc-epic.yml' || origin.event !== 'workflow_dispatch' || origin.status !== 'completed' || origin.actor?.login !== owner || origin.triggering_actor?.login !== owner || origin.head_sha !== (entry.workflowRevision ?? sourceRevision) || origin.head_branch !== (entry.workflowRef ?? defaultBranch) || origin.repository?.full_name !== repository) throw Error('Epic resource journal origin is not trusted');
  const stored = await readArtifact(api, repository, entry.runId, artifactName(parent, entry.attempt), 'journal.json');
  if (!stored || stored.schemaVersion !== 1 || stored.repository !== repository || stored.parent !== parent || stored.revision !== sourceRevision || stored.workflowRevision !== entry.workflowRevision || stored.workflowRef !== entry.workflowRef || String(stored.runId) !== String(entry.runId) || stored.attempt !== entry.attempt || !isDeepStrictEqual(stored.entries?.[key], { commentId: comment.id, receipt })) throw Error('Epic resource journal artifact is missing or differs from its comment');
  return receipt;
}

export async function readEpicChildReceipt(input) {
  if (input.correlation?.kind !== 'child' || !input.resource) throw Error('Invalid epic child admission');
  return readEpicResourceReceipt(input);
}

export async function readEpicAggregateReceipt(input) {
  if (input.correlation?.kind !== 'aggregate' || !input.resource) throw Error('Invalid epic aggregate admission');
  const { api, repository, correlation } = input;
  const comments = await issueComments(api, correlation.parent);
  const matches = comments.filter(c => c.user?.login === 'github-actions[bot]' && c.user.type === 'Bot' && c.body?.includes(marker)).map(c => parseEntry(c, repository, correlation.parent)).filter(entry => entry.key === keyFor(correlation));
  if (matches.length !== 1) throw Error('Epic aggregate journal is missing or ambiguous');
  const sourceRevision = matches[0].revision;
  const receipt = await readEpicResourceReceipt({ ...input, sourceRevision });
  if (!receipt.readiness) throw Error('Epic aggregate has no readiness evidence');
  return { sourceRevision, receipt };
}

export async function createEpicJournal({ api, repository, owner, parent, sourceRevision, defaultBranch, run, path, authorize, readArtifact = readActionsJson }) {
  if (!/^[\w.-]+\/[\w.-]+$/.test(repository ?? '') || typeof owner !== 'string' || !positive(parent) || !sha(sourceRevision) || !defaultBranch || !positive(run?.id) || !Number.isSafeInteger(run?.run_attempt) || run.run_attempt < 1 || run.status !== 'in_progress' || run.path !== '.github/workflows/lighthouse-sdlc-epic.yml' || run.event !== 'workflow_dispatch' || run.actor?.login !== owner || run.triggering_actor?.login !== owner || !sha(run.head_sha) || typeof run.head_branch !== 'string' || !run.head_branch || run.head_branch.length > 250 || run.repository?.full_name !== repository || typeof authorize !== 'function' || typeof path !== 'string') throw Error('Epic journal requires an authenticated owner workflow');
  parent = Number(parent);
  const workflow = run.head_sha === sourceRevision && run.head_branch === defaultBranch ? {} : { workflowRevision: run.head_sha, workflowRef: run.head_branch };
  const journal = { schemaVersion: 1, repository, parent, revision: sourceRevision, ...workflow, runId: String(run.id), attempt: run.run_attempt, entries: {} };
  const loaded = new Map();
  const save = () => writeFile(path, JSON.stringify(journal));
  await save();
  async function readReceipt(key) {
    const comments = await issueComments(api, parent);
    const candidates = comments.filter(c => c.user?.login === 'github-actions[bot]' && c.user.type === 'Bot' && c.body?.includes(marker)).map(c => ({ comment: c, entry: parseEntry(c, repository, parent) })).filter(item => item.entry.key === key);
    if (candidates.length > 1) throw Error('Duplicate epic journal receipts');
    if (!candidates.length) { loaded.set(key, null); return null; }
    const { comment, entry } = candidates[0];
    if (entry.revision !== sourceRevision) throw Error('Epic journal source changed');
    let stored;
    if (entry.runId === String(run.id) && entry.attempt === run.run_attempt) stored = journal;
    else {
      const origin = await api(`actions/runs/${entry.runId}/attempts/${entry.attempt}`);
      if (String(origin.id) !== String(entry.runId) || origin.run_attempt !== entry.attempt || origin.path !== run.path || origin.event !== 'workflow_dispatch' || origin.status !== 'completed' || origin.actor?.login !== owner || origin.triggering_actor?.login !== owner || origin.head_sha !== (entry.workflowRevision ?? sourceRevision) || origin.head_branch !== (entry.workflowRef ?? defaultBranch) || origin.repository?.full_name !== repository) throw Error('Epic journal origin is not trusted');
      stored = await readArtifact(api, repository, entry.runId, artifactName(parent, entry.attempt), 'journal.json');
    }
    if (!stored || stored.schemaVersion !== 1 || stored.repository !== repository || stored.parent !== parent || stored.revision !== sourceRevision || stored.workflowRevision !== entry.workflowRevision || stored.workflowRef !== entry.workflowRef || String(stored.runId) !== String(entry.runId) || stored.attempt !== entry.attempt || !isDeepStrictEqual(stored.entries?.[key], { commentId: comment.id, receipt: entry.receipt })) throw Error('Epic journal artifact is missing or differs from its comment');
    loaded.set(key, { comment, receipt: entry.receipt });
    return entry.receipt;
  }
  async function writeReceipt(key, receipt) {
    checkedReceipt(key, receipt, repository, parent);
    if (!loaded.has(key)) throw Error('Epic journal must be read before writing');
    const previous = loaded.get(key);
    const { status: refusalStatus, ...refusedMerge } = receipt.refusal ?? {};
    const confirmedRefusal = previous?.receipt.state === 'merging' && receipt.state === 'linked' && refusalStatus === 405 && isDeepStrictEqual(refusedMerge, previous.receipt.merge) && isDeepStrictEqual(previous.receipt.publication, receipt.publication);
    if (previous && (!isDeepStrictEqual(previous.receipt.correlation, receipt.correlation) || previous.receipt.resource && !isDeepStrictEqual(previous.receipt.resource, receipt.resource) || !confirmedRefusal && !({ intent: ['created', 'cancelled'], created: ['created', 'linked', 'cancelled'], linked: ['linked', 'merging', 'cancelled'], merging: ['merging', 'accepted'], accepted: ['accepted'], cancelled: ['cancelled'] })[previous.receipt.state].includes(receipt.state))) throw Error('Epic journal transition is invalid');
    if (receipt.refusal && !confirmedRefusal && !isDeepStrictEqual(receipt.refusal, previous?.receipt.refusal)) throw Error('Epic refusal identity changed');
    if (previous?.receipt.merge && !confirmedRefusal) {
      const { commit: ignored, ...identity } = receipt.merge ?? {};
      const { commit: previousCommit, ...prior } = previous.receipt.merge;
      if (!isDeepStrictEqual(identity, prior) || previousCommit && previousCommit !== receipt.merge?.commit || !isDeepStrictEqual(previous.receipt.publication, receipt.publication)) throw Error('Epic merge identity changed');
    }
    if (!previous && receipt.state !== 'intent') throw Error('Epic journal must start with intent');
    if (await authorize() !== true) throw Error('Epic journal authorization changed');
    const entry = { schemaVersion: 1, repository, parent, revision: sourceRevision, ...workflow, runId: String(run.id), attempt: run.run_attempt, key, receipt };
    const body = `${marker}${JSON.stringify(entry).replaceAll('<', '\\u003c').replaceAll('>', '\\u003e')} -->`;
    const comment = previous ? await api(`issues/comments/${previous.comment.id}`, 'PATCH', { body }) : await api(`issues/${parent}/comments`, 'POST', { body });
    if (!isDeepStrictEqual(parseEntry(comment, repository, parent), entry)) throw Error('Epic journal write could not be confirmed');
    journal.entries[key] = { commentId: comment.id, receipt };
    await save();
    loaded.set(key, { comment, receipt });
  }
  return { readReceipt, writeReceipt };
}
