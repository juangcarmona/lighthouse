import test from 'node:test';
import assert from 'node:assert/strict';
import { measurementsFromTap, collectGithubTests } from '../packages/sdlc/src/practice-github.mjs';
import { evaluatePractices } from '../packages/sdlc/src/practice-evaluator.mjs';
import { context } from './fixtures/practice-evidence.mjs';

const tap = '# tests 4\n# pass 4\n# fail 0\n# cancelled 0\n# skipped 0\n# todo 0\n';
const workflow = '.github/workflows/ci.yml', command = 'npm test', jobId = 456;
const input = { context, runId: 123, attempt: 1, jobId, workflow, stepName: 'Run npm test', command };
function fixture({ rules = true, mutate = () => {} } = {}) {
  const base = 'repos/example/project';
  const values = {
    [base]: { id: 42, full_name: 'example/project' },
    [`${base}/actions/runs/123/attempts/1`]: { repository: { id: 42 }, head_repository: { id: 42 }, head_sha: context.commit, head_branch: 'main', path: workflow, run_attempt: 1, status: 'completed' },
    [`${base}/actions/jobs/456`]: { run_id: 123, run_attempt: 1, head_sha: context.commit, status: 'completed', name: 'repository', check_run_url: `https://api.github.com/${base}/check-runs/10`, steps: [{ name: 'Run npm test', status: 'completed', conclusion: 'success', started_at: '2026-11-16T12:00:00Z', completed_at: '2026-11-16T12:01:00Z' }] },
    [`${base}/check-runs/10`]: { head_sha: context.commit, app: { id: 15368, slug: 'github-actions' } },
    [`${base}/contents/${workflow}?ref=${context.commit}`]: { encoding: 'base64', size: 100, content: Buffer.from('jobs:\n  repository:\n    steps:\n      - run: npm test\n').toString('base64') },
    [`${base}/rules/branches/main?per_page=100`]: [{ type: 'required_status_checks', ruleset_source_type: 'Repository', ruleset_source: 'example/project', ruleset_id: 1, parameters: { required_status_checks: [{ context: 'repository', integration_id: 15368 }] } }],
    [`${base}/rulesets/1`]: { enforcement: 'active', bypass_actors: [] },
  };
  mutate(values);
  return { request: async path => { if (!rules && /rules/.test(path)) throw Error('403'); if (!Object.hasOwn(values, path)) throw Error('404'); return structuredClone(values[path]); }, readLog: async () => tap.split('\n').filter(Boolean).map(line => '2026-11-16T12:00:30.000Z ' + line).join('\n') };
}

test('native collector binds exact execution and required check integration without writes', async () => {
  const collected = await collectGithubTests(input, fixture());
  const report = await evaluatePractices({ context, ...collected, now: '2026-11-16T13:00:00Z' });
  const tests = report.practices.find(p => p.practice === 'tests');
  assert.equal(tests.state, 'met'); assert.equal(tests.certified, true); assert.equal(report.level, 'unverified');
  assert.equal(collected.authority.enforcement.merge, true);
  assert.equal(collected.resolveSource({ ...collected.observations[0], mode: 'report-only' }), undefined);
});

test('native collection preserves unavailable hosting authority and missing practice counterparts', async () => {
  const collected = await collectGithubTests(input, fixture({ rules: false }));
  const report = await evaluatePractices({ context, ...collected, now: '2026-11-16T13:00:00Z' });
  assert.equal(report.practices.find(p => p.practice === 'tests').state, 'met');
  assert.ok(report.practices.find(p => p.practice === 'tests').enforcementGaps.length);
  assert.equal(report.practices.find(p => p.practice === 'coverage').state, 'missing');
});

test('native source mismatch, another attempt, absent step and unavailable logs fail closed', async () => {
  for (const mutate of [
    v => v['repos/example/project'].id = 43,
    v => v['repos/example/project/actions/jobs/456'].run_attempt = 2,
    v => v['repos/example/project/actions/jobs/456'].head_sha = 'b'.repeat(40),
    v => v['repos/example/project/actions/jobs/456'].steps = [],
    v => v['repos/example/project/actions/runs/123/attempts/1'].head_repository.id = 99,
    v => v[`repos/example/project/contents/${workflow}?ref=${context.commit}`].content = Buffer.from('- run: echo fake').toString('base64'),
  ]) await assert.rejects(collectGithubTests(input, fixture({ mutate })));
  await assert.rejects(collectGithubTests(input, { ...fixture(), readLog: async () => { throw Error('expired'); } }), /expired/);
});

test('TAP requires actual reconciled counts and rejects aggregate green or ambiguous output', () => {
  assert.equal(measurementsFromTap(tap).executed, 4);
  for (const log of ['job passed', tap + tap, tap.replace('# pass 4', '# pass 0'), tap.replace('# tests 4', '# tests 0')]) assert.throws(() => measurementsFromTap(log));
  const skipped = measurementsFromTap(tap.replace('# pass 4', '# pass 3').replace('# skipped 0', '# skipped 1')); assert.equal(skipped.declared, 4); assert.equal(skipped.executed, 3);
});
