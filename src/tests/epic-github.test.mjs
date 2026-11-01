import test from 'node:test';
import assert from 'node:assert/strict';
import { buildDecompositionPlan } from '../packages/sdlc/src/decompose.mjs';
import { epicPlanDigest } from '../packages/sdlc/src/epic.mjs';
import { epicCorrelation, epicMarker, readEpicMarker, reconcileEpicChildren } from '../packages/sdlc/src/epic-github.mjs';

const plan = () => buildDecompositionPlan({ schemaVersion: 1, parent: { id: 'GH-146', title: 'Original parent' }, slices: [
  { id: 'a', title: 'A', acceptance: ['A is verifiable'], dependencies: [] },
  { id: 'b', title: 'B', acceptance: ['B builds on A'], dependencies: ['a'] },
] });
const context = { repository: 'example/project', parent: 146, base: 'lighthouse/epic-146' };
const correlation = () => epicCorrelation({ ...context, slice: 'a', planDigest: epicPlanDigest(plan()), dependencies: [] });

function fixture() {
  const receipts = new Map(), issues = [], parents = new Map(), dependencies = new Map(), writes = [];
  let lease = false;
  const host = {
    withLease: async (_key, work) => { assert.equal(lease, false); lease = true; try { return await work(); } finally { lease = false; } },
    readReceipt: async key => structuredClone(receipts.get(key)),
    writeReceipt: async (key, value) => { assert.equal(lease, true); receipts.set(key, structuredClone(value)); },
    findCandidates: async expected => issues.filter(issue => readEpicMarker(issue.body)?.slice === expected.slice),
    authenticate: async (issue, receipt) => receipt.resource?.id === issue.id && issue.author === 'trusted-publisher',
    beforeWrite: async () => { assert.equal(lease, true); },
    api: async (path, method = 'GET', body) => {
      assert.equal(lease, true);
      if (method === 'POST') writes.push({ path, body });
      if (path === 'issues' && method === 'POST') {
        assert.ok([...receipts.values()].some(receipt => receipt.state === 'intent'));
        const resource = { ...body, id: 1000 + issues.length, number: 200 + issues.length, author: 'trusted-publisher' };
        issues.push(resource); return resource;
      }
      const number = Number(path.split('/')[1]);
      if (path.endsWith('/parent')) return parents.has(number) ? { number: parents.get(number) } : null;
      if (path.endsWith('/sub_issues') && method === 'POST') { const resource = issues.find(issue => issue.id === body.sub_issue_id); parents.set(resource.number, number); return resource; }
      if (path.endsWith('/dependencies/blocked_by')) {
        if (method === 'POST') { dependencies.set(number, [...(dependencies.get(number) ?? []), { id: body.issue_id }]); return {}; }
        return dependencies.get(number) ?? [];
      }
      throw Error(`Unexpected API call: ${method} ${path}`);
    },
  };
  return { host, receipts, issues, parents, dependencies, writes };
}

test('versioned correlation round-trips and safely encodes HTML delimiters', () => {
  const value = epicCorrelation({ ...correlation(), slice: 'x --> <script>' });
  const marker = epicMarker(value);
  assert.equal(marker.match(/-->/g).length, 1);
  assert.deepEqual(readEpicMarker(`Author notes\n${marker}`), value);
  for (const body of [marker + marker, marker.replace('"schemaVersion":1', '"schemaVersion":2'), marker.replace('"kind":"child"', '"extra":true,"kind":"child"'), 'no metadata']) assert.equal(readEpicMarker(body), null);
});

test('creation establishes native parent/dependency links and retry makes no duplicate writes', async () => {
  const f = fixture();
  const first = await reconcileEpicChildren(plan(), context, f.host);
  assert.equal(first.status, 'reconciled');
  assert.equal(first.parent, 'open');
  assert.equal(f.issues.length, 2);
  assert.equal(f.parents.get(200), 146);
  assert.deepEqual(f.dependencies.get(201), [{ id: 1000 }]);
  const count = f.writes.length;
  assert.equal((await reconcileEpicChildren(plan(), context, f.host)).status, 'reconciled');
  assert.equal(f.writes.length, count);
  assert.equal(f.writes.some(write => write.path === 'issues/146'), false);
});

test('copied and duplicate markers without authenticated receipts cannot be adopted', async () => {
  for (const count of [1, 2]) {
    const f = fixture();
    for (let i = 0; i < count; i++) f.issues.push({ id: i + 1, number: i + 1, body: epicMarker(correlation()), author: 'trusted-publisher' });
    assert.equal((await reconcileEpicChildren(plan(), context, f.host)).status, 'blocked');
    assert.equal(f.writes.length, 0);
  }
});

