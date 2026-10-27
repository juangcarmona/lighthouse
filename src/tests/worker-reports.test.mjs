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
  await assert.rejects(publishReports(g.api, repo, owner, 1, [{ ...observation(11), runId: '11?token=secret' }]), /Invalid report occurrence/);
  assert.equal(g.issues.length, 1);
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
