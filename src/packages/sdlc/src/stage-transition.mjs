import { readActionsJson } from './actions-artifact.mjs';
import { loadDispatch, checkDispatchClaim, stagePath, issueComments } from './stage-dispatch.mjs';
import { validateStageEnvelope } from './host-contract.mjs';
import { assessDecomposition } from './epic.mjs';

// Explicit dispatch also works when GitHub suppresses follow-up token events.
// This is a wake-up only; the router rechecks the completed run and owner intent.
export async function signalRefinementContinuation(api, request, envelope) {
  if (request.stage !== 'refine' || !request.dispatch || request.autoImplement !== true || envelope.result?.status !== 'passed' || envelope.result?.gate !== 'ready') return false;
  if (validateStageEnvelope(envelope, request).length) throw Error('Invalid refinement result');
  if (envelope.result.output?.estimate !== undefined && assessDecomposition(envelope.result.output).status === 'planned') return false;
  const repository = await api('');
  await api('actions/workflows/lighthouse-sdlc-router.yml/dispatches', 'POST', { ref: repository.default_branch, inputs: { issue: String(request.issue), stage: 'implement', after_run: String(request.workflowRunId) } });
  return true;
}

// Signal only after publication and cleanup; the router authenticates the completed run.
export async function signalProductGap(api, request, envelope) {
  if (!request.dispatch || request.productAlignment || !request.productChangeEnabled || !['triage', 'refine', 'propose', 'implement'].includes(request.stage) || envelope.result?.status !== 'blocked' || !envelope.result.output?.productGap) return false;
  if (validateStageEnvelope(envelope, request).length) throw Error('Invalid product prerequisite result');
  const repository = await api('');
  await api('actions/workflows/lighthouse-sdlc-router.yml/dispatches', 'POST', { ref: repository.default_branch, inputs: { issue: String(request.issue), stage: request.stage, workflow: 'product-change', after_run: String(request.workflowRunId) } });
  return true;
}

export async function signalProductApplyContinuation(api, issue, runId, checkpoint) {
  if (!checkpoint.parent) return false;
  const repository = await api('');
  await api('actions/workflows/lighthouse-sdlc-router.yml/dispatches', 'POST', { ref: repository.default_branch, inputs: { issue: String(issue), stage: checkpoint.parent.stage, workflow: 'resume-product', after_run: String(runId) } });
  return true;
}

export async function signalProductAlignment(api, request, envelope) {
  if (request.worker !== 'product-change' || !request.dispatch || !request.productParent || request.productParent.pullRequest || request.productParent.review || request.replyTo || envelope.result?.status !== 'passed' || envelope.result.output?.productChange?.outcome !== 'aligned') return false;
  if (validateStageEnvelope(envelope, request).length) throw Error('Invalid product alignment result');
  const repository = await api('');
  await api('actions/workflows/lighthouse-sdlc-router.yml/dispatches', 'POST', { ref: repository.default_branch, inputs: { issue: String(request.issue), stage: request.productParent.stage, workflow: 'resume-aligned', after_run: String(request.workflowRunId) } });
  return true;
}

// The completed execution is an observation. Its retained owner request grants the handoff.
export async function refinementAfterRun(api, repository, owner, event, readArtifact = readActionsJson) {
  if (event.action !== 'completed' || !Number.isSafeInteger(event.workflow_run?.id)) return null;
  const run = await api(`actions/runs/${event.workflow_run.id}`);
  if (run.path !== stagePath('refine') || run.status !== 'completed' || run.conclusion !== 'success' || run.head_sha !== event.workflow_run.head_sha) return null;
  const artifacts = await api(`actions/runs/${run.id}/artifacts?per_page=100`);
  if (artifacts.total_count > 100) throw Error('Refinement artifacts exceed bounds');
  const inputs = artifacts.artifacts.filter(a => new RegExp(`^lighthouse-input-[1-9][0-9]*-${run.run_attempt}$`).test(a.name) && !a.expired);
  if (inputs.length !== 1) return null; // Duplicate/no-op executions have no stage input.
  const request = await readArtifact(api, repository, run.id, inputs[0].name, 'request.json');
  if (request.stage !== 'refine' || !request.dispatch || !request.autoImplement || String(request.workflowRunId) !== String(run.id)) return null;
  const origin = await loadDispatch(api, repository, owner, request.issue, request.dispatch.commentId, run, readArtifact);
  if (origin.request.stage !== 'refine' || origin.request.autoImplement !== true || origin.request.id !== request.dispatch.requestId || origin.request.sourceRevision !== (request.baseRevision ?? request.sourceRevision) || origin.request.workflowRevision !== request.workflowRevision || JSON.stringify(origin.request.productResume) !== JSON.stringify(request.productResume)) throw Error('Refinement continuation identity mismatch');
  await checkDispatchClaim(api, repository, request.issue, request.dispatch, run.id);
  const envelope = await readArtifact(api, repository, run.id, `lighthouse-result-${request.issue}-${run.run_attempt}`, 'envelope.json');
  if (validateStageEnvelope(envelope, request).length) throw Error('Invalid refinement result');
  if (envelope.result.output?.estimate !== undefined && assessDecomposition(envelope.result.output).status === 'planned') return null;
  if (envelope.result.status !== 'passed' || envelope.result.gate !== 'ready') return null;
  const reports = await issueComments(api, request.issue);
  if (!reports.some(c => c.user?.login === 'github-actions[bot]' && c.user.type === 'Bot' && c.body.includes(`<!-- lighthouse-actions:${request.runId} -->`) && c.body.includes('<!-- lighthouse-stage:refine:passed -->'))) return null;
  return { run: true, stage: 'implement', issue: request.issue, predecessor: { runId: String(run.id), attempt: run.run_attempt }, ...(request.productResume ? { productResume: request.productResume } : {}), reason: 'Verified refinement completed; implementation requested by the installed policy.' };
}

