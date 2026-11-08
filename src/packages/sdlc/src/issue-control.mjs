import { collectIssueControlFacts } from './issue-control-facts.mjs';
import { readIssueControlCapability, readIssueControlPolicy } from './issue-control-contract.mjs';
import { createIssueIntent, validateIssueIntent, issueControlActions, issueIntentKey, issueIntentDigest, issueIntentEffect, canonicalIssueIntent, validControlRepository } from './issue-control-intent.mjs';
import { parseIssueComment } from './issue-comment-intent.mjs';
import { issueComments } from './stage-dispatch.mjs';
import { findControlResult } from './issue-control-ledger.mjs';
import { resolveControlAlias, observeControlExecution } from './issue-control-execution.mjs';

const positive = value => Number.isSafeInteger(value) && value > 0;
const same = (left, right) => canonicalIssueIntent(left) === canonicalIssueIntent(right);
const rejected = reason => ({ state: 'rejected', reason });
const unknown = reason => ({ state: 'unknown', reason, retry: false });
function publicFacts(facts) {
  if (!facts.question) return facts;
  const { request, ...question } = facts.question;
  return { ...facts, question };
}
function validatePrepared(value) {
  if (!value || Object.keys(value).length !== 5 || !['version', 'intent', 'key', 'payloadDigest', 'effect'].every(key => Object.hasOwn(value, key)) || value.version !== 1)
    throw Error('Malformed prepared issue control');
  validateIssueIntent(value.intent);
  if (value.key !== issueIntentKey(value.intent) || value.payloadDigest !== issueIntentDigest(value.intent) || !same(value.effect, issueIntentEffect(value.intent)))
    throw Error('Prepared issue control binding changed');
  return value;
}

