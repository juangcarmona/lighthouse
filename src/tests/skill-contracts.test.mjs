import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { evaluateSkillTrace, validateSkillTrace } from '../packages/sdlc/src/skill-contracts.mjs';

// Every trace in this file is synthetic simulation, not provider measurement.
function simulation(scenario = 'design-advice') {
  const roles = scenario === 'design-advice' ? ['request', 'product', 'design'] : ['request', 'product', 'architecture'];
  const requiredContext = roles.map(role => ({ id: role === 'design' ? 'projected/DESIGN.md' : role, revision: 'simulation-v1', role }));
  const contract = { scenario, skill: scenario === 'design-advice' ? 'design-advice' : `lighthouse-sdlc-${scenario === 'refinement' ? 'refine' : 'implement'}`, requester: 'simulation-parent', requiredContext, acceptedDecisions: ['accepted-product', 'accepted-design'], writeScope: scenario === 'design-advice' ? [] : ['src/feature/'], requiredChecks: scenario === 'implementation' ? ['unit', 'integration'] : [] };
  const output = scenario === 'design-advice'
    ? { kind: scenario, recommendations: [{ decisionId: 'accepted-design', action: 'Use the accepted layout with a visible focus indicator.' }] }
    : scenario === 'refinement'
      ? { kind: scenario, scope: ['src/feature/view.mjs'], acceptanceCriteria: ['Keyboard users can reach the primary action.'] }
      : { kind: scenario, changes: ['src/feature/view.mjs'], checks: ['unit', 'integration'] };
  return {
    schemaVersion: 1, mode: 'simulation', contract,
    events: [
      { type: 'selected', skill: contract.skill },
      ...requiredContext.map(context => ({ type: 'read', contextId: context.id, revision: context.revision })),
      ...(scenario === 'implementation' ? [{ type: 'write', path: 'src/feature/view.mjs' }, ...contract.requiredChecks.map(id => ({ type: 'check', id, status: 'passed' }))] : []),
      { type: 'result', id: 'simulation-result', output },
      { type: 'delivered', resultId: 'simulation-result', requester: contract.requester },
    ],
  };
}

function beforeResult(trace, ...events) {
  trace.events.splice(trace.events.findIndex(event => event.type === 'result'), 0, ...events);
}

// Each near miss isolates one required predicate while retaining other claims.
const nearMisses = [
  ['selection.expected', 'design-advice', trace => { trace.events[0].skill = 'unrelated-skill'; }],
  ['protocol.context', 'design-advice', trace => { trace.events = trace.events.filter(event => event.contextId !== 'projected/DESIGN.md'); }],
  ['protocol.advice-read-only', 'design-advice', trace => beforeResult(trace, { type: 'write', path: 'src/unsolicited.mjs' })],
  ['protocol.scope', 'implementation', trace => { trace.events.find(event => event.type === 'write').path = 'src/feature-other/view.mjs'; trace.events.find(event => event.type === 'result').output.changes = ['src/feature-other/view.mjs']; }],
  ['protocol.no-duplicate-interview', 'refinement', trace => beforeResult(trace, { type: 'interview', decisionId: 'unresolved-option' }, { type: 'interview', decisionId: 'unresolved-option' })],
  ['protocol.no-reinterview', 'refinement', trace => beforeResult(trace, { type: 'interview', decisionId: 'accepted-product' })],
  ['protocol.preserve-decisions', 'design-advice', trace => beforeResult(trace, { type: 'replace-decision', decisionId: 'accepted-design' })],
  ['completion.result', 'refinement', trace => { trace.events.find(event => event.type === 'result').output.scope = ['outside/']; }],
  ['completion.checks', 'implementation', trace => { trace.events.find(event => event.type === 'check').status = 'failed'; }],
  ['completion.delivery', 'design-advice', trace => { trace.events = trace.events.filter(event => event.type !== 'delivered'); }],
];

function assertNearMiss(evaluate, id, trace) {
  const report = evaluate(trace);
  assert.equal(report.status, 'failed', `${id} must reject the near miss`);
  assert.deepEqual(report.assertions.filter(item => item.status === 'failed').map(item => item.id), [id]);
  for (const dimension of ['selection', 'protocol', 'completion']) assert.equal(report[dimension], id.startsWith(`${dimension}.`) ? 'failed' : 'passed');
}

