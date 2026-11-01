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
  if (origin.request.stage !== 'refine' || origin.request.autoImplement !== true || origin.request.id !== request.dispatch.requestId || origin.request.sourceRevision !== request.sourceRevision || origin.request.workflowRevision !== request.workflowRevision) throw Error('Refinement continuation identity mismatch');
  await checkDispatchClaim(api, repository, request.issue, request.dispatch, run.id);
  const envelope = await readArtifact(api, repository, run.id, `lighthouse-result-${request.issue}-${run.run_attempt}`, 'envelope.json');
  if (validateStageEnvelope(envelope, request).length) throw Error('Invalid refinement result');
  if (envelope.result.output?.estimate !== undefined && assessDecomposition(envelope.result.output).status === 'planned') return null;
  if (envelope.result.status !== 'passed' || envelope.result.gate !== 'ready') return null;
  const reports = await issueComments(api, request.issue);
  if (!reports.some(c => c.user?.login === 'github-actions[bot]' && c.user.type === 'Bot' && c.body.includes(`<!-- lighthouse-actions:${request.runId} -->`) && c.body.includes('<!-- lighthouse-stage:refine:passed -->'))) return null;
  return { run: true, stage: 'implement', issue: request.issue, predecessor: { runId: String(run.id), attempt: run.run_attempt }, reason: 'Verified refinement completed; implementation requested by the installed policy.' };
}
