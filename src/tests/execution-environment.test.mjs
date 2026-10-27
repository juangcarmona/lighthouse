import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { validateEnvironment, selectEnvironment, startEnvironment, environmentArgs, environmentReceipt } from '../packages/sdlc/src/execution-environment.mjs';
import { loadImplementation, changesDigest, validateCheckReceipt } from '../packages/sdlc/src/implementation.mjs';
import { validateBuildInputs } from '../examples/opencode-engine/build-environments.mjs';

const image = `sha256:${'a'.repeat(64)}`, postgresImage = `sha256:${'b'.repeat(64)}`;
const declaration = { schemaVersion: 1, profile: 'dotnet', services: ['postgresql'] };
const selected = { profile: 'dotnet', image, postgresImage };
function fixture(fail = () => false) {
  const calls = [];
  return { calls, run(args) {
    calls.push(args);
    if (fail(args)) throw Error('private Docker diagnostic');
    if (args.includes('node')) return 'v24.13.0\n';
    if (args.includes('opencode')) return 'opencode v2.1.0\n';
    if (args.includes('dotnet')) return '10.0.100\n';
    if (args.includes('postgres')) return 'postgres (PostgreSQL) 17.7\n';
    return 'ok\n';
  } };
}
test('repository declaration rejects unsupported profiles, services and extra control fields', () => {
  assert.equal(validateEnvironment(declaration), declaration);
  for (const value of [null, {}, { ...declaration, profile: 'custom' }, { ...declaration, services: ['redis'] }, { ...declaration, services: ['postgresql', 'postgresql'] }, { ...declaration, image }, { ...declaration, services: null }]) assert.throws(() => validateEnvironment(value), /environment.json/);
  assert.equal(selectEnvironment({}, null), null);
  assert.throws(() => selectEnvironment({}, declaration), /provision/);
  assert.throws(() => selectEnvironment({ environments: { dotnet: { image: 'node:latest' } } }, declaration), /pinned/);
  assert.throws(() => selectEnvironment({ environments: { dotnet: { image } } }, declaration), /PostgreSQL 17/);
  assert.deepEqual(selectEnvironment({ environments: { dotnet: { image, postgresImage } } }, declaration), selected);
});
test('selection is read at source revision and is shared across issues', async () => {
  const revision = 'c'.repeat(40), calls = [];
  const api = async path => {
    calls.push(path); assert.ok(path.endsWith(`?ref=${revision}`));
    const value = path.includes('environment.json') ? declaration : path.includes('package.json') ? { scripts: { verify: 'node verify.mjs' } } : null;
    return value ? { content: Buffer.from(JSON.stringify(value)).toString('base64') } : null;
  };
  for (const issue of [1, 2]) assert.deepEqual((await loadImplementation(api, issue, 'owner', revision, 'main')).environment, declaration);
  assert.equal(calls.filter(p => p.includes('environment.json')).length, 2);
});
test('prerequisites run without source, credentials or Docker mounts; services are run isolated and cleaned', async () => {
  const f = fixture();
  const runtime = await startEnvironment({ selected, name: 'lighthouse-test-agent', uid: 20003, run: f.run });
  const probes = f.calls.filter(a => a.includes('--entrypoint'));
  assert.equal(probes.length, 6);
  for (const args of probes) {
    assert.ok(args.includes('--read-only')); assert.ok(args.includes('none'));
    assert.ok(!args.includes('--mount')); assert.ok(!args.join(' ').includes('docker.sock'));
  }
  const service = f.calls.find(a => a.includes('-d'));
  assert.ok(!service.includes('-p')); assert.ok(!service.includes('--publish'));
  assert.ok(service.includes('--network-alias')); assert.ok(service.includes('--tmpfs'));
  assert.match(runtime.env.find(v => v.startsWith('SOFA_TEST_DATABASE=')), /Host=postgres;.*Database=sofa/);
  assert.ok(environmentArgs(runtime).includes('lighthouse-test-agent-network'));
  assert.deepEqual(environmentReceipt(selected), { profile: 'dotnet', image, services: [{ type: 'postgresql', image: postgresImage }] });
  assert.ok(!JSON.stringify(environmentReceipt(selected)).includes('Password'));
  assert.equal(runtime.cleanup(), true);
  assert.deepEqual(f.calls.at(-2), ['rm', '-f', '-v', 'lighthouse-test-agent-postgres']);
  assert.deepEqual(f.calls.at(-1), ['network', 'rm', 'lighthouse-test-agent-network']);
  const count = f.calls.length; runtime.cleanup(); assert.equal(f.calls.length, count);
});
test('missing SDK stops before any database or agent and hides Docker diagnostics', async () => {
  const f = fixture(a => a.includes('dotnet'));
  await assert.rejects(startEnvironment({ selected, name: 'lighthouse-test-agent', uid: 20003, run: f.run }), /prerequisite failed: .NET SDK/);
  assert.ok(!f.calls.some(a => a.includes('-d')));
});
test('missing base tools stop preflight before any test service starts', async () => {
  for (const [tool, label] of [['node', 'Node.js 24'], ['npm', 'npm'], ['git', 'Git'], ['chromium', 'Chromium'], ['opencode', 'OpenCode 2.1.0']]) {
    const f = fixture(args => args.includes('--entrypoint') && args.includes(tool));
    await assert.rejects(startEnvironment({ selected, name: 'lighthouse-test-agent', uid: 20003, run: f.run }), {
      message: `Environment dotnet prerequisite failed: ${label}; rebuild and repin the selected image`
    });
    assert.ok(!f.calls.some(args => args[0] === 'network' || args.includes('-d')));
  }
});
test('incompatible tool versions stop preflight before service provisioning', async () => {
  for (const [tool, version, requirement] of [['node', 'v22.0.0', 'Node.js 24'], ['opencode', 'opencode v2.0.0', 'OpenCode 2.1.0'], ['dotnet', '10.0.101', '.NET SDK 10.0.100']]) {
    const f = fixture();
    const run = args => {
      const result = f.run(args);
      return args.includes('--entrypoint') && args.includes(tool) ? version : result;
    };
    await assert.rejects(startEnvironment({ selected, name: 'lighthouse-test-agent', uid: 20003, run }), { message: `Environment requires ${requirement}` });
    assert.ok(!f.calls.some(args => args[0] === 'network' || args.includes('-d')));
  }
});
test('an incompatible PostgreSQL version stops execution and cleans the service', async () => {
  const f = fixture();
  const run = args => {
    const result = f.run(args);
    return args[0] === 'exec' && args.includes('--version') ? 'postgres (PostgreSQL) 16.4\n' : result;
  };
  await assert.rejects(startEnvironment({ selected, name: 'lighthouse-test-agent', uid: 20003, run }), { message: 'Environment requires PostgreSQL 17' });
  assert.deepEqual(f.calls.at(-2), ['rm', '-f', '-v', 'lighthouse-test-agent-postgres']);
  assert.deepEqual(f.calls.at(-1), ['network', 'rm', 'lighthouse-test-agent-network']);
});
test('service failures and readiness timeout remove attempted containers and networks', async () => {
  for (const fail of [a => a.includes('-d'), a => a.includes('pg_isready'), a => a[0] === 'network' && a[1] === 'create']) {
    const f = fixture(fail);
    await assert.rejects(startEnvironment({ selected, name: 'lighthouse-test-agent', uid: 20003, run: f.run, sleep: async () => {} }), /provisioning failed|readiness timed out/);
    assert.deepEqual(f.calls.at(-1), ['network', 'rm', 'lighthouse-test-agent-network']);
    if (f.calls.some(a => a.includes('-d'))) assert.deepEqual(f.calls.at(-2), ['rm', '-f', '-v', 'lighthouse-test-agent-postgres']);
  }
});
test('agent and validation phases have different networks and fresh database credentials', async () => {
  const f = fixture(), runtimes = [];
  for (const phase of ['agent', 'validation']) runtimes.push(await startEnvironment({ selected, name: `lighthouse-test-${phase}`, uid: 20003, run: f.run }));
  assert.notEqual(runtimes[0].network, runtimes[1].network);
  assert.notEqual(runtimes[0].env.at(-1), runtimes[1].env.at(-1));
  for (const runtime of runtimes) runtime.cleanup();
});
test('cleanup failures are explicit and can be retried without exposing connection strings', async () => {
  let failing = false; const messages = [];
  const f = fixture(a => failing && a[0] === 'rm');
  const runtime = await startEnvironment({ selected, name: 'lighthouse-test-agent', uid: 20003, run: f.run, warn: message => messages.push(message) });
  failing = true; assert.equal(runtime.cleanup(), false);
  assert.match(messages[0], /operator cleanup required/); assert.ok(!messages[0].includes('Password'));
  failing = false; assert.equal(runtime.cleanup(), true);
});
test('base profile needs no SDK or service and legacy selection adds no arguments', async () => {
  const f = fixture();
  const runtime = await startEnvironment({ selected: { profile: 'base', image }, name: 'lighthouse-test-agent', uid: 20003, run: f.run });
  assert.ok(!f.calls.some(a => a.includes('dotnet') || a.includes('-d')));
  assert.ok(!environmentArgs(runtime).includes('--network'));
  assert.deepEqual(environmentArgs(await startEnvironment({})), []);
});
test('image build inputs are immutable and both recipes use fixed package and SDK inputs', async () => {
  const inputs = { nodeImage: `node@${image}`, sdkImage: `mcr.microsoft.com/dotnet/sdk@${image}`, postgresImage: `postgres@${postgresImage}`, opencodeSha256: 'c'.repeat(64) };
  assert.equal(validateBuildInputs(inputs), inputs);
  for (const key of ['nodeImage', 'sdkImage', 'postgresImage', 'opencodeSha256']) assert.throws(() => validateBuildInputs({ ...inputs, [key]: 'latest' }));
  const recipe = await readFile(new URL('../examples/opencode-engine/Dockerfile.environments', import.meta.url), 'utf8');
  assert.match(recipe, /20261026T000000Z/); assert.match(recipe, /sha256sum --check/);
  assert.match(recipe, /10\.0\.100/); assert.match(recipe, /FROM base AS dotnet/);
});

test('declared environment check receipts require matching profile and immutable provenance', () => {
  const request = { runId: 'a'.repeat(64), sourceRevision: 'b'.repeat(40), implementation: { environment: declaration, policy: { checks: [['npm', 'test']] } } };
  const receipt = { runId: request.runId, sourceRevision: request.sourceRevision, changesDigest: changesDigest([]), image, environment: environmentReceipt(selected), serviceCleanup: true, checks: [{ command: ['npm', 'test'], exitCode: 0 }] };
  assert.equal(validateCheckReceipt(receipt, request, []), true);
  assert.equal(validateCheckReceipt({ ...receipt, serviceCleanup: false }, request, []), false);
  for (const environment of [null, { ...receipt.environment, profile: 'base' }, { ...receipt.environment, image: 'latest' }, { ...receipt.environment, services: [] }, { ...receipt.environment, services: [{ type: 'postgresql', image: 'latest' }] }]) assert.throws(() => validateCheckReceipt({ ...receipt, environment }, request, []), /environment receipt/);
});
