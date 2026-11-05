import { readActionsJson } from './actions-artifact.mjs';
import { createHash } from 'node:crypto';
import { assertIndependentReview, assertRegression, regressionPlan, unattendedDigest, validateUnattendedPolicy } from './unattended.mjs';
import { validateCheckReceipt, withinScope } from './implementation.mjs';

// The caller first authenticates priorIntegration through readIntegrationEvidence.
export async function readUnattendedPlanningReview(api, completion, priorIntegration, readArtifact = readActionsJson) {
  const authorization = priorIntegration?.receipt?.authorization?.unattended;
  if (!authorization || !['ff', 'hotfix'].includes(authorization.route) || !completion.merged) return null;
  const { repository, issue, pr, head, intent } = completion.binding;
  const runId = String(priorIntegration.workflow?.runId ?? ''), attempt = String(priorIntegration.workflow?.attempt ?? '');
  if (!/^[1-9]\d*$/.test(runId) || attempt !== '1' || authorization.owner !== repository.split('/')[0]) return null;
  try {
    const run = await api(`actions/runs/${runId}`);
    if (run.path !== '.github/workflows/lighthouse-sdlc-unattended.yml' || run.event !== 'workflow_dispatch' || run.status !== 'completed' || run.conclusion !== 'success' || run.actor?.login !== authorization.owner || run.triggering_actor?.login !== authorization.owner || run.repository?.full_name !== repository || run.run_attempt !== 1 || !/^[a-f0-9]{40}$/.test(run.head_sha ?? '')) return null;
    const root = unattendedDigest({ repository, issue, route: authorization.route, run: runId });
    const stageId = (sequence, stage, worker) => unattendedDigest({ runId: root, sequence, stage, worker });
    const name = `lighthouse-unattended-${runId}-${attempt}`;
    const read = file => readArtifact(api, repository, runId, name, file);
    const member = (id, file) => `${id}/tmp/lighthouse-${runId}-${attempt}/${file}`;
    const [report, candidate] = await Promise.all([read('report.json'), read('candidate.json')]);
    if (report.status !== 'passed' || report.published?.number !== pr || report.published?.head?.sha !== head || report.integrated?.sha !== completion.merge) return null;
    const round = report.planningRound === undefined ? 0 : report.planningRound;
    if (!Number.isSafeInteger(round) || round < 0 || round > 2) return null;
    if (authorization.route === 'hotfix') {
      if (round !== 0 || !Array.isArray(candidate) || candidate.length > 10 || !Array.isArray(report.evidence) || report.evidence.length > 64) return null;
      const triageId = stageId(1, 'triage', 'triage'), reviewId = stageId(2, 'integrate', 'independent-review'), redId = stageId(3, 'implement', 'implement');
      const [triageRequest, triage, producer, reviewRequest, review, reviewer, redRequest, redReceipt, redChanges, redRuntime, greenArtifact, file] = await Promise.all([
        read(member(triageId, 'request.json')), read(member(triageId, 'envelope.json')), read(member(triageId, 'runtime.json')),
        read(member(reviewId, 'request.json')), read(member(reviewId, 'envelope.json')), read(member(reviewId, 'runtime.json')),
        read(member(redId, 'request.json')), read(member(redId, 'checks.json')), read(member(redId, 'changes.json')), read(member(redId, 'runtime.json')),
        read('implementation-evidence.json'), api(`contents/.lighthouse/unattended.json?ref=${run.head_sha}`),
      ]);
      for (const [request, id, stage, worker] of [[triageRequest, triageId, 'triage', 'triage'], [reviewRequest, reviewId, 'integrate', 'independent-review'], [redRequest, redId, 'implement', 'implement']]) {
        if (request.repository !== repository || request.issue !== issue || request.runId !== id || request.stage !== stage || request.worker !== worker || request.sourceRevision !== run.head_sha || request.taskDigest !== intent || String(request.workflowRunId) !== runId || Number(request.attempt) !== 1) return null;
      }
      if (triage.result?.runId !== triageId || triage.result.stage !== 'triage' || triage.result.status !== 'passed' || [producer, reviewer, redRuntime].some(runtime => runtime.execution?.status !== 'passed')) return null;
      const refined = triage.result.output, plan = regressionPlan(refined.hotfix);
      const binding = unattendedDigest({ revision: run.head_sha, intent, policyDigest: authorization.policyDigest, purpose: 'plan', details: { refined, plan } });
      assertIndependentReview(review.result, binding, { model: producer.model, runId: triageId }, { model: reviewer.model, runId: reviewId });
      const grant = validateUnattendedPolicy(JSON.parse(Buffer.from(file.content, 'base64').toString()), 'hotfix');
      if (unattendedDigest(grant) !== authorization.policyDigest || unattendedDigest(plan.command) !== unattendedDigest(grant.hotfix.regressionCommand) || unattendedDigest(redRequest.implementation?.policy.paths) !== unattendedDigest(grant.hotfix.testPaths) || unattendedDigest(redRequest.implementation.policy.checks) !== unattendedDigest([...grant.hotfix.setupCommands, plan.command])) return null;
      if (redReceipt.schemaVersion !== 2 || !redReceipt.binding || redReceipt.serviceCleanup === false) return null;
      validateCheckReceipt(redReceipt, redRequest, redChanges);
      const reds = report.evidence.filter(item => item.kind === 'red');
      if (reds.length !== 1) return null;
      const red = reds[0], stripLogs = receipt => ({ ...receipt, checks: receipt.checks.map(({ log, ...check }) => check) });
      if (unattendedDigest(stripLogs(red.receipt)) !== unattendedDigest(stripLogs(redReceipt))) return null;
      const redCheck = assertRegression(red.receipt, plan, 'red');
      const hash = value => createHash('sha256').update(value).digest('hex');
      if (!grant.hotfix.failurePattern.some(pattern => redCheck.log.includes(pattern)) || hash(redCheck.log) !== redCheck.output?.logSha256) return null;
      const green = completion.implementationEvidence;
      if (green?.status !== 'passed' || green.producer?.repository !== repository || green.producer.runId !== runId || green.producer.attempt !== 1 || green.binding?.repository !== repository || green.binding.issue !== issue || green.binding.intent !== intent || green.binding.sourceRevision !== run.head_sha || green.publication?.pr !== pr || green.publication.head !== head || green.artifact?.name !== name || green.artifact.member !== 'implementation-evidence.json' || green.artifact.sha256 !== unattendedDigest(greenArtifact) || greenArtifact.unattended?.route !== 'hotfix' || greenArtifact.unattended.policyDigest !== authorization.policyDigest) return null;
      assertRegression(greenArtifact.receipt, plan, 'green');
      if (greenArtifact.publication?.tree !== green.publication.tree || greenArtifact.receipt.candidateTree !== green.publication.tree || redReceipt.candidateTree === green.publication.tree) return null;
      const greenCheck = green.checks.find(check => unattendedDigest(check.command) === unattendedDigest(plan.command));
      if (greenCheck?.status !== 'passed' || greenCheck.exitCode !== 0 || greenCheck.revision !== head) return null;
      const paths = Object.keys(red.tests ?? {}).sort();
      if (!paths.length || paths.length > 10 || paths.join('\n') !== redChanges.map(change => change.path).sort().join('\n')) return null;
      const frozenTests = [];
      for (const path of paths) {
        const expected = red.tests[path], before = redChanges.filter(change => change.path === path), after = candidate.filter(change => change.path === path);
        if (!withinScope(path, { paths: grant.hotfix.testPaths }) || !expected || typeof expected.content !== 'string' || !['100644', '100755'].includes(expected.mode) || before.length !== 1 || after.length !== 1 || [before[0], after[0]].some(value => value.content !== expected.content || value.mode !== expected.mode)) return null;
        frozenTests.push({ path, mode: expected.mode, sha256: hash(Buffer.from(expected.content, 'base64')) });
      }
      return { kind: 'hotfix', binding, runId, attempt, sourceRevision: run.head_sha, intent, policyDigest: authorization.policyDigest, details: { refined, plan }, result: review.result, triageRunId: triageId, reviewRunId: reviewId, verdict: 'accept', configuredModels: { producer: producer.model, reviewer: reviewer.model }, providerSettings: 'unverified', artifact: name, runUrl: `https://github.com/${repository}/actions/runs/${runId}`,
        regression: { red: { runId: redId, command: redCheck.command, exitCode: redCheck.exitCode, state: 'failed', assertion: plan.assertion, output: redCheck.output }, green: greenCheck, frozenTests } };
    }
    const refineId = stageId(1, 'refine', 'refine'), proposalId = stageId(2 + round * 2, 'propose', 'propose'), reviewId = stageId(3 + round * 2, 'integrate', 'independent-review');
    const [refineRequest, refinement, proposalRequest, proposal, producer, reviewRequest, review, reviewer] = await Promise.all([
      read(member(refineId, 'request.json')), read(member(refineId, 'envelope.json')),
      read(member(proposalId, 'request.json')), read(member(proposalId, 'envelope.json')), read(member(proposalId, 'runtime.json')),
      read(member(reviewId, 'request.json')), read(member(reviewId, 'envelope.json')), read(member(reviewId, 'runtime.json')),
    ]);
    for (const [request, id, stage, worker] of [[refineRequest, refineId, 'refine', 'refine'], [proposalRequest, proposalId, 'propose', 'propose'], [reviewRequest, reviewId, 'integrate', 'independent-review']]) {
      if (request.runId !== id || request.issue !== issue || request.stage !== stage || request.worker !== worker || request.sourceRevision !== run.head_sha) return null;
    }
    if (refinement.result?.runId !== refineId || refinement.result.stage !== 'refine' || refinement.result.status !== 'passed' || proposal.result?.runId !== proposalId || proposal.result.stage !== 'propose' || proposal.result.status !== 'passed' || producer.execution?.status !== 'passed' || reviewer.execution?.status !== 'passed') return null;
    const original = proposal.result.output?.files;
    if (!Array.isArray(original) || !original.length || original.length > 32 || !Array.isArray(candidate) || candidate.length > 512) return null;
    const metadataPath = `openspec/changes/issue-${issue}-proposal/.openspec.yaml`;
    const metadata = candidate.filter(file => file.path === metadataPath);
    const declarations = original.filter(file => file.path === metadataPath);
    if (metadata.length !== 1 || typeof metadata[0].content !== 'string' || metadata[0].content.length > 131072 || declarations.length > 1 ||
        !declarations.length && !original.some(file => file.path.startsWith(`openspec/changes/issue-${issue}-proposal/specs/`) && file.path.endsWith('/spec.md'))) return null;
    // prepareProposal appends provider metadata after the original model files.
    const files = [...original.filter(file => file.path !== metadataPath), { path: metadataPath, content: Buffer.from(metadata[0].content, 'base64').toString('utf8') }];
    const refined = refinement.result.output, plan = { files, refinement: refined };
    const binding = unattendedDigest({ revision: run.head_sha, intent, policyDigest: authorization.policyDigest, purpose: 'plan', details: { refined, plan } });
    assertIndependentReview(review.result, binding, { model: producer.model, runId: proposalId }, { model: reviewer.model, runId: reviewId });
    return { binding, runId, attempt, sourceRevision: run.head_sha, intent, policyDigest: authorization.policyDigest, details: { refined, plan }, result: review.result, proposalRunId: proposalId, reviewRunId: reviewId, verdict: 'accept', configuredModels: { producer: producer.model, reviewer: reviewer.model }, providerSettings: 'unverified', artifact: name, runUrl: `https://github.com/${repository}/actions/runs/${runId}` };
  } catch {
    // Missing, expired, malformed or unverifiable evidence never becomes a passed receipt.
    return null;
  }
}
