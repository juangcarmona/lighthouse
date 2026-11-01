import test from 'node:test';
import assert from 'node:assert/strict';
import { checkEpicCapacity } from '../packages/sdlc/src/epic-native.mjs';
import { buildDecompositionPlan } from '../packages/sdlc/src/decompose.mjs';
import { epicPlanDigest } from '../packages/sdlc/src/epic.mjs';
import { epicCorrelation, epicMarker } from '../packages/sdlc/src/epic-github.mjs';
import { dispatchId, dispatchReceiptBody } from '../packages/sdlc/src/stage-dispatch.mjs';

const repository = 'owner/repo', owner = 'owner', sourceRevision = 'a'.repeat(40), bot = { login: 'github-actions[bot]', type: 'Bot' };
function fixture() {
  const plan = buildDecompositionPlan({ schemaVersion: 1, parent: { id: 'GH-146', title: 'Parent' }, slices: [
    { id: 'a', title: 'A', dependencies: [], acceptance: ['A'] },
    { id: 'b', title: 'B', dependencies: [], acceptance: ['B'] },
  ] });
  const current = { parent: 146, slice: 'a', base: 'lighthouse/epic-146', planDigest: epicPlanDigest(plan), sourceRevision };
  const issues = plan.slices.map((slice, i) => ({ id: i + 100, number: i + 10, state: 'open', user: bot, labels: [], body: epicMarker(epicCorrelation({ repository, parent: 146, slice: slice.id, planDigest: current.planDigest, base: current.base, dependencies: slice.dependencies })) }));
  const requestId = dispatchId(repository, '400', 'implement');
  const receipt = { schemaVersion: 1, stage: 'implement', id: requestId, digest: 'b'.repeat(64), routerRunId: '400', routerAttempt: 1, workerRunId: null, status: 'requested' };
  const comments = new Map([[11, [{ id: 1, user: bot, issue_url: `https://api.github.com/repos/${repository}/issues/11`, body: dispatchReceiptBody(repository, receipt) }]]]);
  const api = async path => {
    const match = path.match(/^issues\/(\d+)(\/comments\?.*)?$/);
    if (!match) throw Error(`Unexpected ${path}`);
    return match[2] ? comments.get(Number(match[1])) ?? [] : issues.find(issue => issue.number === Number(match[1]));
  };
  const args = { api, repository, owner, child: 10, current, capacity: 2, prepare: async () => ({ sourceRevision, plan }), findCandidates: async (_api, correlation) => issues.filter(issue => issue.body.includes(`\"slice\":\"${correlation.slice}\"`)) };
  return { issues, requestId, receipt, comments, args, run: () => checkEpicCapacity(args) };
}

test('epic capacity counts active implementation requests under the parent lease', async () => {
  const f = fixture();
  assert.deepEqual(await f.run(), { occupied: 1, capacity: 2 });
  f.args.capacity = 1;
  await assert.rejects(f.run(), /capacity is occupied/);
  f.args.excludeRequest = f.requestId;
  assert.deepEqual(await f.run(), { occupied: 0, capacity: 1 });
});

test('epic capacity fails closed when inventory or reservations are uncertain', async () => {
  const f = fixture();
  f.args.capacity = 0;
  await assert.rejects(f.run(), /between 1 and 8/);
  f.args.capacity = 2;
  f.issues[0].body += ' changed <!-- lighthouse-epic:bad -->';
  await assert.rejects(f.run(), /inventory changed/);
});

test('closing a child does not free capacity while its implementation is active', async () => {
  const f = fixture();
  f.issues[1].state = 'closed';
  f.args.capacity = 1;
  await assert.rejects(f.run(), /capacity is occupied/);
  f.receipt.status = 'completed';
  f.comments.get(11)[0].body = dispatchReceiptBody(repository, f.receipt);
  assert.deepEqual(await f.run(), { occupied: 0, capacity: 1 });
});