// A completed worker can identify a prerequisite, but cannot authorize product work.
// The retained dispatch and published result bind the observation to the owner's request.
export async function productGapAfterRun(api, repository, owner, event, readArtifact = readActionsJson) {
  if (event.action !== 'completed' || !Number.isSafeInteger(event.workflow_run?.id)) return null;
  const run = await api(`actions/runs/${event.workflow_run.id}`);
  const directStage = ['triage', 'refine', 'propose', 'implement'].find(name => run.path === stagePath(name));
  const reviewWorker = run.path === stagePath('apply-review');
  if ((!directStage && !reviewWorker) || run.status !== 'completed' || run.conclusion !== 'success' || run.head_sha !== event.workflow_run.head_sha) return null;
  const artifacts = await api(`actions/runs/${run.id}/artifacts?per_page=100`);
  if (artifacts.total_count > 100) throw Error('Product prerequisite artifacts exceed bounds');
  const inputs = artifacts.artifacts.filter(a => new RegExp(`^lighthouse-(?:implement-)?input-[1-9][0-9]*-${run.run_attempt}$`).test(a.name) && !a.expired);
  if (inputs.length !== 1) return null;
  const request = await readArtifact(api, repository, run.id, inputs[0].name, 'request.json');
  const stage = request.stage;
  if ((!reviewWorker && stage !== directStage) || (reviewWorker && (!['propose', 'implement'].includes(stage) || request.worker !== 'apply-review')) || !request.dispatch || String(request.workflowRunId) !== String(run.id) || !reviewWorker && request.worker && request.worker !== stage || inputs[0].name !== `${stage === 'implement' ? 'lighthouse-implement-input-' : 'lighthouse-input-'}${request.issue}-${run.run_attempt}`) return null;
  const origin = await loadDispatch(api, repository, owner, request.issue, request.dispatch.commentId, run, readArtifact);
  if (origin.request.stage !== stage || origin.request.id !== request.dispatch.requestId || origin.request.sourceRevision !== (request.baseRevision ?? request.sourceRevision) || origin.request.workflowRevision !== request.workflowRevision || origin.request.taskDigest !== request.taskDigest) throw Error('Product prerequisite parent identity mismatch');
  await checkDispatchClaim(api, repository, request.issue, request.dispatch, run.id);
  const resultName = `${stage === 'implement' ? 'lighthouse-implement-result-' : 'lighthouse-result-'}${request.issue}-${run.run_attempt}`;
  const envelope = await readArtifact(api, repository, run.id, resultName, 'envelope.json');
  if (validateStageEnvelope(envelope, request).length) throw Error('Invalid product prerequisite result');
  if (envelope.result.status !== 'blocked' || !envelope.result.output?.productGap) return null;
  const reports = await issueComments(api, request.issue);
  const matches = reports.filter(c => c.user?.login === 'github-actions[bot]' && c.user.type === 'Bot' && c.body.includes(`<!-- lighthouse-actions:${request.runId} -->`) && c.body.includes(`<!-- lighthouse-stage:${stage}:blocked -->`));
  if (matches.length !== 1) return null;
  const proofs = [...matches[0].body.matchAll(/<!-- lighthouse-pr-state:(\{[^\n]*\}) -->/g)];
  if (proofs.length > 1) throw Error('Product prerequisite has ambiguous existing PR evidence');
  const proof = proofs.length ? JSON.parse(proofs[0][1]) : null;
  if (proof && (proof.run !== run.id || proof.complete !== false)) throw Error('Product prerequisite PR evidence does not match the blocked parent');
  const review = request.implementationReview ?? request.proposalReview;
  if (proof && review && proof.pr !== review.number) throw Error('Product prerequisite references a different issue PR');
  let reviewEvidence;
  if (review) {
    const { reviewThread } = await import('./proposal-review.mjs');
    const { digest } = await import('./host-contract.mjs');
    const relevant = rows => rows.filter(row => !/^\/product-change (?:approve|request-changes|answer) [a-z0-9]+(?:-[a-z0-9]+)* [a-f0-9]{64}(?:\n|$)/.test((row.body ?? '').trim()));
    if (!Array.isArray(review.thread) || !/^[a-f0-9]{64}$/.test(review.feedbackDigest ?? '') || !/^[a-f0-9]{64}$/.test(review.threadDigest ?? '') || digest(JSON.stringify(review.thread)) !== review.threadDigest) throw Error('Parent PR review evidence is invalid');
    const currentFeedback = await api(review.path);
    const currentThread = await reviewThread(api, review.number, owner);
    const threadDigest = digest(JSON.stringify(relevant(review.thread)));
    if (digest(JSON.stringify(currentFeedback)) !== review.feedbackDigest || digest(JSON.stringify(relevant(currentThread))) !== threadDigest) throw Error('Parent PR feedback changed');
    reviewEvidence = { number: review.number, path: review.path, feedbackDigest: review.feedbackDigest, threadDigest };
  }
  let pullRequest;
  if (proof || review) {
    const number = proof?.pr ?? review.number, head = proof?.head ?? review.head;
    const pr = await api(`pulls/${number}`);
    if (!Number.isSafeInteger(number) || number < 1 || !/^[a-f0-9]{40}$/.test(head ?? '') || pr.number !== number || pr.state !== 'open' || pr.merged || pr.user?.login !== 'github-actions[bot]' || pr.user.type !== 'Bot' || pr.head?.repo?.full_name !== repository || pr.base?.repo?.full_name !== repository || !new RegExp(`^lighthouse/(?:implement|propose)-${request.issue}-[a-f0-9]{12}$`).test(pr.head.ref)) throw Error('Existing issue PR is not an eligible parent');
    pullRequest = { number, head, branch: pr.head.ref };
  }
  return { issue: request.issue, stage, predecessor: { runId: String(run.id), attempt: run.run_attempt }, gap: envelope.result.output.productGap, sourceRevision: request.sourceRevision, baseRevision: request.baseRevision ?? request.sourceRevision, taskDigest: request.taskDigest, autoImplement: request.autoImplement === true, ...(pullRequest ? { pullRequest } : {}), ...(reviewEvidence ? { review: reviewEvidence } : {}) };
}

