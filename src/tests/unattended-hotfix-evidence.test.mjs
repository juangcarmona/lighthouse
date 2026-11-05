import test from 'node:test';
import assert from 'node:assert/strict';
import { readUnattendedPlanningReview } from '../packages/sdlc/src/unattended-planning-evidence.mjs';
import { unattendedDigest, unattendedImplementationPolicy } from '../packages/sdlc/src/unattended.mjs';
import { commandEvidenceBinding, implementationEvidenceBundle, retainedCommandOutput } from '../packages/sdlc/src/implementation-evidence.mjs';
import { changesDigest } from '../packages/sdlc/src/implementation.mjs';
import { stageContext } from '../packages/sdlc/src/unattended-runtime.mjs';

function fixture() {
  const repository = 'owner/repo', issue = 395, runId = '123', attempt = '1', revision = 'a'.repeat(40), head = 'b'.repeat(40), merge = 'c'.repeat(40), intent = 'd'.repeat(64);
  const command = ['node', '--test', 'tests/regression.mjs'];
  const grant = { schemaVersion: 1, enabled: true, routes: ['hotfix'], paths: ['src/rule.mjs', 'tests/regression.mjs'], reviewerProfile: 'fast', allowFivePoint: false, merge: true, maxCorrections: 2, timeoutSeconds: 600,
    hotfix: { setupCommands: [], testPaths: ['tests/regression.mjs'], regressionCommand: command, failurePattern: ['ERR_ASSERTION'], modules: { feature: ['src/', 'tests/'] } } };
  const policyDigest = unattendedDigest(grant), root = unattendedDigest({ repository, issue, route: 'hotfix', run: runId });
  const id = (sequence, stage, worker) => unattendedDigest({ runId: root, sequence, stage, worker });
  const triage = id(1, 'triage', 'triage'), review = id(2, 'integrate', 'independent-review'), red = id(3, 'implement', 'implement'), green = id(4, 'implement', 'implement');
  const plan = { command, assertion: 'Expected inclusive boundary', rootCause: 'Strict comparison', estimatedProductionLines: 2, plannedFiles: ['src/rule.mjs', 'tests/regression.mjs'] };
  const refined = { eligibility: { points: 1 }, hotfix: plan };
  const binding = unattendedDigest({ revision, intent, policyDigest, purpose: 'plan', details: { refined, plan } });
  const result = stageContext({ stage: 'integrate', runId: review }, {}).contract.envelope.result;
  result.output.review = { binding, verdict: 'accept', findings: [] };
  const request = (stageId, stage, worker) => ({ repository, runId: stageId, issue, stage, worker, sourceRevision: revision, taskDigest: intent, workflowRunId: runId, attempt: 1 });
  const base = { policy: { scope: 'Repair the isolated boundary', paths: grant.paths, reviewRequired: false, checks: [['node', 'verify.mjs']], verification: { paths: grant.hotfix.testPaths, corrections: {} } }, proposal: { root: 'openspec/changes/issue-395-proposal' } };
  const redRequest = { ...request(red, 'implement', 'implement'), implementation: { ...base, policy: { ...base.policy, paths: grant.hotfix.testPaths, checks: [command] } } };
  const greenRequest = { ...request(green, 'implement', 'implement'), implementation: { ...base, policy: unattendedImplementationPolicy(base.policy, grant, issue, 'hotfix') } };
  const regression = { content: Buffer.from('assert.equal(eligible(2), true);\n').toString('base64'), mode: '100644' };
  const changes = [{ path: 'tests/regression.mjs', ...regression }], log = 'ERR_ASSERTION: Expected inclusive boundary\n';
  const receipt = (input, values, tree, exitCode) => ({ schemaVersion: 2, binding: commandEvidenceBinding(input), runId: input.runId, sourceRevision: revision, changesDigest: changesDigest(values), candidateTree: tree, observedAt: '2026-11-05T00:00:00Z', serviceCleanup: true,
    checks: input.implementation.policy.checks.map(argv => ({ command: argv, exitCode, execution: { status: exitCode ? 'failed' : 'passed', exitCode, signal: null }, output: retainedCommandOutput(exitCode ? log : 'Passed\n') })) });
  const redReceipt = receipt(redRequest, changes, 'e'.repeat(40), 1), greenReceipt = receipt(greenRequest, changes, 'f'.repeat(40), 0);
  const artifact = { ...implementationEvidenceBundle(greenRequest, greenReceipt, changes, { pr: 23, head, tree: greenReceipt.candidateTree }), unattended: { route: 'hotfix', policyDigest } };
  const observed = greenReceipt.checks.map((check, index) => ({ ...check, evidenceId: `implementation:123:1:fixture:${index}`, revision: head, status: 'passed', state: 'passed', url: `https://github.com/${repository}/actions/runs/123/attempts/1` }));
  const completion = { merged: true, merge, binding: { repository, issue, pr: 23, head, intent }, implementationEvidence: { status: 'passed', binding: artifact.binding, publication: artifact.publication, producer: { repository, runId, attempt: 1 }, artifact: { name: 'lighthouse-unattended-123-1', member: 'implementation-evidence.json', sha256: unattendedDigest(artifact) }, checks: observed } };
  const prior = { workflow: { runId, attempt }, receipt: { authorization: { unattended: { owner: 'owner', route: 'hotfix', policyDigest } } } };
  const run = { path: '.github/workflows/lighthouse-sdlc-unattended.yml', event: 'workflow_dispatch', status: 'completed', conclusion: 'success', actor: { login: 'owner' }, triggering_actor: { login: 'owner' }, repository: { full_name: repository }, run_attempt: 1, head_sha: revision };
  const member = (stageId, name) => `${stageId}/tmp/lighthouse-${runId}-1/${name}`;
  const report = { status: 'passed', planningRound: 0, published: { number: 23, head: { sha: head } }, integrated: { sha: merge }, evidence: [{ kind: 'red', receipt: { ...redReceipt, checks: redReceipt.checks.map(check => ({ ...check, log })) }, tests: { 'tests/regression.mjs': regression } }] };
  const files = new Map([
    ['report.json', report], ['candidate.json', changes], ['implementation-evidence.json', artifact],
    [member(triage, 'request.json'), request(triage, 'triage', 'triage')],
    [member(triage, 'envelope.json'), { result: { runId: triage, stage: 'triage', status: 'passed', output: refined } }],
    [member(triage, 'runtime.json'), { model: 'openai/producer', execution: { status: 'passed' } }],
    [member(review, 'request.json'), request(review, 'integrate', 'independent-review')],
    [member(review, 'envelope.json'), { result }],
    [member(review, 'runtime.json'), { model: 'openai/reviewer', execution: { status: 'passed' } }],
    [member(red, 'request.json'), redRequest], [member(red, 'checks.json'), redReceipt], [member(red, 'changes.json'), changes],
    [member(red, 'runtime.json'), { model: 'openai/producer', execution: { status: 'passed' } }],
  ]);
  const api = async path => path.startsWith('contents/.lighthouse/unattended.json?') ? { content: Buffer.from(JSON.stringify(grant)).toString('base64') } : run;
  const read = async (_api, repo, value, name, file) => { assert.equal(repo, repository); assert.equal(value, runId); assert.equal(name, 'lighthouse-unattended-123-1'); if (!files.has(file)) throw Error('Missing artifact'); return structuredClone(files.get(file)); };
  return { completion, prior, run, files, api, read, member, review, triage, red, report, binding, grant };
}

