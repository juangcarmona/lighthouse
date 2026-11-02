import { isDeepStrictEqual } from 'node:util';
import { issueComments, readDispatchReceipt } from './stage-dispatch.mjs';
import { authenticateEpicChild } from './epic-native.mjs';
import { loadStageReport } from './proposal.mjs';
import { validateStageEnvelope } from './host-contract.mjs';
import { taskDigest } from './issue-actions.mjs';

// This observation proves current child and triage state; it does not grant execution authority.
export async function observeEpicRefinement({ api, repository, owner, child, allowWorking = false, authenticate = authenticateEpicChild, loadReport = loadStageReport, readArtifact }) {
  const epic = await authenticate({ api, repository, owner, child, ...(readArtifact ? { readArtifact } : {}) });
  const issue = await api(`issues/${child}`), comments = await issueComments(api, child);
  if (issue.state !== 'open' || issue.pull_request || issue.labels?.some(label => ['future', 'human-working', 'needs-info', 'waiting-review', 'execution-failed', ...(!allowWorking ? ['agent-working'] : [])].includes(label.name))) throw Error('Epic child refinement is paused');
  const report = [...comments].reverse().find(comment => comment.user?.login === 'github-actions[bot]' && comment.user.type === 'Bot' && comment.body?.includes('<!-- lighthouse-stage:triage:'));
  if (!report || !Number.isSafeInteger(report.id) || report.id < 1 || !report.body.includes('<!-- lighthouse-stage:triage:passed -->')) throw Error('Epic child needs an authenticated passed triage');
  if (comments.some(comment => comment.id > report.id && comment.user?.login === 'github-actions[bot]' && comment.user.type === 'Bot' && comment.body?.includes('<!-- lighthouse-dispatch:') && readDispatchReceipt(comment, repository, child).stage === 'triage')) throw Error('A newer epic child triage was requested');
  const evidence = await loadReport(api, repository, report, { owner, issue: child });
  const answers = comments.filter(comment => comment.user?.login === owner && !comment.body?.includes('<!-- lighthouse-run:') && !comment.body?.includes('<!-- lighthouse-actions:'));
  const intent = taskDigest(issue, answers), request = evidence.request;
  if (validateStageEnvelope(evidence.envelope, request).length || request.stage !== 'triage' || evidence.envelope.result.status !== 'passed' || request.issue !== child || request.sourceRevision !== epic.sourceRevision || request.originalRequest !== (issue.body ?? '') || request.taskDigest !== intent || !isDeepStrictEqual(request.epic, epic) || !Number.isSafeInteger(evidence.run?.id) || !Number.isSafeInteger(evidence.run.run_attempt)) throw Error('Epic child triage or owner intent changed');
  return { child, epic, taskDigest: intent, triage: { runId: String(evidence.run.id), attempt: evidence.run.run_attempt, reportId: report.id, runIdentity: request.runId } };
}
