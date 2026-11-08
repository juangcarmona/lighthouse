import { readFile, writeFile, appendFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createIssueApi } from './github-rest.mjs';
import { readActionsJson } from './actions-artifact.mjs';
import { collectIssueControlFacts } from './issue-control-facts.mjs';
import { readIssueControlCapability, readIssueControlPolicy } from './issue-control-contract.mjs';
import { controlEventIntent, validateControlRouter, controlStageDispatch, IssueControlRefusal } from './issue-control-admission.mjs';
import { createControlRequest, createControlResult, controlRequestArtifact, controlResultArtifact, controlIndexArtifact, controlResultBody, findControlResult } from './issue-control-ledger.mjs';
import { issueIntentKey, issueIntentDigest } from './issue-control-intent.mjs';
import { recordDispatch, dispatchArtifact, sendDispatch } from './stage-dispatch.mjs';

export async function prepareControlInvocation({ api, repository, event, eventName, runId, attempt, readArtifact }) {
  const metadata = await api(''), actor = metadata.owner;
  const intent = controlEventIntent({ event, eventName, repository, metadata, actor });
  if (!intent) return { state: 'ordinary-comment' };
  const run = await api(`actions/runs/${runId}/attempts/${attempt}`);
  validateControlRouter({ run, metadata, actor, repository, eventName, runId, attempt });
  const prior = await findControlResult({ api, repository, intent, actor, metadata, readArtifact });
  if (prior.state === 'recorded') return { state: 'existing', record: prior.record };
  if (prior.state === 'conflict') return { state: 'conflict' };
  if (prior.state === 'unknown' && prior.reason !== 'source-result-not-observed') return { state: 'unknown' };
  const request = createControlRequest(intent, run.head_sha, run.id, run.run_attempt,
    intent.action === 'continue' ? { commentId: event.comment.id } : {});
  return { state: 'new', request, ...(prior.state === 'equivalent' ? { aliasKey: prior.record.result.key } : {}) };
}

// Called only after the immutable request and both lookup indexes are uploaded,
// within the existing per-issue GitHub concurrency group.
export async function admitControlInvocation({ api, repository, prepared, event, eventName, readArtifact, variables, writeDispatch, collectFacts = collectIssueControlFacts }) {
  const { request, aliasKey } = prepared;
  const metadata = await api(''), actor = metadata.owner;
  const run = await api(`actions/runs/${request.routerRunId}/attempts/${request.routerAttempt}`);
  validateControlRouter({ run, metadata, actor, repository, eventName, runId: request.routerRunId, attempt: request.routerAttempt });
  const claimed = createControlResult(request, { status: 'claimed' });
  const comment = await api(`issues/${request.intent.issue.number}/comments`, 'POST', { body: controlResultBody(claimed) });
  if (!Number.isSafeInteger(comment?.id) || comment.id < 1) throw Error('Control claim is unconfirmed');
  if (aliasKey) return { result: createControlResult(request, { status: 'alias', aliasKey }), commentId: comment.id };
  let native;
  try {
    const facts = await collectFacts({ api, repository, number: request.intent.issue.number, actor, readArtifact,
      readCapability: readIssueControlCapability, readPolicy: options => readIssueControlPolicy({ ...options, variables }),
      // This source job has explicit issues/actions write permissions. It never
      // treats a browser installation token as the owner's acting account.
      readAuthority: async () => ({ actorId: actor.id, repositoryId: metadata.id, commentWrite: true, dispatchWrite: true }) });
    const currentComment = request.commentId ? await api(`issues/comments/${request.commentId}`) : null;
    native = controlStageDispatch({ request, facts, run, event, repository, owner: actor.login, currentComment });
  } catch (error) {
    return { result: createControlResult(request, { status: 'rejected', reason: error instanceof IssueControlRefusal ? error.reason : 'source-admission-unavailable' }), commentId: comment.id };
  }
  const dispatch = await recordDispatch(api, repository, native);
  if (!dispatch.send) throw Error('Native request already exists; reconcile its source receipt');
  await writeDispatch(native);
  return { native, dispatchCommentId: dispatch.comment.id, commentId: comment.id };
}

async function main(phase) {
  const env = process.env, repository = env.GITHUB_REPOSITORY;
  if (!/^[\w.-]+\/[\w.-]+$/.test(repository ?? '')) throw Error('Invalid repository');
  const runId = Number(env.GITHUB_RUN_ID), attempt = Number(env.GITHUB_RUN_ATTEMPT);
  const directory = join(env.RUNNER_TEMP, `lighthouse-control-${runId}-${attempt}`);
  const api = createIssueApi(repository, env);
  const output = async (key, value) => appendFile(env.GITHUB_OUTPUT, `${key}=${value}\n`);
  const save = async (name, value) => writeFile(join(directory, name), JSON.stringify(value));
  const load = async name => JSON.parse(await readFile(join(directory, name), 'utf8'));
  if (phase === 'prepare') {
    const event = JSON.parse(await readFile(env.GITHUB_EVENT_PATH, 'utf8'));
    const prepared = await prepareControlInvocation({ api, repository, event, eventName: env.GITHUB_EVENT_NAME, runId, attempt, readArtifact: readActionsJson });
    await mkdir(directory, { recursive: true });
    if (prepared.state !== 'new') {
      await appendFile(env.GITHUB_STEP_SUMMARY, `Issue control: ${prepared.state}. No new dispatch.\n`); return;
    }
    await save('request.json', prepared.request); await save('prepared.json', prepared);
    await output('preserve', 'true');
    await output('request_artifact', controlRequestArtifact(runId, attempt));
    await output('key_artifact', controlIndexArtifact('key', issueIntentKey(prepared.request.intent)));
    await output('payload_artifact', controlIndexArtifact('payload', issueIntentDigest(prepared.request.intent)));
  } else if (phase === 'admit') {
    const event = JSON.parse(await readFile(env.GITHUB_EVENT_PATH, 'utf8'));
    const admitted = await admitControlInvocation({ api, repository, prepared: await load('prepared.json'), event,
      eventName: env.GITHUB_EVENT_NAME, readArtifact: readActionsJson, variables: env,
      writeDispatch: native => save('dispatch.json', native) });
    await save('admitted.json', admitted);
    await output('comment', admitted.commentId);
    await output('result_artifact', controlResultArtifact(runId, attempt));
    if (admitted.native) {
      await output('send', 'true'); await output('dispatch_artifact', dispatchArtifact(admitted.native));
    } else { await save('result.json', admitted.result); await output('terminal', 'true'); }
  } else if (phase === 'send') {
    const admitted = await load('admitted.json'), prepared = await load('prepared.json');
    await sendDispatch(api, repository, admitted.native, admitted.dispatchCommentId);
    await save('result.json', createControlResult(prepared.request, { status: 'admitted', dispatchCommentId: admitted.dispatchCommentId }));
  } else if (phase === 'publish') {
    const admitted = await load('admitted.json'), result = await load('result.json');
    await api(`issues/comments/${admitted.commentId}`, 'PATCH', { body: controlResultBody(result) });
    await appendFile(env.GITHUB_STEP_SUMMARY, `Source issue-control result: ${result.status}. Worker admission and stage completion remain separate observations.\n`);
  } else throw Error('Unknown issue-control phase');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main(process.argv[2]).catch(error => {
  console.error(error instanceof IssueControlRefusal ? error.reason : 'Issue-control outcome is unconfirmed; reconcile source artifacts before any retry.');
  process.exitCode = 1;
});
