import test from 'node:test';
import assert from 'node:assert/strict';
import { publishReports, readReport, reportSignature } from '../packages/sdlc/src/worker-reports.mjs';

const repo = 'owner/repo', owner = 'owner', code = 'worker-technical-failure';
const observation = (runId, rootId = 'a'.repeat(64)) => ({ issue: 7, worker: 'implement', runId: String(runId), rootId, attempt: 0, state: 'retryable', code });
function fixture() {
  const index = { number: 1, body: 'Owner notes stay here.', state: 'open', user: { login: owner, type: 'User' } };
  const issues = [index], calls = [];
  const api = async (path, method = 'GET', body) => {
    calls.push({ path, method, body });
    if (path.startsWith('issues?')) return structuredClone(issues);
    if (path === 'issues' && method === 'POST') {
      const issue = { number: issues.length + 1, state: 'open', user: { login: 'github-actions[bot]', type: 'Bot' }, ...body };
      issues.push(issue); return structuredClone(issue);
    }
    if (path.startsWith('issues/')) {
      const issue = issues.find(i => i.number === Number(path.split('/')[1]));
      if (!issue) throw Error('Missing issue');
      if (method === 'PATCH') Object.assign(issue, body);
      return structuredClone(issue);
    }
    throw Error(`Unexpected ${method} ${path}`);
  };
  return { index, issues, calls, api };
}

test('three failures share one report; repeated maintenance does not increase counts or rewrite', async () => {
  const f = fixture(), rows = [observation(11), observation(12), observation(13)];
  const [report] = await publishReports(f.api, repo, owner, 1, rows);
  assert.equal(report.count, 3); assert.equal(f.issues.length, 2);
  assert.ok(f.calls.findIndex(c => c.path === 'issues/1' && c.method === 'PATCH') < f.calls.findIndex(c => c.path === 'issues' && c.method === 'POST'));
  assert.match(f.index.body, /^Owner notes stay here\./);
  const writes = f.calls.filter(c => c.method !== 'GET').length;
  assert.equal((await publishReports(f.api, repo, owner, 1, rows))[0].count, 3);
  assert.equal(f.calls.filter(c => c.method !== 'GET').length, writes);
  await publishReports(f.api, repo, owner, 1, [{ ...observation(14), code: 'publication-uncertain', state: 'uncertain' }]);
  assert.equal(f.issues.length, 3);
});

test('confirmed same-root recovery closes the report; new failure reopens the same issue', async () => {
  const f = fixture(); await publishReports(f.api, repo, owner, 1, [observation(11)]);
  await publishReports(f.api, repo, owner, 1, [{ ...observation(12), state: 'succeeded', code: 'worker-completed' }]);
  assert.equal(f.issues[1].state, 'closed'); assert.match(f.issues[1].body, /Recovery confirmed/);
  await publishReports(f.api, repo, owner, 1, [observation(11)]); // old failure replay cannot undo confirmed recovery
  assert.equal(f.issues[1].state, 'closed');
  await publishReports(f.api, repo, owner, 1, [observation(10)]); // an older job may deliver a previously unseen failed attempt late
  assert.equal(f.issues[1].state, 'closed');
  await publishReports(f.api, repo, owner, 1, [observation(13, 'b'.repeat(64))]);
  assert.equal(f.issues.length, 2); assert.equal(f.issues[1].state, 'open');
  assert.equal(readReport(f.issues[1], repo, 'implement', code).entries.length, 3);
  await publishReports(f.api, repo, owner, 1, [{ ...observation(14, 'c'.repeat(64)), state: 'succeeded' }]);
  assert.equal(f.issues[1].state, 'open', 'unrelated success is not recovery evidence');
});