test('compact hotfix plan review retains expected RED failure, authenticated GREEN and unchanged regression bytes', async () => {
  const f = fixture(), evidence = await readUnattendedPlanningReview(f.api, f.completion, f.prior, f.read);
  assert.equal(evidence?.verdict, 'accept');
  assert.equal(evidence.kind, 'hotfix'); assert.equal(evidence.binding, f.binding);
  assert.equal(evidence.regression.red.exitCode, 1); assert.equal(evidence.regression.red.state, 'failed');
  assert.equal(evidence.regression.green.exitCode, 0); assert.equal(evidence.regression.green.status, 'passed');
  assert.equal(evidence.regression.frozenTests.length, 1);
});

test('hotfix review cannot promote missing, stale, altered or mismatched regression evidence', async t => {
  const cases = {
    'wrong owner': f => { f.run.actor.login = 'intruder'; },
    'wrong attempt': f => { f.run.run_attempt = 2; },
    'changed intent': f => { f.completion.binding.intent = '1'.repeat(64); },
    'changed source': f => { f.run.head_sha = '1'.repeat(40); },
    'changed grant': f => { f.grant.hotfix.regressionCommand = ['node', 'other.mjs']; },
    'same reviewer': f => { f.files.get(f.member(f.review, 'runtime.json')).model = 'openai/producer'; },
    'missing RED': f => { f.files.delete(f.member(f.red, 'checks.json')); },
    'unavailable GREEN': f => { f.completion.implementationEvidence.status = 'unavailable'; },
    'another GREEN run': f => { f.completion.implementationEvidence.producer.runId = '124'; },
    'changed GREEN member': f => { f.files.get('implementation-evidence.json').receipt.checks[0].exitCode = 1; },
    'changed frozen bytes': f => { f.files.get('candidate.json')[0].content = Buffer.from('weakened assertion').toString('base64'); },
    'changed frozen mode': f => { f.files.get('candidate.json')[0].mode = '100755'; },
    'changed RED command': f => { f.files.get(f.member(f.red, 'checks.json')).checks[0].command = ['node', 'other.mjs']; },
    'false RED assertion': f => { f.report.evidence[0].receipt.checks[0].log = 'Unrelated dependency failure'; },
    'model-only RED': f => { delete f.files.get(f.member(f.red, 'checks.json')).binding; },
    'legacy unbound RED': f => { for (const receipt of [f.report.evidence[0].receipt, f.files.get(f.member(f.red, 'checks.json'))]) { receipt.schemaVersion = 1; delete receipt.binding; } },
    'unclean RED resources': f => { for (const receipt of [f.report.evidence[0].receipt, f.files.get(f.member(f.red, 'checks.json'))]) receipt.serviceCleanup = false; },
    'incomplete RED execution': f => { f.files.get(f.member(f.red, 'runtime.json')).execution.status = 'failed'; },
  };
  for (const [name, corrupt] of Object.entries(cases)) await t.test(name, async () => {
    const f = fixture(); corrupt(f); assert.equal(await readUnattendedPlanningReview(f.api, f.completion, f.prior, f.read), null);
  });
});