// Recheck the original parent and, when present, the authenticated answer to a
// product question. The answer changes context; it does not approve product intent.
export async function verifyProductParent(api, repository, owner, parent, issue, reports, currentBase, readArtifact = readActionsJson) {
  const { feedback, ...original } = parent;
  const parentRun = await api(`actions/runs/${original.predecessor.runId}`);
  const observed = await productGapAfterRun(api, repository, owner, { action: 'completed', workflow_run: { id: parentRun.id, head_sha: parentRun.head_sha } }, readArtifact);
  if (JSON.stringify(observed) !== JSON.stringify(original) || currentBase !== original.baseRevision) throw Error('Product prerequisite parent or base changed');
  let expectedDigest = original.taskDigest;
  if (feedback) {
    const run = await api(`actions/runs/${feedback.runId}`);
    if (run.path !== stagePath('product-change') || run.status !== 'completed' || run.conclusion !== 'success' || run.run_attempt !== feedback.attempt) throw Error('Product answer execution is unavailable');
    const snapshot = await readArtifact(api, repository, run.id, `lighthouse-input-${issue.number}-${run.run_attempt}`, 'request.json');
    const envelope = await readArtifact(api, repository, run.id, `lighthouse-result-${issue.number}-${run.run_attempt}`, 'envelope.json');
    if (!snapshot.dispatch || snapshot.issue !== issue.number || String(snapshot.workflowRunId) !== String(run.id) || snapshot.taskDigest !== feedback.taskDigest || snapshot.replyTo !== feedback.replyTo || snapshot.commentId !== feedback.commentId || JSON.stringify(snapshot.productParent) !== JSON.stringify(original) || validateStageEnvelope(envelope, snapshot).length || envelope.result.status !== 'passed' || envelope.result.output?.productChange?.outcome !== 'candidate') throw Error('Product answer execution does not bind the parent and candidate');
    const origin = await loadDispatch(api, repository, owner, issue.number, snapshot.dispatch.commentId, run, readArtifact);
    await checkDispatchClaim(api, repository, issue.number, snapshot.dispatch, run.id);
    const answer = origin.request.event?.comment;
    if (origin.request.worker !== 'product-change' || origin.request.id !== snapshot.dispatch.requestId || origin.request.taskDigest !== snapshot.taskDigest || origin.request.productFeedback?.action !== 'answer' || Number(origin.request.productFeedback.sourceCommentId) !== feedback.commentId || answer?.id !== feedback.commentId || answer.user?.login !== owner || answer.user?.type !== 'User' || !reports.some(c => c.id === feedback.commentId && c.user?.login === owner && c.body === answer.body)) throw Error('Product answer is not the authenticated owner reply');
    const priorReports = reports.filter(c => c.user?.login === 'github-actions[bot]' && c.user.type === 'Bot' && c.body.includes(`<!-- lighthouse-actions:${feedback.replyTo} -->`) && c.body.includes('<!-- lighthouse-question -->'));
    if (priorReports.length !== 1) throw Error('Product question evidence is unavailable or ambiguous');
    const prior = priorReports[0];
    const priorRunId = prior?.body.match(/\[Workflow run\]\(https:\/\/github\.com\/[^/]+\/[^/]+\/actions\/runs\/(\d+)\)/)?.[1];
    if (!priorRunId) throw Error('Product question evidence is unavailable');
    const priorRun = await api(`actions/runs/${priorRunId}`);
    const priorSnapshot = await readArtifact(api, repository, priorRun.id, `lighthouse-input-${issue.number}-${priorRun.run_attempt}`, 'request.json');
    const priorEnvelope = await readArtifact(api, repository, priorRun.id, `lighthouse-result-${issue.number}-${priorRun.run_attempt}`, 'envelope.json');
    if (priorRun.path !== stagePath('product-change') || priorRun.status !== 'completed' || priorRun.conclusion !== 'success' || priorSnapshot.runId !== feedback.replyTo || String(priorSnapshot.workflowRunId) !== String(priorRun.id) || priorSnapshot.issue !== issue.number || JSON.stringify(priorSnapshot.productParent) !== JSON.stringify(original) || validateStageEnvelope(priorEnvelope, priorSnapshot).length || priorEnvelope.result.status !== 'blocked' || priorEnvelope.result.output?.productChange?.question !== snapshot.answerHistory?.at(-1)?.question || snapshot.answerHistory?.at(-1)?.answer?.body !== answer.body) throw Error('Product answer no longer matches the pending question');
    const priorOrigin = await loadDispatch(api, repository, owner, issue.number, priorSnapshot.dispatch.commentId, priorRun, readArtifact);
    if (priorOrigin.request.id !== priorSnapshot.dispatch.requestId || priorOrigin.request.worker !== 'product-change' || !(priorOrigin.request.productParent || priorOrigin.request.productFeedback || priorOrigin.request.productReview?.parent)) throw Error('Product question dispatch changed');
    await checkDispatchClaim(api, repository, issue.number, priorSnapshot.dispatch, priorRun.id);
    if (reports.filter(c => c.user?.login === 'github-actions[bot]' && c.user.type === 'Bot' && c.body.includes(`<!-- lighthouse-actions:${snapshot.runId} -->`) && c.body.includes(`<!-- lighthouse-stage:${snapshot.stage}:passed -->`)).length !== 1) throw Error('Product answer publication is unavailable or ambiguous');
    expectedDigest = feedback.taskDigest;
  }
  const { createHash } = await import('node:crypto');
  const answers = reports.filter(c => c.user?.login === owner && !c.body.includes('<!-- lighthouse-run:') && !c.body.includes('<!-- lighthouse-actions:'));
  const intent = createHash('sha256').update(JSON.stringify({ title: issue.title, body: issue.body, comments: answers.map(c => ({ id: c.id, body: c.body, updated_at: c.updated_at })) })).digest('hex');
  if (intent !== expectedDigest) throw Error('Product parent owner intent changed');
  return true;
}