test('lost create response is reconciled without another POST', async () => {
  const f = fixture(); let fail = true;
  const api = async (...args) => { const result = await f.api(...args); if (args[0] === 'issues' && args[1] === 'POST' && fail) { fail = false; throw Error('Response lost'); } return result; };
  await assert.rejects(publishReports(api, repo, owner, 1, [observation(11)]), /Response lost/);
  await publishReports(api, repo, owner, 1, [observation(11)]);
  assert.equal(f.calls.filter(c => c.path === 'issues' && c.method === 'POST').length, 1);
  assert.match(f.index.body, /#2: implement/);
});

test('unconfirmed create with no matching issue requires inspection and never resends', async () => {
  const f = fixture(); let posts = 0;
  const api = async (...args) => { if (args[0] === 'issues' && args[1] === 'POST') { posts++; throw Error('Unavailable'); } return f.api(...args); };
  await assert.rejects(publishReports(api, repo, owner, 1, [observation(11)]), /Unavailable/);
  await assert.rejects(publishReports(api, repo, owner, 1, [observation(11)]), /unconfirmed/);
  assert.equal(posts, 1);
});

test('lost index response before create leaves durable uncertainty, not a duplicate report', async () => {
  const f = fixture(); let fail = true;
  const api = async (...args) => { const result = await f.api(...args); if (args[0] === 'issues/1' && args[1] === 'PATCH' && fail) { fail = false; throw Error('Index response lost'); } return result; };
  await assert.rejects(publishReports(api, repo, owner, 1, [observation(11)]), /Index response lost/);
  await assert.rejects(publishReports(api, repo, owner, 1, [observation(11)]), /unconfirmed/);
  assert.equal(f.issues.length, 1);
});

test('reports reject spoofed ownership and never publish free text or logs', async () => {
  const f = fixture();
  await publishReports(f.api, repo, owner, 1, [{ ...observation(11), nextAction: 'SECRET', log: 'TOKEN=secret', title: 'private title', body: 'private body', path: '/private' }]);
  assert.doesNotMatch(f.issues[1].body, /SECRET|TOKEN|private/);
  f.issues[1].user = { login: 'outsider', type: 'User' };
  await assert.rejects(publishReports(f.api, repo, owner, 1, [observation(11)]), /bot-owned/);
  const g = fixture();
  await assert.rejects(publishReports(g.api, repo, owner, 1, [{ ...observation(11), worker: 'secret-worker' }]), /Unknown observed/);
  await assert.rejects(publishReports(g.api, repo, owner, 1, [{ ...observation(11), runId: '11?token=secret' }]), /Invalid report (occurrence|context)/);
  assert.equal(g.issues.length, 1);
});

test('latest linked execution explains active work and human waits without adding failures or claiming recovery', async () => {
  const f = fixture();
  await publishReports(f.api, repo, owner, 1, [observation(11)]);
  for (const [state, code] of [['active', 'worker-active'], ['waiting-human', 'human-decision'], ['blocked', 'stage-blocked']]) {
    await publishReports(f.api, repo, owner, 1, [{ ...observation(12), attempt: 1, state, code, pr: 60, head: 'd'.repeat(40), nextAction: 'SECRET' }]);
    const report = readReport(f.issues[1], repo, 'implement', 'worker-technical-failure');
    assert.equal(report.entries.length, 1);
    assert.equal(report.entries[0].runId, '11');
    assert.equal(report.contexts[0].runId, '12');
    assert.equal(report.contexts[0].state, state);
    assert.equal(f.issues[1].state, 'open');
    assert.match(f.issues[1].body, /PR #60/);
    assert.doesNotMatch(f.issues[1].body, /SECRET|Recovery confirmed/);
  }
  await publishReports(f.api, repo, owner, 1, [observation(11)]);
  assert.equal(readReport(f.issues[1], repo, 'implement', code).contexts[0].state, 'blocked', 'older observations cannot overwrite the latest execution');
});

test('exhaustion and exact retry delay have concrete actions; uncertain successful publication is not recovery', async () => {
  const f = fixture(), retryAt = '2026-11-04T13:00:00.000Z';
  await publishReports(f.api, repo, owner, 1, [{ ...observation(11), state: 'delayed', retryAt }]);
  assert.match(f.issues[1].body, /wait until 2026-11-04T13:00/);
  await publishReports(f.api, repo, owner, 1, [{ ...observation(13), state: 'exhausted', attempt: 2 }]);
  assert.match(f.issues[1].body, /Owner: retry budget exhausted/);
  await publishReports(f.api, repo, owner, 1, [{ ...observation(13), attempt: 2, state: 'uncertain', code: 'ci-start-unconfirmed', outcome: 'completed', pr: 60, head: 'd'.repeat(40) }]);
  assert.equal(f.issues.length, 3);
  assert.match(f.issues[2].body, /execution outcome: completed/);
  assert.doesNotMatch(f.issues[2].body, /Recovery confirmed/);
  await publishReports(f.api, repo, owner, 1, [{ ...observation(13), attempt: 2, state: 'succeeded', code: 'worker-completed' }]);
  assert.equal(f.issues[2].state, 'open', 'worker success cannot resolve an unknown CI send');
  assert.equal(readReport(f.issues[2], repo, 'implement', 'ci-launch-failure').contexts[0].state, 'uncertain');
  await publishReports(f.api, repo, owner, 1, [{ ...observation(13), attempt: 2, state: 'reconciled', code: 'ci-requested' }]);
  assert.equal(f.issues[2].state, 'open');
  await publishReports(f.api, repo, owner, 1, [{ ...observation(13), attempt: 2, state: 'reconciled', code: 'ci-observed' }]);
  assert.equal(f.issues[2].state, 'closed');
  assert.match(f.issues[2].body, /CI success and delivery acceptance are separate/);
  assert.equal(f.issues[1].state, 'closed', 'the separate worker incident was resolved by confirmed worker completion');
});

test('normal waits create no incidents; legacy reports migrate and invalid context metadata cannot enter reports', async () => {
  const f = fixture();
  await publishReports(f.api, repo, owner, 1, [{ ...observation(11), state: 'waiting-human', code: 'human-decision' }]);
  assert.equal(f.issues.length, 1);
  await publishReports(f.api, repo, owner, 1, [observation(11)]);
  const legacy = readReport(f.issues[1], repo, 'implement', code);
  delete legacy.contexts; legacy.schemaVersion = 1;
  f.issues[1].body = `<!-- lighthouse-worker-report:${JSON.stringify(legacy)} -->`;
  await publishReports(f.api, repo, owner, 1, [{ ...observation(12), state: 'succeeded', code: 'worker-completed' }]);
  assert.equal(f.issues[1].state, 'closed');
  assert.equal(readReport(f.issues[1], repo, 'implement', code).schemaVersion, 2);
  for (const invalid of [{ pr: '60?SECRET' }, { head: 'SECRET' }, { retryAt: 'SECRET' }, { outcome: 'SECRET' }]) {
    await assert.rejects(publishReports(f.api, repo, owner, 1, [{ ...observation(13), ...invalid }]), /Invalid report context metadata/);
  }
  await assert.rejects(publishReports(f.api, repo, owner, 1, [observation(11, 'b'.repeat(64))]), /identity changed/);
});

test('confirming a previously unconfirmed run replaces its request placeholder instead of inflating counts', async () => {
  const f = fixture(), pending = { ...observation(null), runId: null, code: 'dispatch-unconfirmed', state: 'uncertain' };
  await publishReports(f.api, repo, owner, 1, [pending]);
  await publishReports(f.api, repo, owner, 1, [{ ...pending, runId: '11' }]);
  const report = readReport(f.issues[1], repo, 'implement', 'dispatch-unconfirmed');
  assert.equal(report.entries.length, 1); assert.equal(report.entries[0].key, 'run:11');
  await publishReports(f.api, repo, owner, 1, [{ ...observation(12), state: 'succeeded', code: 'worker-completed' }]);
  await publishReports(f.api, repo, owner, 1, [{ ...observation(12), state: 'active', code: 'worker-active' }]);
  assert.equal(readReport(f.issues[1], repo, 'implement', 'dispatch-unconfirmed').contexts[0].code, 'worker-completed');
  await assert.rejects(publishReports(f.api, repo, owner, 1, [{ ...observation(null), runId: null, state: 'succeeded', code: 'worker-completed' }]), /confirmed execution identity/);
  await assert.rejects(publishReports(f.api, repo, owner, 1, [{ ...observation(13), issue: 8, state: 'active', code: 'worker-active' }]), /request issue changed/);
});

test('owner index edits and occurrence overflow stop publication visibly', async () => {
  const f = fixture(); let reads = 0;
  const api = async (...args) => { if (args[0] === 'issues/1' && ++reads === 2) f.index.body = 'New owner instructions'; return f.api(...args); };
  await assert.rejects(publishReports(api, repo, owner, 1, [observation(11)]), /index changed/);
  assert.equal(f.issues.length, 1);
  const g = fixture();
  await assert.rejects(publishReports(g.api, repo, owner, 1, Array.from({ length: 201 }, (_, i) => observation(i + 1))), /200 distinct/);
  assert.equal(g.issues.length, 1);
  assert.equal(g.calls.filter(c => c.method !== 'GET').length, 0, 'invalid input must not strand creation intent');
  assert.notEqual(reportSignature(repo, 'implement', code), reportSignature(repo, 'refine', code));
});

test('manual closure survives a repeated observation; a new occurrence reopens and a lost update is safe', async () => {
  const f = fixture();
  await publishReports(f.api, repo, owner, 1, [observation(11)]);
  f.issues[1].state = 'closed';
  await publishReports(f.api, repo, owner, 1, [observation(11)]);
  assert.equal(f.issues[1].state, 'closed');
  let fail = true;
  const api = async (...args) => { const result = await f.api(...args); if (args[0] === 'issues/2' && args[1] === 'PATCH' && fail) { fail = false; throw Error('Update response lost'); } return result; };
  await assert.rejects(publishReports(api, repo, owner, 1, [observation(12)]), /Update response lost/);
  await publishReports(api, repo, owner, 1, [observation(12)]);
  assert.equal(f.issues.length, 2);
  assert.equal(f.issues[1].state, 'open');
  assert.equal(readReport(f.issues[1], repo, 'implement', code).entries.length, 2);
});
