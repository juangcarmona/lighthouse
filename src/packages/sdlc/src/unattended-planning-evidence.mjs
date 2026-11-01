import { readActionsJson } from './actions-artifact.mjs';
import { assertIndependentReview, unattendedDigest } from './unattended.mjs';

// The caller first authenticates priorIntegration through readIntegrationEvidence.
export async function readUnattendedPlanningReview(api, completion, priorIntegration, readArtifact = readActionsJson) {
  const authorization = priorIntegration?.receipt?.authorization?.unattended;
  if (!authorization || authorization.route !== 'ff' || !completion.merged) return null;
  const { repository, issue, pr, head, intent } = completion.binding;
  const runId = String(priorIntegration.workflow?.runId ?? ''), attempt = String(priorIntegration.workflow?.attempt ?? '');
  if (!/^[1-9]\d*$/.test(runId) || attempt !== '1' || authorization.owner !== repository.split('/')[0]) return null;
  try {
    const run = await api(`actions/runs/${runId}`);
    if (run.path !== '.github/workflows/lighthouse-sdlc-unattended.yml' || run.event !== 'workflow_dispatch' || run.status !== 'completed' || run.conclusion !== 'success' || run.actor?.login !== authorization.owner || run.triggering_actor?.login !== authorization.owner || run.repository?.full_name !== repository || run.run_attempt !== 1 || !/^[a-f0-9]{40}$/.test(run.head_sha ?? '')) return null;
    const root = unattendedDigest({ repository, issue, route: authorization.route, run: runId });
    const stageId = (sequence, stage, worker) => unattendedDigest({ runId: root, sequence, stage, worker });
    const refineId = stageId(1, 'refine', 'refine'), proposalId = stageId(2, 'propose', 'propose'), reviewId = stageId(3, 'integrate', 'independent-review');
    const name = `lighthouse-unattended-${runId}-${attempt}`;
    const read = file => readArtifact(api, repository, runId, name, file);
    const member = (id, file) => `${id}/tmp/lighthouse-${runId}-${attempt}/${file}`;
    const [report, candidate, refineRequest, refinement, proposalRequest, proposal, producer, reviewRequest, review, reviewer] = await Promise.all([
      read('report.json'), read('candidate.json'), read(member(refineId, 'request.json')), read(member(refineId, 'envelope.json')),
      read(member(proposalId, 'request.json')), read(member(proposalId, 'envelope.json')), read(member(proposalId, 'runtime.json')),
      read(member(reviewId, 'request.json')), read(member(reviewId, 'envelope.json')), read(member(reviewId, 'runtime.json')),
    ]);
    if (report.status !== 'passed' || report.published?.number !== pr || report.published?.head?.sha !== head || report.integrated?.sha !== completion.merge) return null;
    for (const [request, id, stage, worker] of [[refineRequest, refineId, 'refine', 'refine'], [proposalRequest, proposalId, 'propose', 'propose'], [reviewRequest, reviewId, 'integrate', 'independent-review']]) {
      if (request.runId !== id || request.issue !== issue || request.stage !== stage || request.worker !== worker || request.sourceRevision !== run.head_sha) return null;
    }
    if (refinement.result?.runId !== refineId || refinement.result.stage !== 'refine' || refinement.result.status !== 'passed' || proposal.result?.runId !== proposalId || proposal.result.stage !== 'propose' || proposal.result.status !== 'passed' || producer.execution?.status !== 'passed' || reviewer.execution?.status !== 'passed') return null;
    const original = proposal.result.output?.files;
    if (!Array.isArray(original) || !original.length || original.length > 32 || !Array.isArray(candidate) || candidate.length > 512) return null;
    const metadataPath = `openspec/changes/issue-${issue}-proposal/.openspec.yaml`;
    const metadata = candidate.filter(file => file.path === metadataPath);
    if (metadata.length !== 1 || typeof metadata[0].content !== 'string' || metadata[0].content.length > 131072 || original.filter(file => file.path === metadataPath).length !== 1) return null;
    const files = original.map(file => file.path === metadataPath ? { ...file, content: Buffer.from(metadata[0].content, 'base64').toString('utf8') } : file);
    const refined = refinement.result.output, plan = { files, refinement: refined };
    const binding = unattendedDigest({ revision: run.head_sha, intent, policyDigest: authorization.policyDigest, purpose: 'plan', details: { refined, plan } });
    assertIndependentReview(review.result, binding, { model: producer.model, runId: proposalId }, { model: reviewer.model, runId: reviewId });
    return { binding, runId, attempt, sourceRevision: run.head_sha, intent, policyDigest: authorization.policyDigest, details: { refined, plan }, result: review.result, proposalRunId: proposalId, reviewRunId: reviewId, verdict: 'accept', configuredModels: { producer: producer.model, reviewer: reviewer.model }, providerSettings: 'unverified', artifact: name, runUrl: `https://github.com/${repository}/actions/runs/${runId}` };
  } catch {
    // Missing, expired, malformed or unverifiable evidence never becomes a passed receipt.
    return null;
  }
}
