import capabilityCatalog from '../capabilities.json' with { type: 'json' };
import { legacyControlComment } from './issue-comment-intent.mjs';
import { taskDigest } from './digests.mjs';
import { validateStageEnvelope } from './host-contract.mjs';

export function pendingReply(event, comments) {
  if (!legacyControlComment(event.comment)) return null;
  const report = [...comments].reverse().find(c => c.user?.login === 'github-actions[bot]' && c.user.type === 'Bot' && /<!-- lighthouse-actions:[a-f0-9]{64} -->/.test(c.body));
  if (!report || (!report.body.includes('<!-- lighthouse-question -->') && /<!-- lighthouse-handoff:v1 -->|<!-- lighthouse-proposal-review:|\[Review the implementation/.test(report.body)) || !/^Outcome: blocked$/m.test(report.body) || !event.comment?.body?.trim() || event.comment.created_at <= report.created_at) return null;
  const productChangeName = report.body.match(/<!-- lighthouse-product-workflow:([a-z0-9]+(?:-[a-z0-9]+)*) -->/)?.[1];
  const declared = report.body.match(/<!-- lighthouse-stage:([a-z]+):blocked -->/);
  if (productChangeName) {
    const stage = declared?.[1] ?? 'propose';
    if (!['triage', 'refine', 'propose', 'implement'].includes(stage)) return null;
    return { stage, worker: 'product-change', productFeedback: { action: 'answer', changeName: productChangeName, text: event.comment.body, sourceCommentId: event.comment.id }, report };
  }
  const stage = declared?.[1] ?? (/^## Proposal: blocked candidate$/m.test(report.body) ? 'propose' : /^## Refinement:/m.test(report.body) ? 'refine' : null);
  return ['triage', 'refine', 'propose', 'implement'].includes(stage) ? { stage, report } : null;
}

export const issueCommandLabels = capabilityCatalog.capabilities.find(c => c.id === 'labels').configuration.labels.filter(l => l.role === 'command').map(l => l.name);

export function routeIssue(event, actor, owner, eventName, comments = []) {
  if (eventName === 'issue_comment' && !legacyControlComment(event.comment)) return { run: false, reason: 'Typed client comments require explicit source intent admission' };
  if (actor !== owner || event.issue?.pull_request || (event.issue && event.issue.state !== 'open')) return { run: false, reason: 'Unauthorized actor or closed/non-issue target' };
  const labels = event.issue?.labels?.map(x => x.name) ?? [];
  if (labels.includes('future') && (event.label?.name === 'implement' || event.inputs?.stage === 'implement')) return { run: false, reason: 'Implementation paused by future label' };
  if (labels.some(x => ['human-working', 'agent-working'].includes(x))) return { run: false, reason: 'Issue reserved' };
  if (eventName === 'issues' && event.action === 'unlabeled' && event.label?.name === 'future' && labels.includes('implement')) return { run: true, stage: 'implement', issue: event.issue.number, reason: 'Owner resumed implementation' };
  if (eventName === 'issues' && event.action === 'labeled' && issueCommandLabels.includes(event.label?.name)) return { run: true, stage: event.label.name, issue: event.issue.number, reason: `Owner requested ${event.label.name}` };
  if (eventName === 'issue_comment' && event.action === 'created' && event.comment?.user?.login === owner && event.comment.user.type !== 'Bot' && labels.some(x => ['needs-info', 'waiting-review'].includes(x))) {
    const pending = pendingReply(event, comments);
    if (pending) return { run: true, ...pending, issue: event.issue.number, reason: `Owner answered pending ${pending.stage}` };
  }
  if (eventName === 'workflow_dispatch' && ['integrate', 'review'].includes(event.inputs?.stage) && (!/^[1-9][0-9]*$/.test(event.inputs?.pull_request ?? '') || !/^[a-f0-9]{40}$/.test(event.inputs?.head ?? ''))) return { run: false, reason: 'Completion needs a PR and accepted full head SHA' };
  if (eventName === 'workflow_dispatch' && event.inputs?.workflow === 'product-change' && /^[1-9][0-9]*$/.test(event.inputs?.issue ?? '')) return { run: true, stage: ['propose', 'implement'].includes(event.inputs?.stage) ? event.inputs.stage : 'propose', worker: 'product-change', issue: Number(event.inputs.issue), reason: 'Owner requested Product Change preparation from an idea' };
  if (eventName === 'workflow_dispatch' && ['triage', 'refine', 'propose', 'implement', 'integrate', 'review'].includes(event.inputs?.stage ?? 'refine') && /^[1-9][0-9]*$/.test(event.inputs?.issue ?? '')) return { run: true, stage: event.inputs.stage ?? 'refine', issue: Number(event.inputs.issue), reason: 'Owner requested manual stage' };
  return { run: false, reason: 'No eligible stage event' };
}
export function checkHandoff(request, envelope, issue, answers, revision, runId) {
  if (request.stage !== 'refine' || request.issue !== issue.number || String(request.workflowRunId) !== String(runId) || request.sourceRevision !== revision || request.taskDigest !== taskDigest(issue, answers) || envelope.result?.status !== 'passed' || validateStageEnvelope(envelope, request).length) throw Error('Refinement handoff is not current successful evidence');
  if (issue.labels.some(x => ['future', 'needs-info', 'waiting-review', 'human-working', 'agent-working'].includes(x.name))) throw Error('Issue is paused or reserved');
}
export function checkReplyInputs(request, issue, answers, report, revision) {
  const priorAnswers = answers.filter(c => c.created_at < report.created_at);
  if (request.sourceRevision !== revision || request.taskDigest !== taskDigest(issue, priorAnswers)) throw Error('Pending stage inputs changed; refresh refinement before continuing');
}
