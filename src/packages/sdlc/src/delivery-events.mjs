import { checkImplementationPullRequest, checkProposal } from './proposal-review.mjs';
import { stagePath } from './stage-dispatch.mjs';
import { retryLimit, retryDelayMs } from './worker-recovery.mjs';
import { verificationBranch, verificationPush, verificationPullRequest, currentMergeSubject } from './ci-subject.mjs';

function transportFailureCode(error) {
  if (error?.name === 'AbortError') return null;
  const code = error?.cause?.code ?? error?.code;
  if (['ETIMEDOUT', 'UND_ERR_CONNECT_TIMEOUT', 'UND_ERR_HEADERS_TIMEOUT'].includes(code)) return 'connection-timeout';
  return code === 'ECONNRESET' ? 'connection-reset' : code === 'EAI_AGAIN' ? 'dns-temporary' : null;
}

export async function readCiPreflight(api, path) {
  for (let attempt = 0; ; attempt++) {
    try { return await api(path); }
    catch (error) {
      const transient = Number.isInteger(error?.status) ? [502, 503, 504].includes(error.status) : error?.name === 'TimeoutError' || transportFailureCode(error);
      if (attempt >= 2 || error?.name === 'AbortError' || !transient) throw error;
    }
  }
}

// Never retain exception messages, headers or response bodies across the API boundary.
export function ciRequestFailure(error, pr, operation = {}) {
  const status = Number.isSafeInteger(error.status) && error.status >= 100 && error.status <= 599 ? error.status : null;
  const exception = status ? 'http' : ['TimeoutError', 'AbortError', 'TypeError'].includes(error.name) ? error.name : 'Error';
  const requestedCode = operation.code ?? (error.ciAppSetupRequired ? 'app-setup-required' : transportFailureCode(error));
  const code = ['head-changed', 'base-changed', 'authority-changed', 'workflow-changed', 'app-setup-required', 'inventory-incomplete', 'send-unconfirmed', 'budget-exhausted', 'delay-pending', 'connection-timeout', 'connection-reset', 'dns-temporary'].includes(requestedCode) ? requestedCode : 'request-failed';
  const method = operation.method === 'POST' ? 'POST' : 'GET';
  const path = /^(?:git\/refs|pulls\/[1-9][0-9]*|actions\/workflows\/[\w.-]+\.ya?ml\/(?:runs|dispatches)|contents\/\.lighthouse\/github\.json)$/.test(operation.path ?? '') ? operation.path : 'contents/.lighthouse/github.json';
  if (!Number.isSafeInteger(pr.number) || pr.number < 1 || !/^[a-f0-9]{40}$/.test(pr.head.sha)) throw Error('Invalid CI diagnostic subject');
  return { schemaVersion: 1, method, path, status, exception, code, pr: pr.number, head: pr.head.sha };
}

export function ciFailureSummary(failure) {
  const safe = ciRequestFailure({ status: failure.status, name: failure.exception }, { number: failure.pr, head: { sha: failure.head } }, failure);
  if (safe.code === 'app-setup-required') return `CI trigger unavailable for PR #${safe.pr} at ${safe.head}. Workflow maintainer: install the repository-scoped CI App and configure LIGHTHOUSE_CI_APP_CLIENT_ID and LIGHTHOUSE_CI_APP_PRIVATE_KEY; preserve the retained candidate and request state.`;
  return `CI request: ${safe.method} ${safe.path}; ${safe.status ? `HTTP ${safe.status}` : safe.exception}; ${safe.code}; PR #${safe.pr} at ${safe.head}. Maintainer: reconcile the retained send state and native CI before any resend.`;
}

async function ciPullRequests(api, run) {
  const pulls = await api(`commits/${run.head_sha}/pulls?per_page=100`);
  if (!Array.isArray(pulls) || pulls.length >= 100) throw Error('CI subject lookup exceeds bounds');
  // GitHub need not associate an unmerged test commit with its PR; the ref is only a lookup hint.
  const number = verificationPullRequest(run);
  if (number !== null && !pulls.some(pr => pr.number === number)) {
    const pr = await api(`pulls/${number}`, 'GET', undefined, true);
    if (pr?.number === number) pulls.push(pr);
  }
  return pulls;
}

