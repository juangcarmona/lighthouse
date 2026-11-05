import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync, verify } from 'node:crypto';
import { githubAppCiTrigger } from '../packages/sdlc/src/github-app-ci.mjs';

const keys = generateKeyPairSync('rsa', { modulusLength: 2048 });
const privateKey = keys.privateKey.export({ type: 'pkcs8', format: 'pem' });
const env = { GITHUB_REPOSITORY: 'owner/repo', LIGHTHOUSE_CI_APP_CLIENT_ID: 'test-client', LIGHTHOUSE_CI_APP_PRIVATE_KEY: privateKey };
const head = 'a'.repeat(40), branch = 'lighthouse/verification-12-' + head;
function fixture({ failure, scope = {}, reference, revokeFailure = false } = {}) {
  let timestamp = Date.parse('2026-11-05T06:00:00Z');
  const token = ['installation', 'credential'].join('-'), calls = [];
  const fetchImpl = async (url, options) => {
    const path = new URL(url).pathname;
    calls.push({ path, options });
    if (failure?.path === path) {
      if (failure.throw) throw Error(token + privateKey);
      return new Response(JSON.stringify({ message: token + privateKey }), { status: failure.status });
    }
    if (path === '/repos/owner/repo/installation') {
      const jwt = options.headers.authorization.slice(7), [header, payload, signature] = jwt.split('.');
      assert.deepEqual(JSON.parse(Buffer.from(header, 'base64url')), { alg: 'RS256', typ: 'JWT' });
      assert.equal(verify('RSA-SHA256', Buffer.from(header + '.' + payload), keys.publicKey, Buffer.from(signature, 'base64url')), true);
      assert.deepEqual(JSON.parse(Buffer.from(payload, 'base64url')), { iat: timestamp / 1000 - 60, exp: timestamp / 1000 + 540, iss: 'test-client' });
      return Response.json({ id: 7 });
    }
    if (path === '/app/installations/7/access_tokens') {
      assert.deepEqual(JSON.parse(options.body), { repositories: ['repo'], permissions: { contents: 'write' } });
      return Response.json({ token, permissions: { contents: 'write', metadata: 'read' }, repositories: [{ full_name: 'owner/repo' }], expires_at: new Date(timestamp + 3600000).toISOString(), ...scope });
    }
    assert.equal(options.headers.authorization, 'Bearer ' + token);
    if (path === '/repos/owner/repo/git/refs') {
      assert.deepEqual(JSON.parse(options.body), { ref: 'refs/heads/' + branch, sha: head });
      return Response.json(reference ?? { ref: 'refs/heads/' + branch, object: { sha: head, type: 'commit' } });
    }
    assert.equal(path, '/installation/token'); assert.equal(options.method, 'DELETE');
    return new Response(null, { status: revokeFailure ? 503 : 204 });
  };
  return { calls, token, trigger: githubAppCiTrigger(env, { fetchImpl, now: () => timestamp }), advance: () => { timestamp += 7200000; } };
}

test('App CI credentials are explicit, lazy and restricted to the current repository', async () => {
  assert.equal(githubAppCiTrigger({}), null);
  assert.equal(typeof githubAppCiTrigger({ ...env, LIGHTHOUSE_CI_APP_CLIENT_ID: 'Iv1.example' }), 'function');
  for (const invalid of [{ ...env, LIGHTHOUSE_CI_APP_CLIENT_ID: '' }, { ...env, LIGHTHOUSE_CI_APP_PRIVATE_KEY: '' }, { ...env, GITHUB_REPOSITORY: '../other' }]) assert.throws(() => githubAppCiTrigger(invalid), /Configure/);
  const f = fixture(); assert.equal(f.calls.length, 0); f.advance();
  let checked = false;
  const result = await f.trigger({ branch, head, beforeWrite: async () => { checked = true; assert.equal(f.calls.length, 2); } });
  assert.equal(checked, true); assert.equal(result.tokenRevoked, true); assert.equal(result.installation, 7);
  assert.ok(!JSON.stringify(result).includes(f.token)); assert.ok(!JSON.stringify(result).includes(privateKey));
  const annotated = fixture({ scope: { expires_at: 'Thu, 05 Nov 2026 07:00:00 GMT (installation-credential)' } });
  const receipt = await annotated.trigger({ branch, head });
  assert.equal(receipt.expiresAt, '2026-11-05T07:00:00.000Z');
  assert.ok(!JSON.stringify(receipt).includes(annotated.token));
  const probe = fixture(), probeReceipt = await probe.trigger({ probe: true });
  assert.equal(probe.calls.some(x => x.path.endsWith('/git/refs')), false);
  assert.equal(probeReceipt.tokenRevoked, true);
  assert.equal(probeReceipt.ref, undefined);
});

test('arbitrary refs, mismatched commits and invalid keys cannot reach reference creation', async () => {
  const f = fixture();
  for (const value of [{ branch: 'main', head }, { branch, head: 'b'.repeat(40) }, { branch, head, probe: 'false' }]) await assert.rejects(f.trigger(value), /Invalid/);
  assert.equal(f.calls.length, 0);
  const bad = githubAppCiTrigger({ ...env, LIGHTHOUSE_CI_APP_PRIVATE_KEY: 'invalid key' }, { fetchImpl: () => assert.fail('invalid key reached API') });
  await assert.rejects(bad({ branch, head }), /setup or authorization failed/);
});

test('broad, expired or unverified installation scopes are revoked without a ref write', async () => {
  for (const scope of [{ permissions: { contents: 'write', pull_requests: 'write' } }, { repositories: [] }, { repositories: [{ full_name: 'other/repo' }] }, { expires_at: '2020-01-01' }, { expires_at: '2099-01-01' }]) {
    const f = fixture({ scope });
    await assert.rejects(f.trigger({ branch, head }), error => error.referenceAttempted === false);
    assert.equal(f.calls.some(x => x.path.endsWith('/git/refs')), false);
    assert.equal(f.calls.at(-1).path, '/installation/token');
  }
});

test('current authority is checked after minting and before the sole ref effect', async () => {
  const f = fixture();
  await assert.rejects(f.trigger({ branch, head, beforeWrite: async () => { throw Error('Owner revoked'); } }), /authority changed/);
  assert.equal(f.calls.some(x => x.path.endsWith('/git/refs')), false);
  assert.equal(f.calls.at(-1).path, '/installation/token');
});

test('rejection and uncertain writes preserve safe effect facts without credential diagnostics', async () => {
  for (const failure of [{ path: '/repos/owner/repo/installation', status: 401 }, { path: '/repos/owner/repo/git/refs', status: 503 }, { path: '/repos/owner/repo/git/refs', throw: true }]) {
    const f = fixture({ failure });
    await assert.rejects(f.trigger({ branch, head }), error => {
      assert.equal(error.referenceAttempted, failure.path.endsWith('/git/refs'));
      assert.ok(!error.message.includes(f.token)); assert.ok(!error.message.includes(privateKey)); return true;
    });
  }
  const unconfirmed = fixture({ reference: { ref: 'refs/heads/main', object: { sha: head, type: 'commit' } } });
  await assert.rejects(unconfirmed.trigger({ branch, head }), error => error.referenceAttempted === true);
  const cleanup = fixture({ revokeFailure: true });
  assert.equal((await cleanup.trigger({ branch, head })).tokenRevoked, false);
});
