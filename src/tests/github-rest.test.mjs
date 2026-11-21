import test from 'node:test';
import assert from 'node:assert/strict';
import { createIssueApi } from '../packages/sdlc/src/github-rest.mjs';

function fixture(responses) {
  let time = 1000;
  const calls = [], waits = [];
  const api = createIssueApi('owner/repo', {}, async (url, options) => {
    calls.push({ url, options });
    return responses.shift();
  }, { now: () => time, wait: async delay => { waits.push(delay); time += delay; } });
  return { api, calls, waits };
}

test('a transient comments read recovers within the original request budget', async () => {
  const f = fixture([Response.json({ message: 'Unavailable' }, { status: 503 }), Response.json([{ id: 18 }])]);
  assert.deepEqual(await f.api('issues/18/comments'), [{ id: 18 }]);
  assert.equal(f.calls.length, 2);
  assert.deepEqual(f.waits, [500]);
});

test('transient reads are bounded and retain the final safe diagnostic', async () => {
  for (const status of [429, 500, 502, 503, 504]) {
    const f = fixture(Array.from({ length: 3 }, () => Response.json({ message: 'Still unavailable' }, { status })));
    await assert.rejects(f.api('issues/18'), error => error.status === status && error.message.endsWith('Still unavailable'));
    assert.equal(f.calls.length, 3);
    assert.deepEqual(f.waits, [500, 1000]);
  }
});

test('mutations and permanent refusals never retry', async () => {
  for (const method of ['POST', 'PATCH', 'PUT', 'DELETE']) {
    const f = fixture([Response.json({ message: 'Unavailable' }, { status: 503 })]);
    await assert.rejects(f.api('issues/18', method, {}), /503/);
    assert.equal(f.calls.length, 1);
    assert.deepEqual(f.waits, []);
  }
  for (const status of [401, 403, 404, 409, 422]) {
    const f = fixture([Response.json({ message: 'Denied' }, { status })]);
    await assert.rejects(f.api('issues/18'), error => error.status === status);
    assert.equal(f.calls.length, 1);
  }
});

test('Retry-After is respected without extending the thirty-second deadline', async () => {
  const f = fixture([new Response(null, { status: 429, headers: { 'retry-after': '2' } }), Response.json({ id: 18 })]);
  assert.deepEqual(await f.api('issues/18'), { id: 18 });
  assert.deepEqual(f.waits, [2000]);
  const late = fixture([Response.json({ message: 'Later' }, { status: 503, headers: { 'retry-after': '31' } })]);
  await assert.rejects(late.api('issues/18'), /503/);
  assert.equal(late.calls.length, 1);
  assert.deepEqual(late.waits, []);
});

test('a 403 reports only allowlisted numeric rate metadata without reading its body or retrying', async () => {
  let read = false;
  const response = new Response(new ReadableStream({ pull() { read = true; throw Error('BODY_SENTINEL'); } }, { highWaterMark: 0 }), { status: 403, headers: {
    'x-ratelimit-limit': '1000', 'x-ratelimit-remaining': '0', 'x-ratelimit-reset': '1795267200', 'retry-after': '60',
    authorization: 'HEADER_SENTINEL', 'x-ratelimit-resource': 'RESOURCE_SENTINEL'
  } });
  const f = fixture([response]);
  await assert.rejects(f.api('issues/18'), error => {
    assert.equal(error.status, 403);
    assert.deepEqual(error.rateLimit, { limit: 1000, remaining: 0, reset: 1795267200, retryAfterSeconds: 60 });
    assert.equal(error.message, 'GitHub GET issues/18: 403 [rate-limit limit=1000 remaining=0 reset=1795267200 retryAfterSeconds=60]');
    return true;
  });
  assert.equal(read, false); assert.equal(f.calls.length, 1); assert.deepEqual(f.waits, []);
});

test('403 rate diagnostics distinguish available quota and reject untrusted numeric header values', async () => {
  for (const invalid of ['-1', '1.5', '1e3', '9007199254740992', 'BODY_SENTINEL', 'Wed, 21 Oct 2026 07:28:00 GMT', '']) {
    const f = fixture([Response.json({ message: 'BODY_SENTINEL' }, { status: 403, headers: {
      'x-ratelimit-limit': invalid, 'x-ratelimit-remaining': '42', 'x-ratelimit-reset': invalid, 'retry-after': invalid
    } })]);
    await assert.rejects(f.api('issues/18', 'POST', {}), error => {
      assert.deepEqual(error.rateLimit, { remaining: 42 });
      assert.equal(error.message, 'GitHub POST issues/18: 403 [rate-limit remaining=42]');
      return true;
    });
    assert.equal(f.calls.length, 1); assert.deepEqual(f.waits, []);
  }
});