// Display names filter subscriptions only; actual paths, revisions and subjects admit work.
export async function completionSource(api, repository, event, env = {}) {
  if (event.action !== 'completed' || !Number.isSafeInteger(event.workflow_run?.id)) return null;
  const run = await api(`actions/runs/${event.workflow_run.id}`);
  if (run.status !== 'completed' || run.head_sha !== event.workflow_run.head_sha || run.repository?.full_name !== repository) return null;
  if (event.completionRecovery) {
    const origin = await api(`actions/runs/${event.completionRecovery.maintenance}`);
    const verified = await (await import('./completion-recovery.mjs')).recoveredCompletionEvent(api, repository, repository.split('/')[0], origin, event.completionRecovery.issue);
    if (verified.workflow_run.id !== run.id || JSON.stringify(verified.completionRecovery) !== JSON.stringify(event.completionRecovery)) throw Error('Recovered completion source changed');
    return 'checks';
  }
  const parent = ['triage', 'refine', 'propose', 'implement', 'apply-review'].some(worker => run.path === stagePath(worker));
  if (run.conclusion === 'success' && (run.path === stagePath('refine') || env.LIGHTHOUSE_PRODUCT_CHANGE_ENABLED === 'true' && (parent || ['product-change', 'apply-product-change'].some(worker => run.path === stagePath(worker))))) return 'stage';
  const metadata = await api('');
  const config = await api(`contents/.lighthouse/github.json?ref=${metadata.default_branch}`, 'GET', undefined, true);
  if (!config) return null;
  const profile = JSON.parse(Buffer.from(config.content, 'base64').toString());
  if (!profile.completion?.postMergeWorkflows?.some(name => run.path === `.github/workflows/${name}`) || !['push', 'pull_request', 'workflow_dispatch'].includes(run.event)) return null;
  const pulls = await ciPullRequests(api, run);
  return pulls.some(pr => {
    if (pr.base?.ref !== metadata.default_branch || pr.head?.sha !== run.head_sha && pr.merge_commit_sha !== run.head_sha) return false;
    try { checkImplementationPullRequest({ ...pr, state: 'open', merged: false }, repository); return true; } catch {
      try { checkProposal(pr, repository); return true; } catch { return false; }
    }
  }) ? 'checks' : null;
}

// Signal before the final CI job exits; only terminal CI can authorize the later review.
export async function signalCurrentPostMergeReview(api, repository, env) {
  const id = Number(env.GITHUB_RUN_ID), attempt = Number(env.GITHUB_RUN_ATTEMPT);
  if (!['workflow_dispatch', 'push'].includes(env.GITHUB_EVENT_NAME) || env.LIGHTHOUSE_CI_RESULT !== 'success' || !Number.isSafeInteger(id) || id < 1 || !Number.isSafeInteger(attempt) || attempt < 1) return false;
  const run = await api(`actions/runs/${id}/attempts/${attempt}`);
  if (run.repository?.full_name !== repository || run.event !== env.GITHUB_EVENT_NAME || run.run_attempt !== attempt || run.head_sha !== env.GITHUB_SHA || run.status === 'completed' && run.conclusion !== 'success') return false;
  const metadata = await api('');
  if (run.head_branch !== metadata.default_branch) return false;
  const config = await api(`contents/.lighthouse/github.json?ref=${metadata.default_branch}`, 'GET', undefined, true);
  const profile = config ? JSON.parse(Buffer.from(config.content, 'base64').toString()) : null;
  if (!profile?.completion?.postMergeWorkflows?.some(name => run.path === `.github/workflows/${name}`)) return false;
  const pulls = await api(`commits/${run.head_sha}/pulls?per_page=100`);
  if (pulls.length >= 100) throw Error('Post-merge signal subject inventory exceeds its bound');
  const targets = [];
  for (const candidate of pulls) {
    const pr = await api(`pulls/${candidate.number}`);
    if (!pr.merged || pr.merge_commit_sha !== run.head_sha || pr.base?.ref !== metadata.default_branch) continue;
    try { targets.push(checkImplementationPullRequest({ ...pr, state: 'open', merged: false }, repository)); } catch { /* Unrelated merges cannot request review. */ }
  }
  if (targets.length !== 1) return false;
  // A wake-up only: the router waits for terminal CI and authenticates retained integration.
  await api('actions/workflows/lighthouse-sdlc-router.yml/dispatches', 'POST', { ref: metadata.default_branch, inputs: { issue: String(targets[0].issue), stage: 'review', workflow: 'stage', after_run: String(id) } });
  return true;
}