export async function productAlignmentAfterRun(api, repository, owner, event, readArtifact = readActionsJson) {
  if (event.action !== 'completed' || !Number.isSafeInteger(event.workflow_run?.id)) return null;
  const run = await api(`actions/runs/${event.workflow_run.id}`);
  if (run.path !== stagePath('product-change') || run.status !== 'completed' || run.conclusion !== 'success' || run.head_sha !== event.workflow_run.head_sha) return null;
  const artifacts = await api(`actions/runs/${run.id}/artifacts?per_page=100`);
  if (artifacts.total_count > 100) throw Error('Product alignment artifacts exceed bounds');
  const inputs = artifacts.artifacts.filter(a => /^lighthouse-input-[1-9][0-9]*-[1-9][0-9]*$/.test(a.name) && a.name.endsWith(`-${run.run_attempt}`) && !a.expired);
  if (inputs.length !== 1) return null;
  const snapshot = await readArtifact(api, repository, run.id, inputs[0].name, 'request.json');
  if (snapshot.worker !== 'product-change' || !snapshot.dispatch || !snapshot.productParent || snapshot.replyTo || inputs[0].name !== `lighthouse-input-${snapshot.issue}-${run.run_attempt}` || String(snapshot.workflowRunId) !== String(run.id)) return null;
  const envelope = await readArtifact(api, repository, run.id, `lighthouse-result-${snapshot.issue}-${run.run_attempt}`, 'envelope.json');
  if (validateStageEnvelope(envelope, snapshot).length) throw Error('Invalid product alignment result');
  if (envelope.result.status !== 'passed' || envelope.result.output?.productChange?.outcome !== 'aligned' || envelope.result.output.productChange.entry !== 'parent-handoff') return null;
  const origin = await loadDispatch(api, repository, owner, snapshot.issue, snapshot.dispatch.commentId, run, readArtifact);
  if (origin.request.worker !== 'product-change' || origin.request.id !== snapshot.dispatch.requestId || origin.request.stage !== snapshot.stage || origin.request.sourceRevision !== snapshot.sourceRevision || origin.request.workflowRevision !== snapshot.workflowRevision || JSON.stringify(origin.request.productParent) !== JSON.stringify(snapshot.productParent) || origin.request.taskDigest !== snapshot.taskDigest) throw Error('Product alignment authority changed');
  await checkDispatchClaim(api, repository, snapshot.issue, snapshot.dispatch, run.id);
  const parent = snapshot.productParent;
  if (parent.pullRequest || parent.review) return null;
  const reports = await issueComments(api, snapshot.issue);
  if (reports.filter(c => c.user?.login === 'github-actions[bot]' && c.user.type === 'Bot' && c.body.includes(`<!-- lighthouse-actions:${snapshot.runId} -->`) && c.body.includes(`<!-- lighthouse-stage:${snapshot.stage}:passed -->`)).length !== 1) throw Error('Product alignment publication is unavailable or ambiguous');
  const repo = await api(''), baseRevision = (await api(`commits/${encodeURIComponent(repo.default_branch)}`)).sha, issue = await api(`issues/${snapshot.issue}`);
  await verifyProductParent(api, repository, owner, parent, issue, reports, baseRevision, readArtifact);
  if (issue.state !== 'open' || issue.labels?.some(l => ['future', 'needs-info', 'waiting-review', 'human-working', 'agent-working'].includes(l.name))) throw Error('Product alignment continuation is paused');
  return { issue: snapshot.issue, stage: parent.stage, parent, alignmentRun: { runId: String(run.id), attempt: run.run_attempt }, baseRevision };
}

