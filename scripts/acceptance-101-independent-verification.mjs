// Disposable qualification of the existing reviewer; no tracker, publication or merge effects.
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
const env = process.env, harness = resolve(env.LIGHTHOUSE_ACCEPTANCE_HARNESS ?? 'src/packages/sdlc');
const load = name => import(pathToFileURL(join(harness, 'src', name + '.mjs')));
const { runImplementationChecks, restoreWorkspaceOwnership } = await load('implementation-runtime');
const { materializeCandidate } = await load('implementation');
const { verificationIntegrity } = await load('verification-integrity');
const { stageContext, executeUnattendedStage, candidateInventory } = await load('unattended-runtime');
const { unattendedDigest } = await load('unattended');
const config = JSON.parse(await readFile(env.LIGHTHOUSE_ENGINE_CONFIG, 'utf8'));
const root = resolve(env.LIGHTHOUSE_ACCEPTANCE_ROOT ?? join(env.RUNNER_TEMP, 'acceptance-101'));
await mkdir(root, { recursive: true });
const file = content => ({ mode: '100644', content: Buffer.from(content) });
const modelConfig = { schemaVersion: 1, defaultProfile: 'build', profiles: {
  build: { model: 'openai/gpt-6.1-sol', reasoningEffort: 'high' }, fast: { model: 'openai/gpt-6-luna', reasoningEffort: 'high' },
} };
const test = assertions => `import assert from 'node:assert/strict';\nimport { eligible } from '../src/rule.mjs';\n${assertions}\n`;
const original = new Map([['src/rule.mjs', file('export const eligible = value => value > 2;\n')], ['tests/rule.test.mjs', file(test("assert.equal(eligible(2), true, 'Expected inclusive boundary');"))], ['.lighthouse/models.json', file(JSON.stringify(modelConfig))]]);
const weak = new Map(original); weak.set('src/rule.mjs', file('export const eligible = value => value >= 3;\n')); weak.set('tests/rule.test.mjs', file(test('assert.equal(eligible(3), true);')));
const corrected = new Map(original); corrected.set('src/rule.mjs', file('export const eligible = value => value >= 2;\n')); corrected.set('tests/rule.test.mjs', file(test("assert.equal(eligible(1), false); assert.equal(eligible(2), true, 'Expected inclusive boundary'); assert.equal(eligible(3), true);")));
const red = new Map(original); red.set('tests/rule.test.mjs', corrected.get('tests/rule.test.mjs'));
const policy = { scope: 'Disposable inclusive-boundary qualification', paths: ['src/', 'tests/'], checks: [['node', '--test', 'tests/rule.test.mjs']], reviewRequired: false,
  verification: { paths: ['tests/'], corrections: { 'tests/rule.test.mjs': 'Refresh the equality and neighboring assertions after the boundary refactor.' } } };
const issue = { title: 'Include the equality boundary', body: 'eligible(value) must return false for 1, true for 2 and true for 3. Preserve the inclusive boundary at 2. This is a disposable pure-function fixture; no UI, database, deployment or release changes are involved.' };
const sourceRevision = env.GITHUB_SHA, issueNumber = Number(env.LIGHTHOUSE_ACCEPTANCE_ISSUE);
assert.ok(Number.isSafeInteger(issueNumber) && issueNumber > 0);
let sequence = 0;
const request = (name, stage) => ({ issue: issueNumber, stage, worker: stage === 'integrate' ? 'independent-review' : 'implement',
  runId: unattendedDigest({ name, run: env.GITHUB_RUN_ID, attempt: env.GITHUB_RUN_ATTEMPT, sequence: ++sequence }), sourceRevision,
  repository: env.GITHUB_REPOSITORY, workflowRunId: env.GITHUB_RUN_ID, attempt: Number(env.GITHUB_RUN_ATTEMPT), taskDigest: unattendedDigest(issue), implementation: { policy } });