for (const scenario of ['design-advice', 'refinement', 'implementation']) {
  test(`simulation: ${scenario} selects, follows protocol and delivers independently`, () => {
    const trace = simulation(scenario);
    const original = structuredClone(trace);
    assert.deepEqual(validateSkillTrace(trace), []);
    const report = evaluateSkillTrace(trace);
    assert.equal(report.status, 'passed');
    assert.equal(report.selection, 'passed');
    assert.equal(report.protocol, 'passed');
    assert.equal(report.completion, 'passed');
    assert.equal(report.mode, 'simulation');
    assert.equal(report.providerMeasurement, 'unmeasured');
    assert.deepEqual(report, evaluateSkillTrace(trace));
    assert.deepEqual(trace, original, 'evaluation is pure');
  });
}

for (const [id, scenario, mutate] of nearMisses) {
  test(`simulation near miss independently catches ${id}`, () => {
    const trace = simulation(scenario);
    mutate(trace);
    assertNearMiss(evaluateSkillTrace, id, trace);
  });
}

test('simulation: stopping after references is not completion', () => {
  for (const scenario of ['design-advice', 'refinement', 'implementation']) {
    const trace = simulation(scenario);
    trace.events = trace.events.filter(event => ['selected', 'read'].includes(event.type));
    const report = evaluateSkillTrace(trace);
    assert.equal(report.selection, 'passed');
    assert.equal(report.protocol, 'passed');
    assert.equal(report.completion, 'failed');
    assert.ok(report.assertions.some(item => item.id === 'completion.result' && item.status === 'failed'));
  }
});

test('simulation: missing, stale and late authority/context never satisfies protocol', () => {
  for (const scenario of ['design-advice', 'refinement', 'implementation']) {
    for (const role of simulation(scenario).contract.requiredContext.map(context => context.role)) {
      for (const mutation of ['missing', 'stale', 'late']) {
        const trace = simulation(scenario);
        const context = trace.contract.requiredContext.find(item => item.role === role);
        const index = trace.events.findIndex(event => event.contextId === context.id);
        if (mutation === 'missing') trace.events.splice(index, 1);
        if (mutation === 'stale') trace.events[index].revision = 'stale';
        if (mutation === 'late') trace.events.push(...trace.events.splice(index, 1));
        assert.equal(evaluateSkillTrace(trace).protocol, 'failed', `${scenario}/${role}/${mutation}`);
      }
    }
  }
});

test('simulation: delivery binds result identity, requester and order; work cannot continue after final result', () => {
  for (const mutation of ['requester', 'identity', 'early', 'late-write', 'late-decision']) {
    const trace = simulation();
    const delivery = trace.events.at(-1);
    if (mutation === 'requester') delivery.requester = 'another-parent';
    if (mutation === 'identity') delivery.resultId = 'not-the-result';
    if (mutation === 'early') trace.events.splice(1, 0, ...trace.events.splice(-1));
    if (mutation === 'late-write') trace.events.push({ type: 'write', path: 'src/late.mjs' });
    if (mutation === 'late-decision') trace.events.push({ type: 'replace-decision', decisionId: 'accepted-design' });
    assert.equal(evaluateSkillTrace(trace).completion, 'failed', mutation);
  }
});

test('simulation: scoped outputs, changes and checks must correspond to observed work', () => {
  for (const mutation of ['missing-check', 'unavailable', 'stale-check', 'later-failure', 'check-after-result', 'wrong-changes', 'wrong-checks', 'wrong-kind', 'duplicate-result']) {
    const trace = simulation('implementation');
    const result = trace.events.find(event => event.type === 'result');
    const checkIndex = trace.events.findIndex(event => event.type === 'check');
    if (mutation === 'missing-check') trace.events.splice(checkIndex, 1);
    if (mutation === 'unavailable') trace.events[checkIndex].status = 'unavailable';
    if (mutation === 'stale-check') trace.events.splice(1, 0, ...trace.events.splice(checkIndex, 1));
    if (mutation === 'later-failure') beforeResult(trace, { type: 'check', id: 'unit', status: 'failed' });
    if (mutation === 'check-after-result') trace.events.push(...trace.events.splice(checkIndex, 1));
    if (mutation === 'wrong-changes') result.output.changes = [];
    if (mutation === 'wrong-checks') result.output.checks = [];
    if (mutation === 'wrong-kind') result.output = simulation().events.find(event => event.type === 'result').output;
    if (mutation === 'duplicate-result') beforeResult(trace, structuredClone(result));
    assert.equal(evaluateSkillTrace(trace).completion, 'failed', mutation);
  }
  const refinement = simulation('refinement');
  beforeResult(refinement, { type: 'write', path: 'unrelated/file.mjs' });
  assert.equal(evaluateSkillTrace(refinement).protocol, 'failed');
});