export async function deliveryAfterChecks(api, repository, owner, event) {
  const id = event.workflow_run?.id;
  if (!Number.isSafeInteger(id) || event.action !== 'completed') return null;
  const run = await api(`actions/runs/${id}`);
  if (run.status !== 'completed' || run.conclusion !== 'success' || run.head_sha !== event.workflow_run.head_sha || !['push', 'pull_request', 'workflow_dispatch'].includes(run.event)) return null;
  const metadata = await api('');
  const config = await api(`contents/.lighthouse/github.json?ref=${metadata.default_branch}`, 'GET', undefined, true);
  if (!config) return null;
  const profile = JSON.parse(Buffer.from(config.content, 'base64').toString());
  if (!profile.completion?.postMergeWorkflows?.some(name => run.path === `.github/workflows/${name}`)) return null;
  const pulls = await ciPullRequests(api, run);
  for (const candidate of pulls) {
    if (candidate.head?.sha !== run.head_sha && candidate.merge_commit_sha !== run.head_sha) continue;
    const pr = await api(`pulls/${candidate.number}`);
    if (pr.base.ref !== metadata.default_branch) continue;
    let target;
    try { target = checkImplementationPullRequest({ ...pr, state: 'open', merged: false }, repository); } catch { continue; }
    if (pr.merged && pr.merge_commit_sha === run.head_sha && run.head_branch === metadata.default_branch) return { stage: 'review', issue: target.issue, pr: pr.number, head: pr.head.sha, merge: false };
    if (pr.state !== 'open' || pr.draft) continue;
    if (pr.head.sha !== run.head_sha) {
      if (pr.merge_commit_sha !== run.head_sha || !(run.event === 'pull_request' || verificationPush(run, pr.number))) continue;
      const base = (await api(`git/ref/heads/${pr.base.ref}`))?.object?.sha;
      if ((await currentMergeSubject(api, pr, base))?.head !== run.head_sha) continue;
    }
    const reviews = await api(`pulls/${pr.number}/reviews?per_page=100`);
    if (reviews.length >= 100) throw Error('Review lookup exceeds bounds');
    const decision = reviews.filter(r => r.user?.login === owner && ['APPROVED', 'CHANGES_REQUESTED', 'DISMISSED'].includes(r.state)).sort((a, b) => b.id - a.id)[0];
    if (decision?.state === 'APPROVED' && decision.commit_id === pr.head.sha) return { stage: 'integrate', issue: target.issue, pr: pr.number, head: pr.head.sha, merge: true, approval: { id: decision.id, owner, head: pr.head.sha } };
  }
  return null;
}