// A product apply is usable by a parent only when its original approval, provider
// result, published receipt, current PR head and retained parent still agree.
export async function productApplyAfterRun(api, repository, owner, event, readArtifact = readActionsJson) {
  if (event.action !== 'completed' || !Number.isSafeInteger(event.workflow_run?.id)) return null;
  const run = await api(`actions/runs/${event.workflow_run.id}`);
  if (run.path !== stagePath('apply-product-change') || run.status !== 'completed' || run.conclusion !== 'success' || run.head_sha !== event.workflow_run.head_sha) return null;
  const artifacts = await api(`actions/runs/${run.id}/artifacts?per_page=100`);
  if (artifacts.total_count > 100) throw Error('Product apply artifacts exceed bounds');
  const inputs = artifacts.artifacts.filter(a => new RegExp(`^lighthouse-product-apply-input-[1-9][0-9]*-${run.run_attempt}$`).test(a.name) && !a.expired);
  if (inputs.length !== 1) return null;
  const input = await readArtifact(api, repository, run.id, inputs[0].name, 'product-apply.json');
  if (!input.checkpoint?.parent || input.repository !== repository || input.owner !== owner || !input.dispatch || input.issue !== input.checkpoint.parent.issue) return null;
  const dispatch = await loadDispatch(api, repository, owner, input.issue, input.dispatch.commentId, run, readArtifact);
  if (dispatch.request.worker !== 'apply-product-change' || dispatch.request.id !== input.dispatch.requestId || dispatch.request.productApproval?.reviewKey !== input.approval?.reviewKey || dispatch.request.productApproval?.head !== input.head || input.binding?.key !== input.approval?.reviewKey) throw Error('Product apply dispatch or approval identity changed');
  await checkDispatchClaim(api, repository, input.issue, input.dispatch, run.id);
  const output = await readArtifact(api, repository, run.id, `lighthouse-product-apply-proof-${input.issue}-${run.run_attempt}`, 'apply-proof.json');
  if (output.head !== input.head || output.receipt?.headBefore !== input.head || output.receipt?.validated !== true || output.receipt?.proposalDigest !== input.checkpoint.proposalDigest || output.receipt?.baselineDigest !== input.checkpoint.baselineDigest || output.receipt?.resultingModelDigest !== output.resultingModelDigest) throw Error('Product apply provider result does not match its approval');
  const pr = await api(`pulls/${input.pullRequest}`);
  if (pr.state !== 'open' || pr.merged || !pr.draft || pr.user?.login !== 'github-actions[bot]' || pr.user?.type !== 'Bot' || pr.head?.repo?.full_name !== repository || pr.base?.repo?.full_name !== repository) throw Error('Applied product PR is no longer eligible for continuation');
  const matches = [...(pr.body ?? '').matchAll(/<!-- lighthouse-product-change(?:-checkpoint|:checkpoint):(\{[^\n]*\}) -->/g)];
  if (matches.length !== 1) throw Error('Applied product checkpoint is unavailable or ambiguous');
  const checkpoint = JSON.parse(matches[0][1]);
  const { validateProductCheckpoint, productReviewBinding } = await import('./product-change.mjs');
  const { createHash } = await import('node:crypto');
  const hash = value => createHash('sha256').update(value).digest('hex');
  const { key, ...bindingFields } = input.binding;
  if (validateProductCheckpoint(checkpoint).length || checkpoint.state !== 'applied' || checkpoint.identity.head !== pr.head.sha || JSON.stringify(checkpoint.parent) !== JSON.stringify(input.checkpoint.parent) || input.binding.parentDigest !== hash(JSON.stringify(checkpoint.parent)) || productReviewBinding(bindingFields).key !== key) throw Error('Applied product checkpoint or parent binding changed');
  const reports = await issueComments(api, input.issue);
  const receipts = reports.filter(c => c.user?.login === 'github-actions[bot]' && c.user.type === 'Bot').flatMap(c => [...(c.body ?? '').matchAll(/<!-- lighthouse-product-apply:(\{[^\n]*\}) -->/g)].map(m => JSON.parse(m[1]))).filter(r => r.intentId === output.receipt.intentId);
  if (receipts.length !== 1 || receipts[0].headBefore !== input.head || receipts[0].headAfter !== pr.head.sha || receipts[0].resultingModelDigest !== output.resultingModelDigest || !checkpoint.effectIds.includes(`apply:${receipts[0].intentId}:${pr.head.sha}`)) throw Error('Applied product publication is missing, stale or ambiguous');
  const info = await api(''), currentBase = (await api(`commits/${info.default_branch}`)).sha;
  const issue = await api(`issues/${input.issue}`);
  await verifyProductParent(api, repository, owner, checkpoint.parent, issue, reports, currentBase, readArtifact);
  if (issue.state !== 'open' || issue.labels?.some(l => ['future', 'human-working', 'agent-working'].includes(l.name)) || pr.base.ref !== info.default_branch) throw Error('Product parent authorization, base or issue changed before continuation');
  return { issue: input.issue, stage: checkpoint.parent.stage, parent: checkpoint.parent, applyRun: { runId: String(run.id), attempt: run.run_attempt }, pullRequest: pr.number, head: pr.head.sha, branch: pr.head.ref, baseRevision: currentBase, receiptIntent: receipts[0].intentId };
}
