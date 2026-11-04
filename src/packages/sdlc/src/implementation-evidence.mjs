import { createHash } from 'node:crypto';
import { readActionsJson } from './actions-artifact.mjs';
import { implementationPrProof } from './pr-state.mjs';
import { loadImplementation, changesDigest, validateCheckReceipt } from './implementation.mjs';
import { loadDispatch } from './stage-dispatch.mjs';
import { checkProposal, reviewThread } from './proposal-review.mjs';

const hash = text => createHash('sha256').update(text).digest('hex');
const digest = value => hash(JSON.stringify(value));
const sha = value => /^[a-f0-9]{40}$/.test(value ?? '');
const hex = value => /^[a-f0-9]{64}$/.test(value ?? '');
const positive = value => /^[1-9][0-9]*$/.test(String(value ?? ''));

export function commandEvidenceBinding(request) {
  const binding = { repository: request.repository, issue: request.issue, runId: request.runId,
    workflowRunId: String(request.workflowRunId), attempt: Number(request.attempt),
    sourceRevision: request.sourceRevision, policyRevision: request.baseRevision ?? request.sourceRevision, intent: request.taskDigest,
    policy: digest(request.implementation), planning: digest(request.planningReference ?? null) };
  if (!/^[\w.-]+\/[\w.-]+$/.test(binding.repository ?? '') || !Number.isSafeInteger(binding.issue) || binding.issue < 1 || !hex(binding.runId) || !positive(binding.workflowRunId) || !Number.isSafeInteger(binding.attempt) || binding.attempt < 1 || !sha(binding.sourceRevision) || !sha(binding.policyRevision) || !hex(binding.intent)) throw Error('Command evidence requires an admitted repository, work item, run, attempt and intent');
  return binding;
}

export function retainedCommandOutput(log, logTruncated = false) {
  const content = log.slice(0, 4096);
  let summary;
  try {
    const parsed = logTruncated ? null : JSON.parse(log);
    if (parsed?.summary && typeof parsed.summary === 'object' && !Array.isArray(parsed.summary) && Buffer.byteLength(JSON.stringify(parsed.summary)) <= 4096) summary = parsed.summary;
  } catch {}
  return { content, sha256: hash(content), logSha256: hash(log), logTruncated, truncated: logTruncated || content !== log,
    ...(summary ? { jsonSummary: summary, summarySha256: digest(summary) } : {}) };
}

export function implementationEvidenceBundle(request, receipt, changes, publication) {
  validateCheckReceipt(receipt, request, changes);
  if (receipt.schemaVersion !== 2 || digest(receipt.binding) !== digest(commandEvidenceBinding(request)) || !sha(receipt.candidateTree) || !sha(publication.head) || receipt.candidateTree !== publication.tree || !Number.isSafeInteger(publication.pr) || publication.pr < 1) throw Error('Command evidence does not bind the tested and published trees');
  const value = { schemaVersion: 1, producer: 'lighthouse-implementation-host', binding: receipt.binding,
    implementation: request.implementation, planningReference: request.planningReference ?? null,
    dispatch: request.dispatch ?? null, changesDigest: changesDigest(changes), publication, receipt };
  if (Buffer.byteLength(JSON.stringify(value)) > 128000) throw Error('Command evidence exceeds artifact member bounds');
  return value;
}