export async function dispatchDeliveryChecks(api, revision, pr, { checkpoint = async () => {}, previous = null, now = Date.now(), ciTrigger = null, beforeWrite = async () => {} } = {}) {
  let config;
  try { config = await api(`contents/.lighthouse/github.json?ref=${revision}`, 'GET', undefined, true); }
  catch (error) { error.ciRequestFailure = ciRequestFailure(error, pr); throw error; }
  if (!config) return [];
  const workflows = JSON.parse(Buffer.from(config.content, 'base64').toString()).completion?.postMergeWorkflows ?? [];
  if (!Array.isArray(workflows) || workflows.length > 12 || new Set(workflows).size !== workflows.length || workflows.some(w => !/^[\w.-]+\.ya?ml$/.test(w))) throw Error('Invalid repository check workflows');
  if (previous?.some(item => item.schemaVersion === 2) || ciTrigger && !previous) return dispatchPushChecks(api, revision, pr, workflows, { checkpoint, previous, now, ciTrigger, beforeWrite });
  const requests = workflows.map(workflow => {
    const prior = previous?.find(item => item.workflow === workflow);
    if (previous && (!prior || prior.schemaVersion !== 1 || prior.pr !== pr.number || prior.head !== pr.head.sha || prior.branch !== pr.head.ref || !Number.isSafeInteger(prior.attempt) || prior.attempt < 1 || prior.attempt > retryLimit + 1)) throw Error('CI recovery receipt differs from the retained candidate');
    return prior ? { ...prior } : { schemaVersion: 1, pr: pr.number, head: pr.head.sha, branch: pr.head.ref, workflow, attempt: 1, observedAt: new Date(now).toISOString(), state: 'not-sent' };
  });
  for (const workflow of workflows) {
    const prior = previous?.find(item => item.workflow === workflow);
    const request = requests.find(item => item.workflow === workflow);
    request.attempt = prior?.attempt ?? 1;
    const operation = { method: 'GET', path: `pulls/${pr.number}` };
    const stop = code => { operation.code = code; };
    try {
      const current = await api(`pulls/${pr.number}`);
      if (current.head.sha !== pr.head.sha || current.head.ref !== pr.head.ref || current.state !== 'open') { stop('head-changed'); throw Error('PR changed before checks could start'); }
      operation.path = `actions/workflows/${workflow}/runs`;
      const path = `actions/workflows/${workflow}/runs?head_sha=${pr.head.sha}&per_page=100`;
      const found = await (!prior || ['not-sent', 'rejected'].includes(prior.state) ? readCiPreflight(api, path) : api(path));
      if (!Array.isArray(found.workflow_runs) || found.total_count > 100) { stop('inventory-incomplete'); throw Error('CI request inventory exceeds bounds'); }
      const existing = found.workflow_runs.filter(run => run.head_sha === pr.head.sha && run.head_branch === pr.head.ref && run.repository?.full_name === current.head.repo?.full_name && run.path === `.github/workflows/${workflow}` && ['push', 'workflow_dispatch'].includes(run.event)).sort((a, b) => b.id - a.id)[0];
      if (existing) { Object.assign(request, { state: 'observed', run: existing.id }); await checkpoint(requests); continue; }
      if (prior) {
        Object.assign(request, prior);
        if (!['not-sent', 'rejected'].includes(prior.state)) { stop('send-unconfirmed'); throw Error('CI dispatch acknowledgement is unconfirmed; reconcile the original request before any resend'); }
        if (prior.attempt >= retryLimit + 1) { stop('budget-exhausted'); throw Error('CI launch retry budget exhausted'); }
        if (!Number.isFinite(Date.parse(prior.observedAt)) || now - Date.parse(prior.observedAt) < retryDelayMs) { stop('delay-pending'); throw Error('CI launch retry delay has not elapsed'); }
        Object.assign(request, { attempt: prior.attempt + 1, state: 'not-sent', observedAt: new Date(now).toISOString() });
        delete request.error;
      }
      request.state = 'requested';
      await checkpoint(requests);
      Object.assign(operation, { method: 'POST', path: `actions/workflows/${workflow}/dispatches` });
      try { await api(`actions/workflows/${workflow}/dispatches`, 'POST', { ref: current.head.ref }); }
      catch (error) {
        request.state = Number.isSafeInteger(error.status) && error.status >= 400 && error.status < 500 ? 'rejected' : 'unknown';
        throw error;
      }
      request.state = 'acknowledged';
      await checkpoint(requests);
    } catch (error) {
      request.error = ciRequestFailure(error, pr, operation);
      error.ciRequestFailure = request.error;
      await checkpoint(requests);
      throw error;
    }
  }
  return requests;
}

// Each immutable CI subject has its own bounded send state in the same receipt.
async function dispatchPushChecks(api, revision, pr, workflows, { checkpoint, previous, now, ciTrigger, beforeWrite }) {
  if (previous?.some(row => row.sourceHead !== undefined && row.sourceHead !== pr.head.sha)) throw Error('CI recovery source head changed');
  let heads = previous?.filter(row => row.sourceHead === undefined) ?? [], merges = previous?.filter(row => row.sourceHead !== undefined) ?? [];
  const saveHead = async rows => { heads = rows; await checkpoint([...heads, ...merges]); };
  heads = await dispatchPushSubject(api, revision, pr, workflows, { checkpoint: saveHead, previous: previous ? heads : null, now, ciTrigger, beforeWrite });
  if (!workflows.length) return heads;
  const current = await api(`pulls/${pr.number}`);
  if (current.head?.sha !== pr.head.sha || current.state !== 'open') throw Error('CI head changed before merge verification');
  let subject;
  try { subject = await currentMergeSubject(api, current, heads[0].base); }
  catch (error) { error.ciRequestFailure = ciRequestFailure(error, pr, { method: 'GET', path: `pulls/${pr.number}`, code: 'base-changed' }); throw error; }
  if (!subject) {
    if (merges.length) throw Error('Retained CI merge subject is no longer current');
    return heads;
  }
  const saveMerge = async rows => { merges = rows; await checkpoint([...heads, ...merges]); };
  merges = await dispatchPushSubject(api, revision, pr, workflows, { checkpoint: saveMerge, previous: merges.length ? merges : null, now, ciTrigger, beforeWrite, subject });
  return [...heads, ...merges];
}

