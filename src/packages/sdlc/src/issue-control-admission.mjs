import { createIssueIntent, parseIssueIntent, canonicalIssueIntent, issueIntentKey, issueIntentDigest } from './issue-control-intent.mjs';
import { parseIssueComment } from './issue-comment-intent.mjs';
import { digest } from './digests.mjs';
import { dispatchId, dispatchIntent } from './stage-dispatch.mjs';

const positive = value => Number.isSafeInteger(value) && value > 0;
const same = (left, right) => canonicalIssueIntent(left) === canonicalIssueIntent(right);
export class IssueControlRefusal extends Error {
  constructor(reason) { super(reason); this.reason = reason; }
}
const refuse = reason => { throw new IssueControlRefusal(reason); };

export function controlEventIntent({ event, eventName, repository, metadata, actor }) {
  if (!positive(actor?.id) || actor.type !== 'User' || metadata.owner?.id !== actor.id || metadata.owner.type !== 'User'
      || event.sender?.id !== actor.id || event.sender.type !== 'User') refuse('owner-identity-required');
  if (eventName === 'workflow_dispatch') {
    const input = event.inputs ?? {};
    const allowed = ['issue', 'stage', 'workflow', 'client_request', 'merge', 'pull_request', 'head', 'after_run', 'after_attempt', 'epic_parent', 'epic_run', 'model_selection', 'product_decision_comment'];
    if (Object.keys(input).some(key => !allowed.includes(key)) || ['pull_request', 'head', 'after_run', 'after_attempt', 'epic_parent', 'epic_run', 'model_selection', 'product_decision_comment'].some(key => input[key] !== undefined && input[key] !== '')
        || ![undefined, '', false, 'false'].includes(input.merge) || ![undefined, '', 'stage'].includes(input.workflow)) refuse('mixed-client-request');
    let intent;
    try { intent = parseIssueIntent(input.client_request); } catch { refuse('unsupported-client-request'); }
    if (!['refine', 'propose'].includes(intent.action) || input.stage !== intent.action || input.issue !== String(intent.issue.number)) refuse('client-stage-mismatch');
    if (intent.actorId !== actor.id || intent.repository.id !== metadata.id || intent.repository.name !== repository.toLowerCase()) refuse('client-identity-mismatch');
    return intent;
  }
  if (eventName !== 'issue_comment' || event.action !== 'created' || !positive(event.issue?.id) || !positive(event.issue?.number) || event.issue.pull_request
      || !positive(event.comment?.id) || event.comment.user?.id !== actor.id || event.comment.user.type !== 'User') refuse('unsupported-client-event');
  const parsed = parseIssueComment(event.comment);
  if (parsed.kind !== 'typed') refuse('unsupported-client-comment');
  if (parsed.intent === 'comment') return null;
  return createIssueIntent({ id: parsed.id, action: 'continue', body: parsed.body,
    facts: { repository: { id: metadata.id, name: repository }, issue: { id: event.issue.id, number: event.issue.number }, actor, question: parsed.question } });
}

export function validateControlRouter({ run, metadata, actor, repository, eventName, runId, attempt }) {
  if (!positive(runId) || !positive(attempt) || metadata.owner?.id !== actor.id || actor.type !== 'User' || metadata.owner.type !== 'User'
      || metadata.full_name?.toLowerCase() !== repository.toLowerCase() || run.id !== runId || run.run_attempt !== attempt || run.path !== '.github/workflows/lighthouse-sdlc-router.yml'
      || run.event !== eventName || run.repository?.id !== metadata.id || run.repository.full_name?.toLowerCase() !== repository.toLowerCase()
      || run.actor?.id !== actor.id || run.actor.type !== 'User' || run.triggering_actor?.id !== actor.id || run.triggering_actor.type !== 'User') refuse('router-origin-unverified');
}

export function checkControlAdmission(request, facts, currentComment) {
  const intent = request.intent;
  if (facts.availability !== 'available' || facts.repository.id !== intent.repository.id || facts.issue.id !== intent.issue.id || facts.actor.id !== intent.actorId)
    refuse('source-identity-changed');
  if (!facts.actions?.[intent.action]?.eligible) refuse(facts.actions?.[intent.action]?.reason ?? 'source-admission-unavailable');
  let fresh;
  try { fresh = createIssueIntent({ id: intent.id, facts, action: intent.action, body: intent.body }); }
  catch { refuse('source-intent-no-longer-preparable'); }
  if (!same(fresh, intent)) refuse('source-binding-changed');
  if (intent.action === 'continue') {
    const parsed = parseIssueComment(currentComment);
    if (currentComment?.id !== request.commentId || parsed.kind !== 'typed' || parsed.intent !== 'continue' || parsed.actorId !== intent.actorId
        || parsed.id !== intent.id || parsed.body !== intent.body || !same(parsed.question, intent.question)) refuse('source-comment-changed');
    if (facts.question.request?.modelSelection || facts.question.request?.handoff || facts.question.request?.productResume || facts.question.request?.productAlignment || facts.question.request?.productParent)
      refuse('pending-grant-context-unsupported');
  }
}

// Policy comes from canonical facts; this only builds the existing native request.
export function controlStageDispatch({ request, facts, run, event, repository, owner, currentComment = event?.comment }) {
  checkControlAdmission(request, facts, currentComment);
  const intent = request.intent, continuing = intent.action === 'continue';
  const stage = continuing ? facts.question.stage : intent.action;
  if (!facts.capability.stages.includes(stage) || !['triage', 'refine', 'propose', 'implement'].includes(stage)) refuse('stage-contract-unsupported');
  const original = continuing ? facts.question.request : null;
  const native = { schemaVersion: 1, id: dispatchId(repository, String(run.id), stage), repository, issue: intent.issue.number, stage,
    routerRunId: String(run.id), routerAttempt: run.run_attempt, routerRevision: run.head_sha, routerRef: run.head_branch,
    workflowRevision: run.head_sha, sourceRevision: facts.sourceRevision, ref: facts.defaultBranch,
    eventName: continuing ? 'issue_comment' : 'workflow_dispatch', event, handoff: false, queue: false,
    autoImplement: continuing && original.autoImplement === true && facts.policy.autoImplement === true,
    productChangeEnabled: continuing && original.productChangeEnabled === true && facts.policy.productChangeEnabled === true,
    taskDigest: facts.inputDigest, client: { version: 1, key: issueIntentKey(intent), payloadDigest: issueIntentDigest(intent),
      requestDigest: digest(canonicalIssueIntent(request)), action: intent.action, scope: intent.scope } };
  if (run.head_sha !== facts.sourceRevision || run.head_branch !== facts.defaultBranch || run.actor?.login !== owner || run.triggering_actor?.login !== owner)
    refuse('current-source-router-required');
  native.intent = dispatchIntent(native);
  return native;
}