async function check(name, candidate) {
  const current = request(name, 'implement'), workspace = join(root, name, 'workspace'), output = join(root, name, 'host');
  await mkdir(workspace, { recursive: true }); await materializeCandidate(candidate, [], workspace);
  const inventory = await candidateInventory(original, candidate, policy);
  const integrity = verificationIntegrity(original, candidate, policy, issueNumber);
  let receipt;
  try { receipt = await runImplementationChecks({ config: { ...config, image: config.implementationImage }, request: current, changes: inventory.changes, workspace, output,
    name: `acceptance-101-${env.GITHUB_RUN_ID}-${name}`, redact: text => text, cancelled: () => false }); }
  finally { restoreWorkspaceOwnership(workspace, { image: config.implementationImage }); }
  receipt.verification = integrity;
  await writeFile(join(root, name, 'receipt.json'), JSON.stringify(receipt));
  return { receipt, ...inventory };
}
const redResult = await check('red', red);
assert.equal(redResult.receipt.checks[0].exitCode, 1);
assert.ok(redResult.receipt.checks[0].output.content.includes('Expected inclusive boundary'));
const results = [];
for (const [name, candidate, expected] of [['weak', weak, 'request-changes'], ['corrected', corrected, 'accept']]) {
  const checked = await check(name, candidate);
  assert.equal(checked.receipt.checks[0].exitCode, 0);
  assert.throws(() => verificationIntegrity(original, candidate, { ...policy, verification: { ...policy.verification, corrections: {} } }, issueNumber), /correction reason/);
  const current = request(name, 'integrate');
  const details = { scope: { implementationPaths: policy.paths, planningRoots: [] }, changes: checked.changes,
    originalFiles: Object.fromEntries(checked.changes.map(change => [change.path, original.get(change.path)?.content.toString('base64') ?? null])),
    verification: checked.receipt.verification, checks: checked.receipt,
    red: { receipt: redResult.receipt, tests: { 'tests/rule.test.mjs': corrected.get('tests/rule.test.mjs').content.toString('base64') } },
    regressionScope: name === 'weak' ? 'This is FF candidate review; the separate RED observation is supplementary. Assess the proposed test correction against the original issue.' : 'The same tests failed against the original production code and passed against this repair.' };
  const binding = unattendedDigest({ sourceRevision, issue, details });
  const context = { ...stageContext(current, issue), review: { purpose: 'candidate', binding, details, originalIssue: issue } };
  await writeFile(join(root, name, 'review-context.json'), JSON.stringify(context));
  const reviewed = await executeUnattendedStage({ env, root: join(root, name, 'review'), request: current, source: candidate, context, modelProfile: 'fast', signal: AbortSignal.timeout(240000),
    prompt: 'Read /input/context.json and /harness/skills/independent-review/SKILL.md. Perform the existing read-only CANDIDATE review against the original issue, actual before/after files, test-correction reason and executed host checks. Inspect the files and determine whether every required boundary is satisfied. This is pre-publication review: forge CI, publication and release are later gates. Copy the complete contract.envelope template to /output/envelope.json; preserve both schemaVersion fields, result.runId, stage and gate. Return result.output.review with the exact context.review.binding, verdict accept/request-changes/escalate, and findings as an array of plain strings. Accept requires passed with empty blocker arrays/findings; otherwise return blocked with concrete findings. Source is mounted read-only; preserve it. The host records the terminal noop.' });
  const review = reviewed.envelope.result.output?.review;
  assert.equal(review?.binding, binding);
  assert.equal(review?.verdict, expected, JSON.stringify(review));
  assert.equal(reviewed.envelope.result.status, expected === 'accept' ? 'passed' : 'blocked');
  assert.equal(reviewed.runtime.execution.status, 'passed');
  assert.equal(reviewed.runtime.model, 'openai/gpt-6-luna');
  assert.equal(reviewed.changes.length, 0);
  if (expected === 'request-changes') assert.ok(review.findings.length > 0);
  else assert.equal(review.findings.length, 0);
  results.push({ name, candidateChecks: 'passed', review: reviewed.envelope.result, model: reviewed.runtime.modelExecution, execution: reviewed.runtime.execution, binding });
}
await writeFile(join(root, 'report.json'), JSON.stringify({ sourceRevision, harness, producer: { kind: 'deterministic-adversarial-fixture', model: null }, red: { exitCode: 1, assertion: 'Expected inclusive boundary' }, results, limits: { broaderDeliveryPilot: false, providerReportedIdentity: 'unverified', billing: 'unavailable', humanAttentionComparison: 'unavailable; one qualification fixture' } }, null, 2));
console.log(JSON.stringify({ qualified: results.map(result => ({ name: result.name, verdict: result.review.output.review.verdict })), root }));
