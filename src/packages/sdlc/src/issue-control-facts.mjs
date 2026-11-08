import { validControlRepository, canonicalIssueIntent } from './issue-control-intent.mjs';
import { digest, taskDigest } from './digests.mjs';
import { routeIssue, pendingStage, pendingReplyState, checkReplyInputs } from './issue-entry.mjs';
import { ownerIntentComments, collectTriageAdmission, collectProposalAdmission, IssueAdmissionRefusal } from './issue-admission.mjs';
import { eligibleIssueAuthor } from './request-triage.mjs';
import { issueComments, readDispatchReceipt, loadDispatch } from './stage-dispatch.mjs';
import { loadStageReport } from './proposal.mjs';
import { validateStageEnvelope } from './host-contract.mjs';
import { pendingQuestion } from './handoff.mjs';

const positive = value => Number.isSafeInteger(value) && value > 0;
const hash = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const sourceTime = value => typeof value === 'string' && Number.isFinite(Date.parse(value));
const revision = value => typeof value === 'string' && /^[a-f0-9]{40}$/.test(value);
const refusal = (code, availability = 'denied') => ({ eligible: false, availability, reason: code });
const unavailable = code => refusal(code, 'unavailable');

async function reservations(api, repository, owner, issue, comments, capability, readArtifact) {
  const active = [];
  for (const comment of comments) {
    if (comment.user?.login !== 'github-actions[bot]' || comment.user.type !== 'Bot' || !comment.body?.includes('<!-- lighthouse-dispatch:')) continue;
    const receipt = readDispatchReceipt(comment, repository, issue.number);
    if (['completed', 'waiting', 'blocked', 'failed', 'cancelled'].includes(receipt.status)) continue;
    if (active.length >= 20 || !receipt.workerRunId || receipt.status === 'unknown') return { availability: 'unavailable', reason: 'dispatch-outcome-unconfirmed', active };
    const run = await api(`actions/runs/${receipt.workerRunId}`);
    const dispatch = await loadDispatch(api, repository, owner, issue.number, comment.id, run, readArtifact);
    if (run.status === 'completed') return { availability: 'unavailable', reason: 'dispatch-publication-unconfirmed', active };
    active.push({ requestId: dispatch.request.id, commentId: comment.id, workerRunId: Number(run.id), stage: dispatch.request.stage,
      worker: dispatch.request.worker ?? dispatch.request.stage, source: `https://github.com/${repository}/actions/runs/${run.id}` });
  }
  if (!Array.isArray(capability.backgroundWorkflows) || capability.backgroundWorkflows.length > 2) return { availability: 'unavailable', reason: 'reservation-coverage-unsupported', active };
  for (const workflow of capability.backgroundWorkflows) {
    if (!['lighthouse-sdlc-unattended.yml', 'lighthouse-sdlc-epic.yml'].includes(workflow)) return { availability: 'unavailable', reason: 'reservation-producer-unsupported', active };
    for (const status of ['queued', 'in_progress', 'waiting', 'requested', 'pending']) {
      const rows = await api(`actions/workflows/${workflow}/runs?status=${status}&per_page=100`);
      if (!Array.isArray(rows.workflow_runs) || !Number.isSafeInteger(rows.total_count) || rows.total_count < 0
          || rows.total_count !== rows.workflow_runs.length || rows.workflow_runs.length >= 100)
        return { availability: 'unavailable', reason: 'reservation-history-incomplete', active };
      if (rows.workflow_runs.some(run => !positive(run.id) || run.status !== status || run.repository?.full_name?.toLowerCase() !== repository.toLowerCase()
          || run.path !== `.github/workflows/${workflow}`)) return { availability: 'unavailable', reason: 'reservation-source-identity-unavailable', active };
      if (rows.workflow_runs.length) return { availability: 'unavailable', reason: 'background-issue-binding-unavailable', active,
        observedRuns: rows.workflow_runs.filter(run => positive(run.id)).map(run => ({ id: Number(run.id), status, source: `https://github.com/${repository}/actions/runs/${run.id}` })) };
    }
  }
  return { availability: 'available', active, coverage: 'source dispatch receipts and installed background workflows; labels remain separate source policy' };
}

