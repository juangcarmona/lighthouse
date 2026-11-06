import { isDeepStrictEqual } from 'node:util';
import { loadProfile } from './completion.mjs';
import { readCiPreflight } from './delivery-events.mjs';

// The caller authenticates the PR and parent lease; checks never authorize a merge.
export async function ensureEpicChecks({ api, repository, sourceRevision, observation, journal, key, recheck, checks, ciTrigger, subject = 'candidate', wait = () => new Promise(resolve => setTimeout(resolve, 10000)), polls = 60 }) {
  const { pr, base } = observation;
  const candidate = subject === 'head' ? pr?.head?.sha : observation.candidate;
  const receiptField = subject === 'head' ? 'headChecks' : 'checks';
  const sha = value => /^[a-f0-9]{40}$/.test(value ?? '');
  if (!['head', 'candidate'].includes(subject) || !Number.isSafeInteger(pr?.number) || pr.number < 1 || !sha(pr.head?.sha) || !sha(base) || !sha(candidate) || !sha(sourceRevision) || !Number.isSafeInteger(polls) || polls < 1 || polls > 60) throw Error('Invalid epic check observation');
  const verify = async () => {
    if (await recheck() !== true) throw Error('Epic check authority, head or base changed');
    const values = await checks();
    if (!Array.isArray(values) || !values.length) throw Error('Epic checks have no enforced validation');
    if (values.some(value => value.status === 'failed')) throw Error('Epic candidate CI failed; correct the candidate before readiness');
    return values.every(value => value.status === 'passed');
  };
  if (await verify()) return;
  const profile = await loadProfile(api, repository, sourceRevision);
  const workflows = profile.completion?.postMergeWorkflows;
  if (!Array.isArray(workflows) || !workflows.length || workflows.length > 8 || new Set(workflows).size !== workflows.length || workflows.some(name => !/^[\w.-]+\.ya?ml$/.test(name))) throw Error('Epic candidate checks require configured verification push workflows');
  for (const name of workflows) {
    const path = `contents/.github/workflows/${name}?ref=`;
    const trusted = await readCiPreflight(api, path + sourceRevision), proposed = await readCiPreflight(api, path + candidate);
    if (trusted.type !== 'file' || !sha(trusted.sha) || proposed.type !== 'file' || proposed.sha !== trusted.sha) throw Error('Epic candidate changed a trusted verification workflow');
  }
  let receipt = await journal.readReceipt(key);
  if (!receipt || receipt.state !== 'linked' || receipt.resource?.id !== pr.id || receipt.resource.number !== pr.number || !['pull-request', 'aggregate'].includes(receipt.correlation?.kind) || receipt.publication && receipt.publication.head !== pr.head.sha) throw Error('Epic checks lack the authenticated PR receipt');
  const identity = { head: pr.head.sha, base, candidate, branch: `lighthouse/verification-${pr.number}-${candidate}`, workflows };
  let state = receipt[receiptField];
  if (!state || !isDeepStrictEqual(state.identity, identity)) state = { identity, reference: 'not-sent', requests: {} };
  const save = async () => { receipt = { ...receipt, [receiptField]: structuredClone(state) }; await journal.writeReceipt(key, receipt); };
  const refPath = `git/ref/heads/${identity.branch}`;
  let ref = await api(refPath, 'GET', undefined, true);
  if (!ref) {
    if (state.reference !== 'not-sent') throw Error('Epic check reference creation is unconfirmed; reconcile the retained request before retrying');
    if (typeof ciTrigger !== 'function') throw Error('Epic candidate CI requires LIGHTHOUSE_CI_APP_CLIENT_ID and LIGHTHOUSE_CI_APP_PRIVATE_KEY on the trusted host');
    if (await recheck() !== true) throw Error('Epic check authority changed before reference creation');
    state.reference = 'requested'; await save();
    try {
      await ciTrigger({ branch: identity.branch, head: candidate, beforeWrite: async () => {
        if (await recheck() !== true || await api(refPath, 'GET', undefined, true)) throw Error('Epic check authority or reference changed before CI push');
      } });
    } catch (error) {
      ref = await api(refPath, 'GET', undefined, true);
      if (!ref) {
        if (error.referenceAttempted === false && !error.authorityChanged) { state.reference = 'not-sent'; await save(); }
        throw error;
      }
    }
    ref ??= await api(refPath, 'GET', undefined, true);
  }
  if (ref?.ref !== `refs/heads/${identity.branch}` || ref.object?.sha !== candidate) throw Error('Epic check reference is absent or points to another revision');
  state.reference = 'observed'; await save();
  for (let i = 0; i < polls; i++) {
    if (await recheck() !== true) throw Error('Epic check authority changed while observing CI push');
    const currentRef = await api(refPath, 'GET', undefined, true);
    if (currentRef?.ref !== `refs/heads/${identity.branch}` || currentRef.object?.sha !== candidate) throw Error('Epic check reference changed while observing CI push');
    let observed = true;
    for (const name of workflows) {
      const inventory = await api(`actions/workflows/${name}/runs?head_sha=${candidate}&per_page=100`);
      if (!Array.isArray(inventory.workflow_runs) || !Number.isSafeInteger(inventory.total_count) || inventory.total_count !== inventory.workflow_runs.length || inventory.total_count > 100) throw Error('Epic candidate CI inventory is incomplete');
      const existing = inventory.workflow_runs.filter(run => run.head_sha === candidate && run.head_branch === identity.branch && run.path === `.github/workflows/${name}` && run.event === 'push' && run.repository?.full_name === repository && Number.isSafeInteger(run.id) && run.id > 0).sort((a, b) => b.id - a.id)[0];
      if (!existing) {
        if (state.requests[name]?.state === 'observed') throw Error('Epic candidate CI push evidence disappeared; reconcile the retained request');
        observed = false;
      } else state.requests[name] = { state: 'observed', run: existing.id };
    }
    await save();
    const passed = await verify();
    if (observed && passed) {
      const fresh = await api(refPath, 'GET', undefined, true);
      if (fresh?.ref !== `refs/heads/${identity.branch}` || fresh.object?.sha !== candidate) throw Error('Epic check reference changed before readiness');
      return;
    }
    if (i + 1 < polls) await wait();
  }
  throw Error('Epic candidate push CI checks remain pending; inspect the App installation, verification push subscription and retained request before requesting readiness');
}