test('lost create response leaves intent and never blindly creates again', async () => {
  const f = fixture(), api = f.host.api;
  f.host.api = async (...args) => { const result = await api(...args); if (args[0] === 'issues') throw Error('Response lost'); return result; };
  const first = await reconcileEpicChildren(plan(), context, f.host);
  assert.equal(first.children[0].state, 'uncertain');
  assert.equal([...f.receipts.values()][0].state, 'intent');
  f.host.api = api;
  assert.equal((await reconcileEpicChildren(plan(), context, f.host)).status, 'blocked');
  assert.equal(f.issues.length, 1);
  assert.equal(f.writes.length, 1);
});

test('lost native-link response reconciles the observed relationship on retry', async () => {
  const f = fixture(), api = f.host.api;
  let interrupted = false;
  f.host.api = async (...args) => { const result = await api(...args); if (!interrupted && args[0].endsWith('/sub_issues')) { interrupted = true; throw Error('Link response lost'); } return result; };
  assert.equal((await reconcileEpicChildren(plan(), context, f.host)).status, 'blocked');
  assert.equal((await reconcileEpicChildren(plan(), context, f.host)).status, 'reconciled');
  assert.equal(f.issues.length, 2);
  assert.equal(f.writes.filter(write => write.path.endsWith('/sub_issues')).length, 2);
});

test('edited metadata, changed native parent and revoked authority block continuation', async () => {
  for (const mutation of [
    f => { f.issues[0].body = f.issues[0].body.replace('"base":"lighthouse/epic-146"', '"base":"lighthouse/epic-147"'); },
    f => { f.parents.set(200, 99); },
    f => { f.host.beforeWrite = async () => { throw Error('Owner authorization revoked'); }; f.parents.delete(200); },
  ]) {
    const f = fixture(); await reconcileEpicChildren(plan(), context, f.host); mutation(f);
    const count = f.writes.length;
    assert.equal((await reconcileEpicChildren(plan(), context, f.host)).status, 'blocked');
    assert.equal(f.writes.length, count);
  }
});

test('missing resources and cancelled receipts never produce replacements', async () => {
  for (const cancelled of [false, true]) {
    const f = fixture(); await reconcileEpicChildren(plan(), context, f.host);
    const receipt = [...f.receipts.values()][0];
    if (cancelled) receipt.state = 'cancelled';
    f.issues.splice(0, 1);
    const count = f.writes.length;
    const result = await reconcileEpicChildren(plan(), context, f.host);
    assert.equal(result.status, 'blocked');
    assert.equal(result.children[0].state, cancelled ? 'cancelled' : 'uncertain');
    assert.equal(f.writes.length, count);
  }
});

test('host lease, journal and authentication callbacks and matching parent are mandatory', async () => {
  const f = fixture();
  await assert.rejects(reconcileEpicChildren(plan(), context, {}), /withLease/);
  await assert.rejects(reconcileEpicChildren(plan(), { ...context, parent: 147 }, f.host), /Parent identity/);
  const inconsistent = plan(); inconsistent.parent.number = 147;
  await assert.rejects(reconcileEpicChildren(inconsistent, { ...context, parent: 147, base: 'lighthouse/epic-147' }, f.host), /Parent identity/);
});

test('a revised plan cannot duplicate an existing stable slice identity', async () => {
  const f = fixture();
  await reconcileEpicChildren(plan(), context, f.host);
  const revised = plan(); revised.slices[0].acceptance.push('Additional evidence');
  const count = f.writes.length;
  assert.equal((await reconcileEpicChildren(revised, context, f.host)).status, 'blocked');
  assert.equal(f.writes.length, count);
});

test('malformed durable receipt state never permits recreation', async () => {
  const f = fixture();
  f.host.readReceipt = async () => ({ schemaVersion: 2, state: 'linked' });
  assert.equal((await reconcileEpicChildren(plan(), context, f.host)).status, 'blocked');
  assert.equal(f.writes.length, 0);
});

test('cancelled prerequisites stop dependent creation before any remote write', async () => {
  const f = fixture();
  f.host.readReceipt = async () => ({ schemaVersion: 1, state: 'cancelled', correlation: correlation() });
  const result = await reconcileEpicChildren(plan(), context, f.host);
  assert.deepEqual(result.children.map(child => child.state), ['cancelled', 'blocked']);
  assert.equal(f.writes.length, 0);
});

test('epic correlation cannot target another parent branch', () => {
  assert.throws(() => epicCorrelation({ ...correlation(), base: 'lighthouse/epic-147' }), /Invalid epic correlation/);
});
