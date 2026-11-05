import test from 'node:test';
import assert from 'node:assert/strict';
import { checkCommit, assertChecks } from '../packages/sdlc/src/completion.mjs';

const head = 'a'.repeat(40);
const check = { id: 12, name: 'repository', head_sha: head, app: { id: 15368, slug: 'github-actions' }, check_suite: { id: 34 }, details_url: 'https://github.com/owner/repo/actions/runs/56/job/78', status: 'completed', conclusion: 'success' };
const run = { id: 56, check_suite_id: 34, head_sha: head, event: 'pull_request', html_url: 'https://github.com/owner/repo/actions/runs/56' };
function fixture(changes = {}) {
  let reads = 0;
  const api = async path => {
    if (path.includes('/check-runs?')) return { check_runs: changes.checks ?? [{ ...check, ...changes.check }] };
    if (path.includes('/statuses?')) return [];
    assert.equal(path, 'actions/runs/56'); reads++;
    if (changes.unavailable) throw Error('Provider unavailable');
    return { ...run, ...changes.run };
  };
  return { api, reads: () => reads };
}
const required = [{ context: 'repository', app: 15368 }];

test('green dispatch jobs cannot satisfy pull-request required checks', async () => {
  for (const event of ['workflow_dispatch', 'repository_dispatch', 'schedule']) {
    const f = fixture({ run: { event } });
    const checks = await checkCommit(f.api, head, required);
    assert.equal(checks[0].status, 'unavailable', event);
    assert.equal(checks[0].state, 'ineligible-event');
    assert.throws(() => assertChecks({ checks }), /eligible.*event|event.*eligible/i);
  }
});

test('native eligible events qualify, while post-merge verification can still use dispatch', async () => {
  for (const event of ['push', 'pull_request', 'pull_request_review', 'pull_request_target', 'deployment', 'deployment_status']) {
    const f = fixture({ run: { event } });
    assert.equal((await checkCommit(f.api, head, required))[0].status, 'passed', event);
  }
  const f = fixture({ run: { event: 'workflow_dispatch' } });
  assert.equal((await checkCommit(f.api, head, required, { pullRequest: false }))[0].status, 'passed');
  assert.equal(f.reads(), 0);
});

test('missing or mismatched workflow origin never inherits a green job conclusion', async () => {
  for (const changes of [{ check: { details_url: undefined } }, { check: { check_suite: undefined } },
    { check: { details_url: 'https://example.invalid/56' } }, { run: { id: 99 } },
    { run: { check_suite_id: 99 } }, { run: { head_sha: 'b'.repeat(40) } }, { unavailable: true }]) {
    const f = fixture(changes), checks = await checkCommit(f.api, head, required);
    assert.equal(checks[0].status, 'unavailable');
    assert.equal(checks[0].state, 'unverified-workflow');
  }
});

test('origin qualification is cached per workflow, preserves external app checks and real failures', async () => {
  const f = fixture({ checks: [check, { ...check, id: 13, name: 'package' }] });
  const checks = await checkCommit(f.api, head, [...required, { context: 'package', app: 15368 }]);
  assert.ok(checks.every(c => c.status === 'passed'));
  assert.equal(f.reads(), 1);
  const external = fixture({ check: { app: { id: 7 }, details_url: undefined, check_suite: undefined } });
  assert.equal((await checkCommit(external.api, head, [{ context: 'repository', app: 7 }]))[0].status, 'passed');
  assert.equal(external.reads(), 0);
  const failed = fixture({ check: { conclusion: 'failure' } });
  assert.equal((await checkCommit(failed.api, head, required))[0].status, 'failed');
});

test('a later dispatch cannot hide the latest eligible check or replace its failure', async () => {
  for (const conclusion of ['success', 'failure']) {
    const checks = [{ ...check, id: 10, conclusion }, { ...check, id: 20, details_url: 'https://github.com/owner/repo/actions/runs/57/job/79', check_suite: { id: 35 } }];
    const f = fixture({ checks });
    const api = path => path === 'actions/runs/57' ? { ...run, id: 57, check_suite_id: 35, event: 'workflow_dispatch' } : f.api(path);
    assert.equal((await checkCommit(api, head, required))[0].status, conclusion === 'success' ? 'passed' : 'failed');
  }
});