// api is repository-bound. The caller supplies authenticated identity, policy and
// installed-contract readers; all nested provider operations are forced read-only.
export async function collectIssueControlFacts({ api, repository, number, actor, readArtifact, readPolicy, readCapability, readAuthority, now = () => new Date(), excludeCommentId }) {
  if (typeof api !== 'function' || typeof readArtifact !== 'function' || typeof readPolicy !== 'function' || typeof readCapability !== 'function'
      || !validControlRepository(repository)
      || !Number.isSafeInteger(number) || number < 1) throw Error('Invalid issue-control reader');
  const read = (path, method = 'GET', body, optional = false) => {
    if (method !== 'GET' || body !== undefined) throw Error('Issue-control observation cannot write');
    return api(path, method, undefined, optional);
  };
  const metadata = await read('');
  if (!positive(metadata.id) || metadata.full_name?.toLowerCase() !== repository.toLowerCase() || !positive(metadata.owner?.id)
      || metadata.owner.type !== 'User') return { availability: 'unavailable', reason: 'repository-identity-unsupported' };
  if (!positive(actor?.id) || actor.type !== 'User' || Number(actor.id) !== Number(metadata.owner.id) || actor.login !== metadata.owner.login)
    return { availability: 'denied', reason: 'owner-identity-required' };
  const issue = await read(`issues/${number}`);
  if (!positive(issue.id) || issue.number !== number || issue.pull_request || !Array.isArray(issue.labels)) return { availability: 'denied', reason: 'ordinary-issue-required' };
  if (typeof metadata.default_branch !== 'string' || !metadata.default_branch || metadata.default_branch.length > 256 || /[\x00-\x1f\x7f]/.test(metadata.default_branch))
    return { availability: 'unavailable', reason: 'default-branch-unavailable' };
  const sourceRevision = (await read(`commits/${encodeURIComponent(metadata.default_branch)}`)).sha;
  if (!revision(sourceRevision)) return { availability: 'unavailable', reason: 'source-revision-unavailable' };
  const comments = await issueComments(read, number);
  const answers = ownerIntentComments(comments.filter(comment => comment.id !== excludeCommentId), metadata.owner.login);
  const inputDigest = taskDigest(issue, answers);
  let capability, policy, authority;
  try { authority = typeof readAuthority === 'function' ? await readAuthority({ api: read, repository, actor, metadata }) : null; } catch { authority = null; }
  const authorityKnown = authority?.actorId === actor.id && authority?.repositoryId === metadata.id;
  const writeAllowed = kind => !authorityKnown || typeof authority[kind] !== 'boolean' ? unavailable('write-authority-unavailable')
    : authority[kind] ? null : refusal('write-authority-denied');
  try { capability = await readCapability({ api: read, repository, sourceRevision }); } catch { capability = null; }
  try { policy = await readPolicy({ api: read, repository, sourceRevision, capability }); } catch { policy = null; }
  const supported = capability?.version === 1 && hash(capability.digest) && Array.isArray(capability.stages);
  const policyKnown = typeof policy?.automationEnabled === 'boolean' && hash(policy?.digest);
  let reservation = { availability: 'unavailable', reason: 'installed-contract-unsupported', active: [] };
  if (supported) try { reservation = await reservations(read, repository, metadata.owner.login, issue, comments, capability, readArtifact); }
  catch { reservation = { availability: 'unavailable', reason: 'reservation-evidence-unavailable', active: [] }; }
  const actions = { comment: supported ? writeAllowed('commentWrite') ?? { eligible: true, availability: 'available' } : refusal('installed-contract-unsupported', 'unsupported') };
  for (const stage of ['refine', 'propose']) {
    if (!supported || !capability.stages.includes(stage)) { actions[stage] = refusal('stage-contract-unsupported', 'unsupported'); continue; }
    if (writeAllowed('dispatchWrite')) { actions[stage] = writeAllowed('dispatchWrite'); continue; }
    if (!policyKnown) { actions[stage] = unavailable('policy-unavailable'); continue; }
    if (!policy.automationEnabled) { actions[stage] = refusal('automation-disabled'); continue; }
    const route = routeIssue({ issue, inputs: { issue: String(number), stage } }, actor.login, metadata.owner.login, 'workflow_dispatch', comments);
    if (!route.run || !eligibleIssueAuthor(issue, metadata.owner.login, stage)) { actions[stage] = refusal(route.reason ?? 'issue-author-not-admitted'); continue; }
    if (reservation.availability !== 'available') { actions[stage] = unavailable(reservation.reason); continue; }
    if (reservation.active.length) { actions[stage] = refusal('authenticated-source-reservation'); continue; }
    try {
      if (stage === 'refine' || issue.user.login !== metadata.owner.login)
        await collectTriageAdmission({ api: read, repository, owner: metadata.owner.login, issue, comments, sourceRevision, readArtifact });
      if (stage === 'propose') await collectProposalAdmission({ api: read, repository, owner: metadata.owner.login, issue, comments, sourceRevision, taskDigest: inputDigest, readArtifact });
      actions[stage] = { eligible: true, availability: 'available' };
    } catch (error) { actions[stage] = error instanceof IssueAdmissionRefusal ? { ...refusal(error.reason, error.availability), message: error.message }
      : unavailable(stage === 'refine' ? 'triage-not-verified' : 'proposal-prerequisites-not-verified'); }
  }
  let question = { availability: 'none' };
  const pending = pendingStage(comments);
  if (pending) {
    try {
      const evidence = await loadStageReport(read, repository, pending.report, { owner: metadata.owner.login, issue: number }, readArtifact);
      const text = pendingQuestion(evidence.envelope.result.output?.handoff?.question);
      let inputFreshness = 'unavailable';
      if (sourceTime(pending.report.created_at) && answers.every(answer => sourceTime(answer.created_at))) {
        try { checkReplyInputs(evidence.request, issue, answers, pending.report, sourceRevision); inputFreshness = 'available'; }
        catch { inputFreshness = 'changed'; }
      }
      const unsupported = pending.worker || evidence.request.worker && evidence.request.worker !== evidence.request.stage || evidence.request.epic;
      if (!positive(pending.report.id) || !text || validateStageEnvelope(evidence.envelope, evidence.request).length || evidence.envelope.result.status !== 'blocked' || evidence.request.stage !== pending.stage)
        question = { availability: 'unavailable', reason: 'pending-question-not-verified' };
      else question = { availability: unsupported ? 'unsupported' : 'available', ...(unsupported ? { reason: 'pending-worker-kind-unsupported' } : {}), stage: pending.stage, text, commentId: pending.report.id, requestId: evidence.request.runId,
        sourceCreatedAt: sourceTime(pending.report.created_at) ? pending.report.created_at : null,
        sourceUpdatedAt: sourceTime(pending.report.updated_at) ? pending.report.updated_at : null,
        questionDigest: digest(text), grantDigest: digest(canonicalIssueIntent(evidence.request)),
        inputFreshness, waitCurrent: pendingReplyState(issue), current: inputFreshness === 'available' && pendingReplyState(issue),
        source: `https://github.com/${repository}/issues/${number}#issuecomment-${pending.report.id}`, request: evidence.request };
    } catch { question = { availability: 'unavailable', reason: 'pending-question-not-verified' }; }
  }
  actions.continue = !supported ? refusal('installed-contract-unsupported', 'unsupported') : writeAllowed('commentWrite') ? writeAllowed('commentWrite') : !policyKnown ? unavailable('policy-unavailable')
    : !policy.automationEnabled ? refusal('automation-disabled') : question.availability !== 'available' ? unavailable('pending-question-not-verified')
      : question.inputFreshness === 'unavailable' ? unavailable('pending-question-inputs-unavailable')
      : !question.waitCurrent ? refusal('source-wait-not-current') : !question.current ? refusal('pending-question-inputs-changed') : reservation.availability !== 'available' ? unavailable(reservation.reason)
        : reservation.active.length ? refusal('authenticated-source-reservation') : { eligible: true, availability: 'available' };
  return { availability: 'available', observedAt: now().toISOString(), repository: { id: Number(metadata.id), name: repository },
    issue: { id: Number(issue.id), number, state: issue.state, updatedAt: issue.updated_at ?? null }, actor: { id: Number(actor.id), login: actor.login },
    sourceRevision, defaultBranch: metadata.default_branch, inputDigest, capability, policy, authority: { availability: authorityKnown ? 'available' : 'unavailable',
      commentWrite: authorityKnown && typeof authority.commentWrite === 'boolean' ? authority.commentWrite : null,
      dispatchWrite: authorityKnown && typeof authority.dispatchWrite === 'boolean' ? authority.dispatchWrite : null }, reservation, question, actions };
}
