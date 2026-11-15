import { observeRecovery } from './worker-recovery.mjs';
import { issueComments, readDispatchReceipt, stagePath, workerFor } from './stage-dispatch.mjs';
import { readActionsJson } from './actions-artifact.mjs';

const start = '<!-- lighthouse-housekeeping:start -->';
const end = '<!-- lighthouse-housekeeping:end -->';
const marker = /<!-- lighthouse-housekeeping:(\{[^\n]*\}) -->/g;
const positive = value => Number.isSafeInteger(value) && value > 0;
const timestamp = value => typeof value === 'string' && Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value;
const incompleteCodes = new Set(['evidence-unavailable', 'dispatch-origin-unavailable', 'dispatch-unconfirmed', 'execution-rerun', 'publication-uncertain']);
const uncertainItem = (workers, dependencies) => workers.some(item => item.state === 'uncertain' || incompleteCodes.has(item.code)) || dependencies.some(item => item.state === 'unknown');

// An owner can retire historical monitoring without rewriting receipts or granting recovery.
export function housekeepingReconciler(api, repository, owner, indexNumber) {
  let decisions;
  const read = async () => {
    if (!positive(Number(indexNumber))) return [];
    const index = await api(`issues/${indexNumber}`);
    if (index.number !== Number(indexNumber) || index.pull_request || index.state !== 'open' || index.user?.login !== owner) throw Error('Invalid reconciliation index');
    const result = [];
    for (const comment of await issueComments(api, Number(indexNumber))) {
      if (comment.user?.login !== owner || comment.user.type !== 'User' || comment.created_at !== comment.updated_at || !Number.isFinite(Date.parse(comment.created_at)) || comment.issue_url !== `https://api.github.com/repos/${repository}/issues/${indexNumber}`) continue;
      for (const match of (comment.body ?? '').matchAll(/<!-- lighthouse-housekeeping-reconciliation:(\{[^\n]*\}) -->/g)) {
        const value = JSON.parse(match[1]);
        const localEvidence = url => typeof url === 'string' && url.startsWith(`https://github.com/${repository}/`) && /^(?:issues\/[1-9][0-9]*(?:#issuecomment-[1-9][0-9]*)?|pull\/[1-9][0-9]*|actions\/runs\/[1-9][0-9]*(?:\/attempts\/[1-9][0-9]*)?)$/.test(url.slice(`https://github.com/${repository}/`.length));
        if (value.schemaVersion !== 1 || value.repository !== repository || value.disposition !== 'retire' || ![value.issue, value.requestCommentId, value.workerRunId, value.runAttempt].every(positive) || !/^[a-f0-9]{64}$/.test(value.requestId ?? '') || !/^[a-f0-9]{64}$/.test(value.requestDigest ?? '') || typeof value.reason !== 'string' || !value.reason.trim() || value.reason.length > 2000 || !Array.isArray(value.evidence) || !value.evidence.length || value.evidence.length > 20 || !value.evidence.every(localEvidence)) throw Error('Invalid owner reconciliation');
        if (value.requestRepository !== undefined && (!new RegExp(`^${owner}/[A-Za-z0-9_.-]+$`).test(value.requestRepository) || value.requestRepository === repository || !positive(value.repositoryId))) throw Error('Invalid historical repository identity');
        result.push({ value, comment });
      }
    }
    return result;
  };
  return async item => {
    if (!item.workers?.some(worker => worker.state === 'uncertain' || incompleteCodes.has(worker.code))) return item;
    decisions ??= read();
    const retained = await decisions, workers = [];
    for (const worker of item.workers) {
      const decision = retained.filter(({ value }) => value.issue === item.issue && String(value.workerRunId) === String(worker.runId ?? worker.observedRunId)).at(-1);
      if (!decision || !(worker.state === 'uncertain' || incompleteCodes.has(worker.code))) { workers.push(worker); continue; }
      const { value, comment } = decision;
      const receiptComment = await api(`issues/comments/${value.requestCommentId}`);
      let receipt;
      if (value.requestRepository !== undefined) {
        const current = await api('');
        if (worker.code !== 'receipt-invalid' || worker.requestCommentId !== value.requestCommentId || receiptComment.issue_url !== `https://api.github.com/repos/${repository}/issues/${item.issue}` || current.full_name !== repository || current.id !== value.repositoryId) throw Error('Historical receipt repository is not confirmed');
        // Validate the original identifier under the explicitly recorded old namespace.
        // The fetched comment and native execution must still belong to the current numeric repository.
        receipt = readDispatchReceipt({ ...receiptComment, issue_url: `https://api.github.com/repos/${value.requestRepository}/issues/${item.issue}` }, value.requestRepository, item.issue);
      } else receipt = readDispatchReceipt(receiptComment, repository, item.issue);
      const run = await api(`actions/runs/${value.workerRunId}`);
      if (value.requestRepository !== undefined && run.repository?.id !== value.repositoryId) throw Error('Historical execution belongs to a different repository');
      if (receipt.id !== value.requestId || receipt.digest !== value.requestDigest || String(receipt.workerRunId) !== String(value.workerRunId) || (receipt.recovery?.rootId ?? receipt.id) !== worker.rootId || Number(comment.id) <= Number(receiptComment.id) || run.id !== value.workerRunId || run.run_attempt !== value.runAttempt || run.repository?.full_name !== repository || run.path !== stagePath(workerFor(receipt)) || run.status !== 'completed' || !Number.isFinite(Date.parse(run.updated_at)) || Date.parse(run.updated_at) > Date.parse(comment.created_at)) throw Error('Owner reconciliation no longer matches the terminal execution');
      const url = `https://github.com/${repository}/issues/${indexNumber}#issuecomment-${comment.id}`;
      workers.push({ ...worker, state: 'reconciled', code: 'owner-retired', original: worker, reconciliation: { ...value, commentId: comment.id, url }, nextAction: `Historical monitoring retired by the owner: ${url}. Preserve the original outcome and existing candidates; no retry or lifecycle transition is authorized.` });
    }
    const replaced = item.workers.filter((worker, i) => workers[i] !== worker).map(worker => worker.nextAction);
    return { ...item, workers, status: uncertainItem(workers, item.dependencies) ? 'incomplete' : 'inspected', nextActions: [...new Set([...item.nextActions.filter(action => !replaced.includes(action)), ...workers.filter(worker => worker.code === 'owner-retired').map(worker => worker.nextAction)])] };
  };
}

function boundedRows(rows) {
  if (!Array.isArray(rows) || rows.length >= 100 || rows.some(row => !positive(row?.number) || !['open', 'closed'].includes(row.state))) throw Error('Incomplete relationship inventory');
  return rows;
}

export async function inspectHousekeepingItem(api, repository, owner, number, now = Date.now()) {
  const issue = await api(`issues/${number}`);
  if (issue.number !== number || issue.pull_request || issue.user?.login !== owner || !['open', 'closed'].includes(issue.state)) throw Error('Issue identity or authority unavailable');
  const workers = await observeRecovery(api, repository, owner, number, now);
  const dependencies = boundedRows(await api(`issues/${number}/dependencies/blocked_by?per_page=100`)).map(item => ({ number: item.number, url: item.html_url, state: item.state === 'closed' && item.state_reason === 'completed' ? 'resolved' : item.state === 'open' ? 'blocked' : 'unknown' }));
  const children = boundedRows(await api(`issues/${number}/sub_issues?per_page=100`)).map(item => ({ number: item.number, url: item.html_url, state: item.state }));
  const comments = await issueComments(api, number), published = [];
  for (const comment of comments) {
    if (comment.user?.login !== 'github-actions[bot]' || comment.user.type !== 'Bot') continue;
    for (const match of (comment.body ?? '').matchAll(/<!-- lighthouse-pr-state:(\{[^\n]*\}) -->/g)) {
      const proof = JSON.parse(match[1]);
      if (!positive(proof.pr) || published.some(item => item.number === proof.pr)) continue;
      const pr = await api(`pulls/${proof.pr}`);
      if (pr.number !== proof.pr || pr.head?.repo?.full_name !== repository || pr.base?.repo?.full_name !== repository || !['open', 'closed'].includes(pr.state)) throw Error('Published PR evidence unavailable');
      published.push({ number: pr.number, url: pr.html_url, state: pr.merged === true ? 'merged' : pr.state, authority: 'requires-retained-publication', nextAction: 'Reconcile the original publication through existing maintenance before considering another implementation; merge is not lifecycle acceptance.' });
    }
  }
  const uncertain = uncertainItem(workers, dependencies);
  const nextActions = workers.filter(item => !['worker-completed', 'ci-observed'].includes(item.code)).map(item => item.nextAction);
  if (dependencies.length && dependencies.every(item => item.state === 'resolved')) nextActions.push('Owner: blockers appear resolved; continuation still requires current authority, pause/reservation checks and bounded admission.');
  if (children.length && children.every(item => item.state === 'closed')) nextActions.push('Owner: evaluate aggregate lifecycle acceptance; closed children alone do not complete this parent.');
  if (published.length) nextActions.push('Owner: reconcile existing publication and lifecycle evidence before requesting another implementation.');
  if (issue.labels?.some(label => ['future', 'human-working', 'agent-working'].includes(label.name))) nextActions.push('Preserve the current pause or reservation; age alone never permits release.');
  return { issue: number, url: `https://github.com/${repository}/issues/${number}`, status: uncertain ? 'incomplete' : 'inspected', workers, dependencies, children, published, nextActions: [...new Set(nextActions)] };
}

// Discovery and item failures stay distinct. A genuinely empty inventory can complete.
export async function scanHousekeeping({ api, repository, owner, run, discover, scope = 'repository', dryRun = true, now = () => Date.now(), inspect = inspectHousekeepingItem, reconcile = async item => item }) {
  if (!/^[\w.-]+\/[\w.-]+$/.test(repository) || !positive(run.id) || !positive(run.attempt)) throw Error('Invalid housekeeping identity');
  const startedAt = new Date(now()).toISOString(), items = [], failures = [];
  let issues = [];
  try {
    issues = await discover();
    if (!Array.isArray(issues) || issues.length > 100 || issues.some(number => !positive(number)) || new Set(issues).size !== issues.length) throw Error('Invalid or incomplete issue inventory');
  } catch { failures.push({ code: 'discovery-unavailable', nextAction: 'Maintainer: restore complete repository inventory before claiming daily coverage.' }); }
  for (const number of issues.toSorted((a, b) => a - b)) {
    let item;
    try { item = await inspect(api, repository, owner, number, now()); items.push(await reconcile(item)); }
    catch { items.push({ ...(item ?? { issue: number, url: `https://github.com/${repository}/issues/${number}` }), status: 'incomplete', nextActions: [...(item?.nextActions ?? []), 'Maintainer: inspect unavailable issue, relationship, execution or owner reconciliation evidence; preserve reservations and uncertain effects.'] }); }
  }
  const complete = failures.length === 0 && items.every(item => item.status === 'inspected');
  return { schemaVersion: 1, repository, run, mode: dryRun ? 'dry-run' : 'inspection', scope, startedAt, observedAt: new Date(now()).toISOString(), completedAt: complete ? new Date(now()).toISOString() : null, complete, issues, items, failures, effects: 'none; existing maintenance owns recovery and lifecycle transitions' };
}

export function readHousekeepingSummary(body = '') {
  if (!body.includes(start) && !body.includes(end)) return null;
  if (body.split(start).length !== 2 || body.split(end).length !== 2 || body.indexOf(start) > body.indexOf(end)) throw Error('Ambiguous housekeeping summary');
  const matches = [...body.slice(body.indexOf(start), body.indexOf(end)).matchAll(marker)];
  if (matches.length !== 1) throw Error('Invalid housekeeping summary');
  const value = JSON.parse(matches[0][1]);
  if (value.schemaVersion !== 1 || !timestamp(value.observedAt) || !positive(value.run?.id) || !positive(value.run?.attempt) || value.lastComplete && (!timestamp(value.lastComplete.completedAt) || value.lastComplete.scope !== 'repository')) throw Error('Invalid housekeeping summary evidence');
  return value;
}

export function housekeepingFreshness({ installed = true, enabled = true, summary = null, now = Date.now() } = {}) {
  const reason = !installed ? 'missing' : !enabled ? 'disabled' : !summary?.lastComplete ? 'complete-scan-missing' : !timestamp(summary.lastComplete.completedAt) || summary.lastComplete.scope !== 'repository' || Date.parse(summary.lastComplete.completedAt) > now ? 'invalid-completion' : now - Date.parse(summary.lastComplete.completedAt) >= 24 * 60 * 60 * 1000 ? 'overdue' : summary.complete === false ? 'partial' : 'healthy';
  return { status: reason === 'healthy' ? 'passed' : 'unhealthy', reason, lastComplete: summary?.lastComplete ?? null, nextAction: reason === 'healthy' ? 'None.' : 'Maintainer: review installation, explicit activation and the latest daily inspection; restore complete native coverage.' };
}

// Index text is a pointer, not proof. Reuse native Actions artifact authentication
// before allowing daily coverage to contribute to operational freshness.
export async function observeDailyCoverage(api, repository, owner, summary, { now = Date.now(), readArtifact = readActionsJson } = {}) {
  if (!summary?.lastComplete) return { status: 'unhealthy', reason: 'complete-scan-missing', nextAction: 'Maintainer: complete an explicitly activated repository-wide daily inspection.' };
  const unavailable = { status: 'unhealthy', reason: 'daily-evidence-unconfirmed', nextAction: 'Maintainer: reconcile the native run, attempt and complete-scan artifact; preserve the previous complete-scan pointer.' };
  try {
    const proof = summary.lastComplete, binding = proof.run;
    if (!positive(binding?.id) || !positive(binding?.attempt)) return unavailable;
    const run = await api(`actions/runs/${binding.id}/attempts/${binding.attempt}`);
    if (run.id !== binding.id || run.run_attempt !== binding.attempt || run.path !== '.github/workflows/lighthouse-worker-maintenance.yml' || run.repository?.full_name !== repository || !['schedule', 'workflow_dispatch'].includes(run.event) || run.actor?.login !== owner || run.triggering_actor?.login !== owner || run.status !== 'completed') return unavailable;
    const scan = await readArtifact(api, repository, run.id, `lighthouse-daily-housekeeping-${run.run_attempt}`, 'daily-housekeeping.json');
    if (scan?.schemaVersion !== 1 || scan.repository !== repository || scan.run?.id !== run.id || scan.run.attempt !== run.run_attempt || scan.run.revision !== run.head_sha || scan.mode !== 'inspection' || scan.scope !== 'repository' || scan.complete !== true || scan.completedAt !== proof.completedAt || !timestamp(scan.startedAt) || !timestamp(scan.observedAt) || !timestamp(scan.completedAt) || Date.parse(scan.startedAt) > Date.parse(scan.completedAt) || Date.parse(scan.completedAt) > now || !Array.isArray(scan.failures) || scan.failures.length || !Array.isArray(scan.issues) || !Array.isArray(scan.items) || scan.issues.length !== scan.items.length || new Set(scan.issues).size !== scan.issues.length || scan.items.some(item => item.status !== 'inspected' || !scan.issues.includes(item.issue))) return unavailable;
    return housekeepingFreshness({ summary, now });
  } catch { return unavailable; }
}

// The caller uses the existing repository report concurrency group. No comment or
// issue creation is needed: an uncertain PATCH is reconciled by reading this block.
export async function publishHousekeepingSummary(api, repository, owner, indexNumber, scan) {
  if (!positive(Number(indexNumber)) || scan.repository !== repository || scan.mode !== 'inspection' || !timestamp(scan.observedAt) || !positive(scan.run?.id) || !positive(scan.run?.attempt) || scan.complete && (!timestamp(scan.completedAt) || scan.completedAt < scan.startedAt)) throw Error('Invalid housekeeping publication');
  const issue = await api(`issues/${indexNumber}`);
  if (issue.pull_request || issue.user?.login !== owner || issue.state !== 'open') throw Error('Housekeeping index must be an open owner-authored issue');
  const previous = readHousekeepingSummary(issue.body);
  if (previous && (previous.observedAt >= scan.observedAt || previous.run.id > scan.run.id || previous.run.id === scan.run.id && previous.run.attempt >= scan.run.attempt)) return { state: 'retained', summary: previous };
  const lastComplete = scan.complete && scan.scope === 'repository' ? { completedAt: scan.completedAt, scope: scan.scope, run: scan.run, url: `https://github.com/${repository}/actions/runs/${scan.run.id}/attempts/${scan.run.attempt}` } : previous?.lastComplete ?? null;
  const summary = { schemaVersion: 1, observedAt: scan.observedAt, run: scan.run, complete: scan.complete, scope: scan.scope, lastComplete };
  const rows = scan.items.filter(item => item.nextActions.length).map(item => `- [#${item.issue}](${item.url}): ${item.status}. ${item.nextActions.join(' ')}`);
  const block = `${start}\n## Daily repository housekeeping\n\nLatest inspection: ${scan.complete ? 'complete' : 'incomplete'} (${scan.scope}); ${scan.items.length}/${scan.issues.length} items observed. [Evidence](https://github.com/${repository}/actions/runs/${scan.run.id}/attempts/${scan.run.attempt}).\n\nLast complete repository sweep: ${lastComplete ? `[${lastComplete.completedAt}](${lastComplete.url})` : 'not established'}. Inspection is separate from verified effects.\n\n${rows.join('\n') || 'No item-level action recorded.'}\n${scan.failures.map(item => item.nextAction).join('\n')}\n\n<!-- lighthouse-housekeeping:${JSON.stringify(summary)} -->\n${end}`;
  const body = (issue.body ?? '').includes(start) ? issue.body.slice(0, issue.body.indexOf(start)) + block + issue.body.slice(issue.body.indexOf(end) + end.length) : `${issue.body ?? ''}\n\n${block}`;
  if (Buffer.byteLength(body) > 60000) throw Error('Housekeeping summary exceeds index bounds');
  const current = await api(`issues/${indexNumber}`);
  if (current.body !== issue.body || current.state !== 'open' || current.user?.login !== owner) throw Error('Housekeeping index changed; no overwrite');
  await api(`issues/${indexNumber}`, 'PATCH', { body });
  return { state: 'published', summary };
}