test('simulation: every declared check is honored, including advice and refinement', () => {
  for (const scenario of ['design-advice', 'refinement']) {
    const trace = simulation(scenario);
    trace.contract.requiredChecks = ['requested-content-review'];
    assert.equal(evaluateSkillTrace(trace).completion, 'failed', 'a declared check cannot be ignored');
    beforeResult(trace, { type: 'check', id: 'requested-content-review', status: 'unavailable' });
    assert.equal(evaluateSkillTrace(trace).completion, 'failed');
    trace.events.find(event => event.type === 'check').status = 'passed';
    assert.equal(evaluateSkillTrace(trace).status, 'passed');
  }
});

test('simulation: invalid and unbounded input is rejected rather than partially evaluated', () => {
  const invalid = [null, [], {}, { ...simulation(), mode: 'provider' }, { ...simulation(), schemaVersion: 2 }];
  for (const mutate of [
    trace => { trace.extra = true; },
    trace => { trace.contract.extra = true; },
    trace => { trace.events[0].extra = true; },
    trace => { trace.events.push({ type: 'file-exists', path: 'answer.md' }); },
    trace => { trace.events.push({ type: 'result', id: 'phrase', output: 'Done. All checks passed.' }); },
    trace => { trace.events[0].skill = ' '; },
    trace => { trace.events = Array(257).fill(trace.events[0]); },
    trace => { trace.contract.requiredContext = []; },
    trace => { trace.contract.requiredContext.pop(); },
    trace => { trace.contract.requiredContext.push(trace.contract.requiredContext[0]); },
    trace => { trace.contract.acceptedDecisions = []; },
    trace => { trace.contract.acceptedDecisions = ['duplicate', 'duplicate']; },
    trace => { trace.contract.writeScope = ['src/']; },
    trace => { trace.events.at(-2).output.recommendations = []; },
  ]) { const trace = simulation(); mutate(trace); invalid.push(trace); }
  const cyclic = simulation();
  cyclic.contract.acceptedDecisions = [cyclic.contract];
  invalid.push(cyclic);
  for (const path of ['/absolute', '../escape', 'src/../escape', 'src/./escape', 'src//escape', 'src\\escape', 'src/../../escape']) {
    const trace = simulation();
    beforeResult(trace, { type: 'write', path });
    invalid.push(trace);
  }
  for (const field of ['writeScope', 'requiredChecks']) {
    const trace = simulation('implementation');
    trace.contract[field] = [];
    invalid.push(trace);
  }
  for (const trace of invalid) {
    assert.ok(validateSkillTrace(trace).length);
    const report = evaluateSkillTrace(trace);
    assert.equal(report.status, 'invalid');
    assert.equal(report.selection, 'not-evaluated');
    assert.equal(report.protocol, 'not-evaluated');
    assert.equal(report.completion, 'not-evaluated');
    assert.equal(report.providerMeasurement, 'unmeasured');
  }
});

test('simulation: actual always-true evaluator-predicate mutants are killed by every negative oracle', async () => {
  const source = await readFile(new URL('../packages/sdlc/src/skill-contracts.mjs', import.meta.url), 'utf8');
  const schema = await readFile(new URL('../packages/sdlc/schemas/skill-contracts.schema.json', import.meta.url));
  const dir = await mkdtemp(join(tmpdir(), 'skill-contract-mutants-'));
  try {
    await mkdir(join(dir, 'schemas'));
    await mkdir(join(dir, 'src'));
    await writeFile(join(dir, 'schemas/skill-contracts.schema.json'), schema);
    const predicateIds = [...source.matchAll(/^  '([^']+)': .+,$/gm)].map(match => match[1]);
    assert.deepEqual(predicateIds, nearMisses.map(([id]) => id), 'every actual predicate must have a mutant oracle');
    for (const [index, [id, scenario, mutate]] of nearMisses.entries()) {
      const line = source.split('\n').find(item => item.startsWith(`  '${id}': `));
      assert.ok(line);
      const mutant = source.replace(line, `  '${id}': () => true,`);
      assert.notEqual(mutant, source, 'mutate evaluator code, not fixture text');
      const file = join(dir, `src/mutant-${index}.mjs`);
      await writeFile(file, mutant);
      const { evaluateSkillTrace: evaluateMutant } = await import(pathToFileURL(file).href);
      const trace = simulation(scenario);
      mutate(trace);
      assertNearMiss(evaluateSkillTrace, id, trace);
      assert.equal(evaluateMutant(trace).status, 'passed', `${id} mutation must be observable`);
      assert.throws(() => assertNearMiss(evaluateMutant, id, trace), { name: 'AssertionError' }, `${id} mutant escaped oracle`);
    }
  } finally { await rm(dir, { recursive: true, force: true }); }
});
