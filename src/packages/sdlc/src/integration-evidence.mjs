import { verifyDispatchOrigin, stagePath } from './stage-dispatch.mjs';
import { authorizeCompletion } from './completion.mjs';
import { createHash } from 'node:crypto';
import { fingerprint, sha } from './completion.mjs';
import { validateEvidenceRecord, validateEvidenceIndex } from './evidence.mjs';

const digest = bytes => createHash('sha256').update(bytes).digest('hex');

// Read retained integration evidence, not bot prose or the current review's future publication.
export async function readIntegrationEvidence(api, completion, pinned = null) {
  const binding = completion.binding, owner = binding.repository.split('/')[0];
  if (!completion.merged) return null;
  const commit = pinned?.commit ?? (await api(`git/ref/heads/${completion.profile.evidenceBranch}`)).object.sha;
  if (!sha(commit)) throw Error('Invalid retained evidence commit');
  const tree = await api(`git/trees/${commit}?recursive=1`);
  if (tree.truncated || tree.tree.length > 10000) throw Error('Retained evidence tree exceeds bounds');
  const paths = new Map(tree.tree.map(f => [f.path, f]));
  let bytes = 0;
  const read = async path => {
    const entry = paths.get(path);
    if (entry?.type !== 'blob' || entry.mode !== '100644') throw Error('Retained evidence must be a regular file');
    const parts = path.split('/');
    for (let i = 1; i < parts.length; i++) if (paths.get(parts.slice(0, i).join('/'))?.type !== 'tree') throw Error('Invalid retained evidence ancestor');
    const blob = await api(`git/blobs/${entry.sha}`);
    if (blob.encoding !== 'base64' || blob.size > 1024 * 1024) throw Error('Retained evidence blob exceeds bounds');
    const content = Buffer.from(blob.content, 'base64'); bytes += content.length;
    if (content.length !== blob.size || bytes > 4 * 1024 * 1024 || createHash('sha1').update(`blob ${content.length}\0`).update(content).digest('hex') !== entry.sha) throw Error('Retained evidence bytes do not match GitHub identity or bounds');
    return content.toString();
  };
  const pattern = new RegExp(`^docs/process/\\d{8}-${binding.issue}-[a-z0-9-]+/runs/[1-9][0-9]*/attempt-[0-9]+/post-integration/evidence-record\\.json$`);
  const candidates = [...paths.keys()].filter(p => pattern.test(p) && (!pinned || p === pinned.path)).sort().reverse();
  if (candidates.length > 100) throw Error('Too many retained integration candidates');
  for (const path of candidates) {
    const raw = await read(path), record = JSON.parse(raw), payload = record.payload;
    if (payload?.stage !== 'integrate' || record.status !== 'passed') continue;
    if (['repository', 'issue', 'pr', 'head', 'intent', 'policy', 'prIntent', 'files'].some(k => payload.binding?.[k] !== binding[k])) continue;
    if (validateEvidenceRecord(record).length) throw Error('Invalid retained integration record');
    const prefix = path.slice(0, -'evidence-record.json'.length), index = JSON.parse(await read(prefix + 'evidence-index.json'));
    if (validateEvidenceIndex(index).length || index.repository !== binding.repository || index.revision !== completion.merge || !index.records.some(r => r.id === record.id && r.path === 'evidence-record.json' && r.sha256 === digest(raw))) throw Error('Retained integration index does not bind the record');
    const names = ['receipt.json', 'stage-result.json', 'report.md', 'retrospective.md'], files = {};
    if (record.artifacts.length !== names.length) throw Error('Incomplete retained integration artifacts');
    for (const name of names) {
      const artifact = record.artifacts.find(a => a.path === name);
      files[name] = await read(prefix + name);
      if (!artifact || artifact.sha256 !== digest(files[name])) throw Error('Retained integration artifact hash mismatch');
    }
    const receipt = JSON.parse(files['receipt.json']), result = JSON.parse(files['stage-result.json']);
    if (fingerprint(receipt) !== fingerprint(payload.receipt) || receipt.state !== 'merged' || receipt.sha !== completion.merge || receipt.acceptedHead !== binding.head || receipt.authorization?.merge !== true || receipt.authorization.head !== binding.head || receipt.authorization.issue !== binding.issue || receipt.authorization.pr !== binding.pr || result.stage !== 'integrate' || result.status !== 'passed') throw Error('Retained integration receipt does not match the accepted delivery');
    const workflow = payload.workflow;
    if (!/^[1-9][0-9]*$/.test(workflow?.runId ?? '') || !/^[1-9][0-9]*$/.test(workflow?.attempt ?? '')) throw Error('Invalid retained workflow identity');
    if (!path.includes(`/runs/${workflow.runId}/attempt-${String(workflow.attempt).padStart(4, '0')}/`)) throw Error('Retained workflow identity differs from its path');
    const run = await api(`actions/runs/${workflow.runId}`);
    let originEvent, originName;
    if (workflow.dispatchOrigin) {
      const origin = workflow.dispatchOrigin;
      const parent = await api(`actions/runs/${origin.receipt.routerRunId}/attempts/${origin.receipt.routerAttempt}`);
      verifyDispatchOrigin(origin.request, origin.receipt, parent, run, binding.repository, owner, binding.issue);
      if (origin.request.stage !== 'integrate' || origin.request.sourceRevision !== payload.binding.base || String(origin.receipt.workerRunId) !== String(run.id)) throw Error('Retained integration dispatch mismatch');
      originEvent = origin.request.event; originName = origin.request.eventName;
    }
    let manual = run.event === 'workflow_dispatch' && run.actor?.login === owner && run.triggering_actor?.login === owner && run.head_sha === payload.binding.base;
    if (originEvent) {
      manual = false;
      if (originName === 'workflow_dispatch' && !originEvent.inputs?.after_run) {
        const authorization = authorizeCompletion(originEvent, { GITHUB_EVENT_NAME: originName, GITHUB_ACTOR: owner, GITHUB_TRIGGERING_ACTOR: owner, GITHUB_REPOSITORY_OWNER: owner }, 'integrate');
        manual = authorization.merge && authorization.issue === binding.issue && authorization.pr === binding.pr && authorization.head === binding.head;
      }
    }
    let approved = false;
    const approval = receipt.authorization.approval;
    if ((['pull_request_review', 'workflow_run'].includes(originName ?? run.event) || originEvent?.inputs?.after_run) && approval?.owner === owner && approval.head === binding.head && Number.isSafeInteger(approval.id)) {
      const review = await api(`pulls/${binding.pr}/reviews/${approval.id}`);
      approved = review.user?.login === owner && review.state === 'APPROVED' && review.commit_id === binding.head;
    }
    if (run.repository?.full_name !== binding.repository || !(manual || approved) || run.path !== (workflow.dispatchOrigin ? stagePath('integrate') : '.github/workflows/lighthouse-sdlc-router.yml') || String(run.run_attempt) !== String(workflow.attempt) || run.status !== 'completed' || run.conclusion !== 'success') throw Error('Retained integration workflow is not authenticated and successful');
    return { evidenceId: `integration:${workflow.runId}:${workflow.attempt}`, commit, path, recordSha256: digest(raw), url: `https://github.com/${binding.repository}/blob/${commit}/${prefix}report.md`, receipt, workflow: { ...workflow, conclusion: run.conclusion, actor: run.actor.login }, report: files['report.md'] };
  }
  if (pinned) throw Error('Previously supplied integration evidence is unavailable or stale');
  return null;
}
