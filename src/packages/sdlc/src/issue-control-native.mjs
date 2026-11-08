import { isDeepStrictEqual } from 'node:util';
import { digest } from './digests.mjs';
import { canonicalIssueIntent, issueIntentKey, issueIntentDigest } from './issue-control-intent.mjs';
import { createControlRequest, controlRequestArtifact } from './issue-control-ledger.mjs';
import { controlEventIntent, validateControlRouter, IssueControlRefusal } from './issue-control-admission.mjs';
import { pendingStage, pendingReplyState } from './issue-entry.mjs';
import { pendingQuestion } from './handoff.mjs';

export async function loadClientDispatch({ api, repository, owner, native, readArtifact }) {
  if (!native.client) return null;
  const client = native.client;
  if (Object.keys(client).length !== 6 || !['version', 'key', 'payloadDigest', 'requestDigest', 'action', 'scope'].every(key => Object.hasOwn(client, key)) || client.version !== 1)
    throw new IssueControlRefusal('client-dispatch-metadata-invalid');
  const metadata = await api(''), actor = metadata.owner;
  if (actor?.type !== 'User' || actor.login !== owner) throw new IssueControlRefusal('client-dispatch-owner-changed');
  const run = await api(`actions/runs/${native.routerRunId}/attempts/${native.routerAttempt}`);
  validateControlRouter({ run, metadata, actor, repository, eventName: native.eventName, runId: Number(native.routerRunId), attempt: native.routerAttempt });
  const request = await readArtifact(api, repository, String(run.id), controlRequestArtifact(run.id, run.run_attempt), 'request.json');
  const reconstructed = createControlRequest(request.intent, request.sourceRevision, request.routerRunId, request.routerAttempt, { commentId: request.commentId });
  if (!isDeepStrictEqual(request, reconstructed)) throw new IssueControlRefusal('client-source-request-invalid');
  const intent = controlEventIntent({ event: native.event, eventName: native.eventName, repository, metadata, actor });
  if (!isDeepStrictEqual(intent, request.intent) || client.key !== issueIntentKey(intent) || client.payloadDigest !== issueIntentDigest(intent)
      || client.requestDigest !== digest(canonicalIssueIntent(request)) || client.action !== intent.action || client.scope !== intent.scope
      || request.routerRunId !== run.id || request.routerAttempt !== run.run_attempt || request.sourceRevision !== run.head_sha
      || native.sourceRevision !== request.sourceRevision || native.workflowRevision !== request.sourceRevision
      || native.issue !== intent.issue.number || native.worker || native.handoff || native.queue
      || intent.action !== 'continue' && (native.stage !== intent.action || native.autoImplement !== false || native.productChangeEnabled !== false)
      || intent.action === 'continue' && request.commentId !== native.event.comment.id) throw new IssueControlRefusal('client-native-grant-mismatch');
  return request;
}

export function clientDispatchRoute(request, native, issue, comments) {
  const intent = request.intent;
  if (issue.id !== intent.issue.id || issue.number !== intent.issue.number || issue.pull_request || issue.state !== 'open')
    throw new IssueControlRefusal('client-issue-changed');
  if (intent.action !== 'continue') return { run: true, stage: native.stage, issue: issue.number, reason: 'Authenticated stage-only source request' };
  const pending = pendingStage(comments);
  if (!pendingReplyState(issue) || !pending || pending.worker || pending.report.id !== intent.question.commentId || pending.stage !== native.stage)
    throw new IssueControlRefusal('client-question-no-longer-current');
  return { run: true, ...pending, issue: issue.number, reason: 'Authenticated answer under its original grant' };
}

export function checkClientContinuation(request, native, evidence, report) {
  const expected = request.intent.question, original = evidence.request;
  const text = pendingQuestion(evidence.envelope.result.output?.handoff?.question);
  if (!text || report.id !== expected.commentId || original.runId !== expected.requestId || digest(text ?? '') !== expected.questionDigest
      || digest(canonicalIssueIntent(original)) !== expected.grantDigest || original.modelSelection || original.handoff || original.productResume || original.productAlignment || original.productParent
      || native.autoImplement && original.autoImplement !== true || native.productChangeEnabled && original.productChangeEnabled !== true)
    throw new IssueControlRefusal('client-original-grant-changed');
}

export function checkClientSnapshot(control, native, snapshot) {
  if (!native.client) {
    if (snapshot.client) throw new IssueControlRefusal('unexpected-client-snapshot');
    return;
  }
  if (!isDeepStrictEqual(snapshot.client, native.client) || snapshot.repository !== native.repository || snapshot.issue !== native.issue
      || snapshot.stage !== native.stage || snapshot.sourceRevision !== native.sourceRevision || snapshot.workflowRevision !== native.workflowRevision
      || snapshot.autoImplement !== native.autoImplement || snapshot.productChangeEnabled !== native.productChangeEnabled
      || control.intent.action === 'continue' && (snapshot.replyTo !== control.intent.question.requestId || snapshot.commentId !== control.commentId))
    throw new IssueControlRefusal('client-snapshot-grant-mismatch');
}