// One immutable ref emits one eligible push for all configured trusted workflows.
async function dispatchPushSubject(api, revision, pr, workflows, { checkpoint, previous, now, ciTrigger, beforeWrite, subject = null }) {
  if (!workflows.length) return [];
  let requests = [], operation = { method: 'GET', path: `pulls/${pr.number}` };
  const sha = value => /^[a-f0-9]{40}$/.test(value ?? '');
  try {
    const current = await api(`pulls/${pr.number}`), repository = current.head.repo?.full_name;
    if (current.number !== pr.number || current.state !== 'open' || current.head.sha !== pr.head.sha || current.head.ref !== pr.head.ref || !/^[\w.-]+\/[\w.-]+$/.test(repository ?? '') || current.base?.repo?.full_name !== repository || !sha(current.base?.sha) || !sha(revision)) { operation.code = 'head-changed'; throw Error('CI subject changed'); }
    const head = subject?.head ?? pr.head.sha;
    const baseBranch = current.base.ref, branch = verificationBranch(pr.number, head);
    const base = (await api(`git/ref/heads/${baseBranch}`))?.object?.sha;
    if (!sha(base)) { operation.code = 'base-changed'; throw Error('CI base reference is unavailable'); }
    if (subject && JSON.stringify(await currentMergeSubject(api, current, base)) !== JSON.stringify(subject)) { operation.code = 'base-changed'; throw Error('CI merge subject changed'); }
    const recheck = async () => {
      await beforeWrite();
      const fresh = await api(`pulls/${pr.number}`);
      if (fresh.state !== 'open' || fresh.head.sha !== pr.head.sha || fresh.head.ref !== pr.head.ref) { operation.code = 'head-changed'; throw Error('CI head changed'); }
      if (fresh.base?.ref !== baseBranch || (await api(`git/ref/heads/${baseBranch}`))?.object?.sha !== base) { operation.code = 'base-changed'; throw Error('CI base changed'); }
      if (subject && fresh.merge_commit_sha !== head) { operation.code = 'base-changed'; throw Error('CI merge subject changed'); }
    };
    for (const workflow of workflows) {
      const path = `contents/.github/workflows/${workflow}?ref=`;
      const trusted = await readCiPreflight(api, path + revision), candidate = await readCiPreflight(api, path + head);
      if (trusted.type !== 'file' || !sha(trusted.sha) || candidate.type !== 'file' || trusted.sha !== candidate.sha) { operation.code = 'workflow-changed'; throw Error('CI definition changed'); }
      const identity = { schemaVersion: 2, trigger: 'app-push', pr: pr.number, head, ...(subject ? { sourceHead: pr.head.sha } : {}), sourceBranch: pr.head.ref, base, baseBranch, branch, workflow, workflowSha: trusted.sha, revision };
      const prior = previous?.find(item => item.workflow === workflow);
      if (previous && (!prior || Object.keys(identity).some(key => prior[key] !== identity[key]) || !['not-sent', 'requested', 'acknowledged', 'unknown', 'observed', 'rejected'].includes(prior.state) || !Number.isSafeInteger(prior.attempt) || prior.attempt < 1 || prior.attempt > retryLimit + 1 || !Number.isFinite(Date.parse(prior.observedAt)))) throw Error('CI recovery differs from the retained push identity');
      requests.push({ ...identity, attempt: prior?.attempt ?? 1, observedAt: prior?.observedAt ?? new Date(now).toISOString(), state: prior?.state ?? 'not-sent', ...(prior?.run ? { run: prior.run } : {}) });
    }
    if (previous && previous.length !== requests.length) throw Error('CI recovery workflow inventory changed');
    const inventory = async (retryRead = false) => {
      for (const request of requests) {
        operation = { method: 'GET', path: `actions/workflows/${request.workflow}/runs` };
        const path = `${operation.path}?head_sha=${head}&per_page=100`;
        const found = await (retryRead ? readCiPreflight(api, path) : api(path));
        if (!Array.isArray(found.workflow_runs) || !Number.isSafeInteger(found.total_count) || found.total_count !== found.workflow_runs.length || found.total_count > 100) { operation.code = 'inventory-incomplete'; throw Error('CI push inventory is incomplete'); }
        const run = found.workflow_runs.filter(run => run.head_sha === head && run.head_branch === branch && run.repository?.full_name === repository && run.path === `.github/workflows/${request.workflow}` && run.event === 'push').sort((a, b) => b.id - a.id)[0];
        if (run) Object.assign(request, { state: 'observed', run: run.id });
        else if (request.state === 'observed') { request.state = 'unknown'; delete request.run; }
      }
    };
    await inventory(requests.every(request => ['not-sent', 'rejected'].includes(request.state)));
    const refPath = `git/ref/heads/${branch}`;
    let reference = await api(refPath, 'GET', undefined, true);
    if (reference && (reference.ref !== 'refs/heads/' + branch || reference.object?.sha !== head)) { operation.code = 'head-changed'; throw Error('CI verification ref changed'); }
    if (reference) {
      await checkpoint(requests);
      if (requests.every(request => request.state === 'observed') || previous && requests.every(request => ['observed', 'acknowledged'].includes(request.state))) return requests;
      operation.code = 'send-unconfirmed'; throw Error('Existing CI ref has no confirmed native push');
    }
    if (requests.some(request => !['not-sent', 'rejected'].includes(request.state))) { operation.code = 'send-unconfirmed'; throw Error('CI ref creation is unconfirmed; do not resend'); }
    if (!ciTrigger) { operation.code = 'app-setup-required'; throw Error('CI App configuration is unavailable'); }
    if (previous) {
      if (requests.some(request => request.attempt >= retryLimit + 1)) { operation.code = 'budget-exhausted'; throw Error('CI push budget exhausted'); }
      if (requests.some(request => now - Date.parse(request.observedAt) < retryDelayMs)) { operation.code = 'delay-pending'; throw Error('CI push retry delay pending'); }
      for (const request of requests) Object.assign(request, { attempt: request.attempt + 1, observedAt: new Date(now).toISOString() });
    }
    await recheck();
    for (const request of requests) request.state = 'requested';
    await checkpoint(requests);
    operation = { method: 'POST', path: 'git/refs' };
    try {
      const app = await ciTrigger({ branch, head, beforeWrite: recheck });
      for (const request of requests) Object.assign(request, { state: 'acknowledged', app });
    } catch (error) {
      reference = await api(refPath, 'GET', undefined, true);
      if (!reference || reference.ref !== 'refs/heads/' + branch || reference.object?.sha !== head) {
        const rejected = error.referenceAttempted === false || Number.isInteger(error.status) && error.status >= 400 && error.status < 500;
        for (const request of requests) request.state = rejected ? 'rejected' : 'unknown';
        operation.code ??= error.authorityChanged ? 'authority-changed' : error.referenceAttempted === false ? 'app-setup-required' : 'send-unconfirmed';
        throw error;
      }
      for (const request of requests) request.state = 'acknowledged';
    }
    reference = await api(refPath, 'GET', undefined, true);
    if (reference?.ref !== 'refs/heads/' + branch || reference.object?.sha !== head) {
      for (const request of requests) request.state = 'unknown';
      operation.code = 'send-unconfirmed'; throw Error('CI reference effect is unconfirmed');
    }
    await checkpoint(requests);
    await inventory();
    await checkpoint(requests);
    return requests;
  } catch (error) {
    error.ciRequestFailure = ciRequestFailure(error, pr, operation);
    if (requests.length === workflows.length) await checkpoint(requests);
    throw error;
  }
}
