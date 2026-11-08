import { isDeepStrictEqual } from 'node:util';
import { digest } from './digests.mjs';
import { canonicalIssueIntent } from './issue-control-intent.mjs';
import { controlIndexArtifact, loadControlResult } from './issue-control-ledger.mjs';
import { loadDispatch, readDispatchReceipt, issueComments } from './stage-dispatch.mjs';
import { loadClientDispatch } from './issue-control-native.mjs';
import { loadStageReport } from './proposal.mjs';
import { validateStageEnvelope } from './host-contract.mjs';

export async function resolveControlAlias({ api, repository, actor, metadata, record, readArtifact }) {
  if (record.result.status !== 'alias') return record;
  const name = controlIndexArtifact('key', record.result.aliasKey);
  const listing = await api(`actions/artifacts?name=${name}&per_page=100`);
  if (!Array.isArray(listing?.artifacts) || listing.total_count !== 1 || listing.artifacts.length !== 1) throw Error('Alias source is missing or ambiguous');
  const artifact = listing.artifacts[0];
  if (artifact.expired !== false || artifact.name !== name || !Number.isSafeInteger(artifact.workflow_run?.id) || artifact.workflow_run.id < 1) throw Error('Alias index unavailable');
  const indexedRequest = await readArtifact(api, repository, String(artifact.workflow_run.id), name, 'request.json');
  const original = await loadControlResult({ api, repository, number: record.request.intent.issue.number, issueId: record.request.intent.issue.id,
    actor, metadata, indexedRequest, readArtifact });
  if (original.result.key !== record.result.aliasKey || original.result.payloadDigest !== record.result.payloadDigest || original.result.status === 'alias')
    throw Error('Alias original binding changed');
  return original;
}

export async function observeControlExecution({ api, repository, actor, record, readArtifact }) {
  if (record.result.status !== 'admitted') return { availability: 'none', questionConsumed: false, questionResolved: false };
  const number = record.request.intent.issue.number, commentId = record.result.dispatchCommentId;
  const comment = await api(`issues/comments/${commentId}`), receipt = readDispatchReceipt(comment, repository, number);
  if (receipt.clientKey !== record.result.key || receipt.clientPayloadDigest !== record.result.payloadDigest) throw Error('Native client receipt changed');
  if (!receipt.workerRunId) return { availability: 'available', status: 'requested', dispatchCommentId: commentId,
    workerRunId: null, questionConsumed: false, questionResolved: false };
  const run = await api(`actions/runs/${receipt.workerRunId}`);
  const dispatch = await loadDispatch(api, repository, actor.login, number, commentId, run, readArtifact);
  const original = await loadClientDispatch({ api, repository, owner: actor.login, native: dispatch.request, readArtifact });
  if (!isDeepStrictEqual(original, record.request)) throw Error('Native request is not the recorded client intent');
  const observation = { availability: 'available', status: receipt.status, dispatchCommentId: commentId, workerRunId: Number(run.id),
    workerAttempt: run.run_attempt, source: `https://github.com/${repository}/actions/runs/${run.id}/attempts/${run.run_attempt}`,
    questionConsumed: false, questionResolved: false };
  if (run.status !== 'completed' || run.conclusion !== 'success') return observation;
  const reports = (await issueComments(api, number)).filter(item => item.user?.login === 'github-actions[bot]' && item.user.type === 'Bot'
    && item.body?.includes(`[Workflow run](https://github.com/${repository}/actions/runs/${run.id})`)
    && /<!-- lighthouse-actions:[a-f0-9]{64} -->/.test(item.body));
  if (reports.length !== 1) return { ...observation, availability: 'unavailable', reason: 'stage-result-not-observed' };
  const stage = await loadStageReport(api, repository, reports[0], { owner: actor.login, issue: number }, readArtifact);
  if (!isDeepStrictEqual(stage.request.client, dispatch.request.client) || stage.request.client.requestDigest !== digest(canonicalIssueIntent(record.request))
      || validateStageEnvelope(stage.envelope, stage.request).length) throw Error('Published client stage identity mismatch');
  observation.result = stage.envelope.result.status;
  observation.resultSource = reports[0].html_url;
  if (record.request.intent.action === 'continue') {
    const expected = record.request.intent.question;
    if (stage.request.replyTo !== expected.requestId || stage.request.commentId !== record.request.commentId) throw Error('Continuation consumption is not authenticated');
    observation.questionConsumed = true;
    observation.questionResolved = stage.envelope.result.status === 'passed';
  }
  return observation;
}