// An injected API must be authenticated by the host, never supplied by an agent result.
export async function readImplementationEvidence(api, completion, { readArtifact = readActionsJson, now = Date.now() } = {}) {
  const { repository, issue, pr, head, intent } = completion.binding;
  const unavailable = reason => ({ status: 'unavailable', reason, checks: [] });
  try {
    const comments = [];
    for (let page = 1; page <= 10; page++) {
      const batch = await api(`issues/${issue}/comments?per_page=100&page=${page}`);
      if (!Array.isArray(batch)) throw Error('Invalid implementation receipt inventory');
      comments.push(...batch);
      if (batch.length < 100) break;
      if (page === 10) throw Error('Implementation receipt inventory exceeds bounds');
    }
    const proof = implementationPrProof(comments, { number: pr, head: { sha: head, repo: { full_name: repository } } });
    if (!proof) return unavailable('No current-head implementation receipt');
    const run = await api(`actions/runs/${proof.run}`);
    const attempt = proof.attempt ?? run.run_attempt;
    if (!positive(attempt) || run.run_attempt !== Number(attempt)) throw Error('Implementation run attempt changed');
    const native = await api(`actions/runs/${proof.run}/attempts/${attempt}`);
    const owner = repository.split('/')[0], path = native.path;
    if (String(native.id) !== String(proof.run) || native.run_attempt !== Number(attempt) || !sha(native.head_sha) || native.repository?.full_name !== repository || !['.github/workflows/lighthouse-sdlc-implement.lock.yml', '.github/workflows/lighthouse-sdlc-apply-review.lock.yml'].includes(path) || native.event !== 'workflow_dispatch' || native.head_branch !== completion.binding.branch || native.status !== 'completed' || native.conclusion !== 'success' || ![owner, 'github-actions[bot]'].includes(native.actor?.login) || ![owner, 'github-actions[bot]'].includes(native.triggering_actor?.login)) throw Error('Command producer is not a successful adopted implementation workflow');
    const artifact = await readArtifact(api, repository, native.id, `lighthouse-command-evidence-${issue}-${attempt}`, 'implementation-evidence.json', true);
    if (!artifact) return unavailable('Command evidence artifact is absent; revalidate the candidate');
    const { binding, receipt, publication } = artifact;
    if (artifact.schemaVersion !== 1 || artifact.producer !== 'lighthouse-implementation-host' || binding?.repository !== repository || binding.issue !== issue || binding.intent !== intent || String(binding.workflowRunId) !== String(native.id) || binding.attempt !== Number(attempt) || publication?.pr !== pr || publication.head !== head || digest(binding) !== digest(receipt?.binding) || !hex(artifact.changesDigest) || receipt.changesDigest !== artifact.changesDigest || receipt.runId !== binding.runId || receipt.sourceRevision !== binding.sourceRevision || receipt.schemaVersion !== 2) throw Error('Command receipt identity, criteria or publication binding changed');
    const expected = commandEvidenceBinding({ ...binding, baseRevision: binding.policyRevision, taskDigest: intent, implementation: artifact.implementation, planningReference: artifact.planningReference });
    if (digest(expected) !== digest(binding)) throw Error('Command policy or plan binding changed');
    if (artifact.dispatch) {
      const origin = await loadDispatch(api, repository, owner, issue, artifact.dispatch.commentId, native, readArtifact);
      if (origin.request.id !== artifact.dispatch.requestId || origin.receipt.digest !== artifact.dispatch.digest || origin.request.stage !== 'implement' || origin.request.sourceRevision !== binding.policyRevision || origin.request.taskDigest !== intent) throw Error('Command origin does not bind the admitted inputs');
    } else if (native.actor.login !== owner || native.triggering_actor.login !== owner) throw Error('Bot command producer has no authenticated dispatch origin');
    const [installed, executed, commit, implementation] = await Promise.all([
      api(`contents/${path}?ref=${completion.currentRevision}`), api(`contents/${path}?ref=${native.head_sha}`),
      api(`git/commits/${head}`), loadImplementation(api, issue, owner, completion.currentRevision, completion.binding.branch),
    ]);
    if (!installed.sha || installed.sha !== executed.sha) throw Error('Command workflow changed; revalidation is required');
    if (!sha(receipt.candidateTree) || commit.tree?.sha !== receipt.candidateTree || publication.tree !== receipt.candidateTree) throw Error('Candidate code or plan tree changed');
    if (digest(implementation) !== binding.policy) throw Error('Applicable implementation policy changed');
    if (artifact.planningReference) {
      checkProposal(await api(`pulls/${artifact.planningReference.number}`), repository, artifact.planningReference);
      if (digest(await reviewThread(api, artifact.planningReference.number, owner)) !== artifact.planningReference.threadDigest) throw Error('Approved planning reference changed');
    }
    if (!Array.isArray(receipt.checks) || receipt.checks.length !== implementation.policy.checks.length || !Number.isFinite(Date.parse(receipt.observedAt)) || Date.parse(receipt.observedAt) > now) throw Error('Command receipt is incomplete or has an invalid observation time');
    const evidenceId = `implementation:${native.id}:${attempt}:${digest(artifact)}`;
    const checks = receipt.checks.map((check, index) => {
      if (digest(check.command) !== digest(implementation.policy.checks[index]) || !Number.isInteger(check.exitCode)) throw Error('Command argv changed or result is absent');
      const output = check.output;
      if (output && (typeof output.content !== 'string' || output.content.length > 4096 || hash(output.content) !== output.sha256 || !hex(output.logSha256) || typeof output.logTruncated !== 'boolean' || typeof output.truncated !== 'boolean' || output.logTruncated && !output.truncated || !output.truncated && output.logSha256 !== output.sha256)) throw Error('Retained command output is invalid or tampered');
      if (output?.jsonSummary !== undefined && (output.logTruncated || typeof output.jsonSummary !== 'object' || !output.jsonSummary || Array.isArray(output.jsonSummary) || Buffer.byteLength(JSON.stringify(output.jsonSummary)) > 4096 || digest(output.jsonSummary) !== output.summarySha256)) throw Error('Retained command summary is invalid or tampered');
      const status = !output || check.reason || !check.execution ? 'unavailable' : check.exitCode === 0 && check.execution.status === 'passed' && receipt.serviceCleanup !== false ? 'passed' : 'failed';
      return { evidenceId: `${evidenceId}:${index + 1}`, name: check.command.join(' '), command: check.command, revision: head, status, state: status, exitCode: check.exitCode, output: output ?? null, url: `https://github.com/${repository}/actions/runs/${native.id}/attempts/${attempt}` };
    });
    return { status: checks.some(c => c.status === 'unavailable') ? 'unavailable' : checks.some(c => c.status === 'failed') ? 'failed' : 'passed', evidenceId, binding, publication, artifact: { name: `lighthouse-command-evidence-${issue}-${attempt}`, member: 'implementation-evidence.json', sha256: digest(artifact) }, observedAt: receipt.observedAt, verifiedAt: new Date(now).toISOString(), producer: { repository, workflow: path, revision: native.head_sha, runId: String(native.id), attempt: Number(attempt) }, checks };
  } catch (error) { return unavailable(error.message); }
}