// transport is explicitly authenticated and receives {scope,repository,path,method,body,apiVersion}.
// claim must atomically persist the key and payload before returning claimed.
export function createIssueControl({ repository, transport, readArtifact, readAuthority, now = () => new Date() }) {
  if (!validControlRepository(repository) || typeof transport !== 'function' || typeof readArtifact !== 'function' || typeof readAuthority !== 'function')
    throw Error('Issue control requires explicit authenticated transport and provenance readers');
  const api = (path, method = 'GET', body, optional = false, apiVersion) => transport({ scope: 'repository', repository, path, method, body, optional, apiVersion });
  const read = (path, method = 'GET', body, optional = false) => {
    if (method !== 'GET' || body !== undefined) throw Error('Issue-control observation cannot write');
    return api(path, method, undefined, optional);
  };
  const actor = async () => {
    const value = await transport({ scope: 'account', path: 'user', method: 'GET' });
    if (!positive(value?.id) || value.type !== 'User' || typeof value.login !== 'string' || !value.login) throw Error('Verified acting user is unavailable');
    return value;
  };
  const facts = async (number, identity) => collectIssueControlFacts({ api: read, repository, number, actor: identity,
    readArtifact, readAuthority, readCapability: readIssueControlCapability, readPolicy: readIssueControlPolicy, now });
  const target = value => {
    validatePrepared(value);
    if (value.intent.repository.name !== repository.toLowerCase()) throw Error('Prepared issue control targets another repository');
  };
  const observe = async ({ number }) => {
    if (!positive(number)) throw Error('Invalid issue number');
    try { return publicFacts(await facts(number, await actor())); }
    catch { return { availability: 'unavailable', reason: 'source-observation-unavailable' }; }
  };
  const prepare = async ({ number, action, id, body }) => {
    if (!issueControlActions.includes(action)) throw Error('Unsupported issue-control action');
    if (!positive(number)) throw Error('Invalid issue number');
    let current;
    try { current = await facts(number, await actor()); } catch { return { state: 'unavailable', reason: 'source-preflight-unavailable' }; }
    if (!current.actions?.[action]?.eligible) return rejected(current.actions?.[action]?.reason ?? current.reason ?? 'source-authority-unavailable');
    const intent = createIssueIntent({ id, facts: current, action, body });
    return { version: 1, intent, key: issueIntentKey(intent), payloadDigest: issueIntentDigest(intent), effect: issueIntentEffect(intent) };
  };
  const commentReceipt = (comment, intent) => {
    const parsed = parseIssueComment(comment);
    const source = `https://github.com/${repository}/issues/${intent.issue.number}#issuecomment-${comment?.id}`;
    if (!positive(comment?.id) || comment.html_url?.toLowerCase() !== source.toLowerCase()
        || comment.issue_url?.toLowerCase() !== `https://api.github.com/repos/${repository}/issues/${intent.issue.number}`.toLowerCase()
        || parsed.kind !== 'typed' || parsed.id !== intent.id || parsed.actorId !== intent.actorId
        || parsed.intent !== (intent.action === 'continue' ? 'continue' : 'comment') || parsed.body !== intent.body
        || intent.action === 'continue' && !same(parsed.question, intent.question)) throw Error('Comment effect is not confirmed');
    return { state: intent.action === 'continue' ? 'submitted' : 'comment-published', commentId: comment.id, source, questionResolved: false, ...(intent.action === 'continue' ? { sourceAcknowledged: false } : {}) };
  };
  const reconcileFor = async (prepared, identity) => {
    const intent = prepared.intent;
    if (identity.id !== intent.actorId) return rejected('acting-user-changed');
    const metadata = await read('');
    if (metadata.id !== intent.repository.id || metadata.owner?.id !== identity.id || metadata.owner.type !== 'User') return rejected('repository-authority-changed');
    const issue = await read(`issues/${intent.issue.number}`);
    if (issue.id !== intent.issue.id || issue.pull_request) return rejected('issue-identity-changed');
    if (intent.action !== 'comment') {
      const found = await findControlResult({ api: read, repository, intent, actor: identity, metadata, readArtifact });
      if (found.state === 'conflict') return { state: 'conflict', reason: 'intent-payload-changed', retry: false };
      if (found.state === 'equivalent') return { state: 'equivalent-observed', key: prepared.key, sourceKey: found.record.result.key,
        source: found.record.source, sourceAcknowledged: false, questionResolved: false, retry: false };
      if (found.state === 'recorded') {
        const { result, source, outcomeSource, request } = found.record;
        let original = found.record, execution;
        try {
          original = await resolveControlAlias({ api: read, repository, actor: identity, metadata, record: found.record, readArtifact });
          execution = await observeControlExecution({ api: read, repository, actor: identity, record: original, readArtifact });
        } catch { execution = { availability: 'unavailable', reason: 'source-execution-unverified', questionConsumed: false, questionResolved: false }; }
        const states = { claimed: 'unknown', rejected: 'rejected', admitted: 'source-admitted', alias: 'source-alias' };
        return { state: states[result.status], key: prepared.key, sourceKey: result.key, aliasKey: result.aliasKey,
          routerRunId: result.routerRunId, routerAttempt: result.routerAttempt, dispatchCommentId: result.dispatchCommentId,
          source, outcomeSource, reason: result.reason, sourceAcknowledged: original.result.status === 'admitted',
          sourceResult: { status: original.result.status, key: original.result.key, reason: original.result.reason, source: original.source },
          execution, questionResolved: execution.questionResolved === true, retry: false,
          ...(intent.action === 'continue' ? { commentId: request.commentId,
            commentSource: `https://github.com/${repository}/issues/${intent.issue.number}#issuecomment-${request.commentId}` } : {}) };
      }
      if (intent.action !== 'continue') return unknown(found.reason);
    }
    const matches = (await issueComments(read, intent.issue.number)).filter(comment => {
      const value = parseIssueComment(comment);
      return value.kind === 'typed' && value.actorId === intent.actorId && value.id === intent.id;
    });
    if (matches.some(comment => !same(parseIssueComment(comment).question, intent.question) || parseIssueComment(comment).body !== intent.body
        || parseIssueComment(comment).intent !== (intent.action === 'continue' ? 'continue' : 'comment'))) return { state: 'conflict', reason: 'intent-payload-changed', retry: false };
    if (matches.length > 1) return { state: 'conflict', reason: 'multiple-comment-effects', retry: false };
    if (!matches.length) return unknown('comment-effect-not-observed');
    return commentReceipt(matches[0], intent);
  };

  const reconcile = async prepared => {
    target(prepared);
    try { return await reconcileFor(prepared, await actor()); }
    catch { return unknown('source-reconciliation-unavailable'); }
  };
  const submit = async (prepared, { claim } = {}) => {
    target(prepared);
    if (typeof claim !== 'function') throw Error('Submission requires a durable atomic caller claim');
    let identity;
    try { identity = await actor(); } catch { return unknown('acting-user-unavailable'); }
    if (identity.id !== prepared.intent.actorId) return rejected('acting-user-changed');
    let ownership;
    try { ownership = await claim({ key: prepared.key, payloadDigest: prepared.payloadDigest, intent: prepared.intent }); }
    catch { return unknown('caller-journal-unavailable'); }
    if (ownership?.state === 'conflict') return { state: 'conflict', reason: 'intent-payload-changed', retry: false };
    if (ownership?.state === 'existing') {
      try { return await reconcileFor(prepared, identity); } catch { return unknown('source-reconciliation-unavailable'); }
    }
    if (ownership?.state !== 'claimed') return unknown('caller-claim-not-confirmed');
    let current;
    try { current = await facts(prepared.intent.issue.number, identity); } catch { return rejected('source-preflight-unavailable'); }
    if (!current.actions?.[prepared.intent.action]?.eligible) return rejected(current.actions?.[prepared.intent.action]?.reason ?? current.reason ?? 'source-authority-unavailable');
    let fresh;
    try { fresh = createIssueIntent({ id: prepared.intent.id, facts: current, action: prepared.intent.action, body: prepared.intent.body }); }
    catch { return rejected('source-intent-no-longer-preparable'); }
    if (!same(fresh, prepared.intent)) return rejected('source-binding-changed');
    try {
      const effect = prepared.effect;
      const response = await api(effect.path, 'POST', effect.body, false, effect.apiVersion);
      if (effect.kind === 'comment') return commentReceipt(response, prepared.intent);
      if (!positive(response?.workflow_run_id) || response.html_url?.toLowerCase() !== `https://github.com/${repository}/actions/runs/${response.workflow_run_id}`.toLowerCase())
        return unknown('router-dispatch-not-confirmed');
      return { state: 'submitted', routerRunId: response.workflow_run_id, source: response.html_url, workerRunId: null,
        sourceAcknowledged: false, questionResolved: false };
    } catch (error) {
      return [400, 401, 403, 404, 405, 410, 422].includes(error?.status) ? rejected(`provider-http-${error.status}`) : unknown('submission-outcome-unconfirmed');
    }
  };
  return { observe, prepare, submit, reconcile };
}

export { parseIssueComment } from './issue-comment-intent.mjs';
export { validateIssueIntent, parseIssueIntent } from './issue-control-intent.mjs';
