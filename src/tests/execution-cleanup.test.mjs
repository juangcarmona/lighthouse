import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, readFileSync, readdirSync, symlinkSync, mkdirSync, writeFileSync, existsSync, renameSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createExecutionOwner, recoverExecutionOwners, recoverExecutionWorkspaces } from '../packages/sdlc/src/execution-cleanup.mjs';

const identity = { repository: 'owner/repo', runId: 'a'.repeat(64), workflowRunId: '123', attempt: 1 };
function fixture() {
  const directory = mkdtempSync(join(tmpdir(), 'lh-cleanup-')), resources = [], calls = [];
  let next = 0;
  const control = { noOp: false, lostRemove: false, unavailable: false, incomplete: false };
  const run = args => {
    calls.push(args);
    if (control.unavailable) throw Error('Runtime unavailable');
    if (args[1] === 'ls') {
      const filter = args[args.indexOf('--filter') + 1];
      return resources.filter(row => row.type === args[0] && (filter.startsWith('name=') ? new RegExp(filter.slice(5)).test(row.name) : filter === 'label=io.lighthouse.execution' ? row.owner : row.owner === filter.split('=').at(-1))).map(row => row.id).join('\n');
    }
    if (args[1] === 'inspect') {
      const rows = resources.filter(row => row.type === args[0] && args.includes(row.id));
      return (control.incomplete ? rows.slice(1) : rows).map(row => JSON.stringify(row)).join('\n');
    }
    if (args[1] === 'rm') {
      if (!control.noOp) {
        const index = resources.findIndex(row => args.includes(row.id));
        if (index >= 0) resources.splice(index, 1);
      }
      if (control.lostRemove) throw Error('Lost remove acknowledgement');
      return '';
    }
    throw Error('Unexpected runtime command');
  };
  const owner = createExecutionOwner(directory, identity, { run });
  const allocate = (type = 'container', who = owner) => {
    const name = `${who.prefix}-${type}`;
    const args = who.prepare(type === 'container' ? ['run', '--name', name, 'image'] : ['network', 'create', name]);
    const resource = { type, name, id: (++next).toString(16).padStart(64, '0'), owner: args[args.indexOf('--label') + 1].split('=')[1] };
    // The journal must exist before the runtime can observe the create request.
    assert.ok(JSON.parse(readFileSync(join(directory, `${resource.owner}.json`))).resources.some(item => item.name === name));
    resources.push(resource);
    return args;
  };
  return { directory, owner, allocate, resources, calls, run, control, dispose: () => rmSync(directory, { recursive: true, force: true }) };
}
test('cleanup independently inventories owned containers and networks and preserves other attempts', () => {
  const f = fixture();
  try {
    f.allocate(); f.allocate('network');
    const other = createExecutionOwner(f.directory, { ...identity, attempt: 2 }, { run: f.run });
    f.allocate('container', other); f.allocate('network', other);
    const receipt = f.owner.cleanup();
    assert.equal(receipt.status, 'clean'); assert.deepEqual(receipt.remaining, []);
    assert.equal(f.resources.length, 2); assert.ok(f.resources.every(row => row.name.startsWith(other.prefix)));
    assert.ok(f.calls.slice(f.calls.findLastIndex(args => args[1] === 'rm') + 1).some(args => args[1] === 'ls'));
    assert.equal(f.owner.cleanup().status, 'clean');
    assert.throws(() => f.owner.prepare(['run', 'image']), /terminated/);
  } finally { f.dispose(); }
});
test('a successful no-op removal is failed; a lost remove acknowledgement reconciles from absence', () => {
  const f = fixture();
  try {
    f.allocate(); f.control.noOp = true;
    const leftover = f.owner.cleanup(); assert.equal(leftover.status, 'failed'); assert.equal(leftover.remaining.length, 1);
    f.control.noOp = false; f.control.lostRemove = true;
    const reconciled = f.owner.cleanup(); assert.equal(reconciled.status, 'clean'); assert.equal(reconciled.removalErrors, 1);
  } finally { f.dispose(); }
});
test('lost create responses require observing ownership; absence alone cannot resolve a pending create', () => {
  const f = fixture();
  try {
    const args = f.allocate();
    assert.equal(f.owner.observe(), true);
    assert.equal(f.owner.cleanup().status, 'clean');
    const second = createExecutionOwner(f.directory, { ...identity, attempt: 2 }, { run: f.run });
    const pending = second.prepare(['run', 'image']);
    assert.equal(second.observe(), false);
    assert.equal(second.cleanup().status, 'unknown');
    second.completed(pending); assert.equal(second.cleanup().status, 'clean');
    assert.ok(args.includes('--label'));
  } finally { f.dispose(); }
});
test('runtime outages, incomplete inventory and changed ownership never claim clean or delete another owner', () => {
  for (const fault of ['unavailable', 'incomplete', 'owner']) {
    const f = fixture();
    try {
      f.allocate();
      if (fault === 'owner') f.resources[0].owner = 'b'.repeat(64); else f.control[fault] = true;
      assert.equal(f.owner.cleanup().status, 'unknown');
      assert.equal(f.calls.some(args => args[1] === 'rm'), false);
      assert.equal(f.resources.length, 1);
    } finally { f.dispose(); }
  }
});
test('restart recovers only stopped durable owners; active and unknown process identities are retained', () => {
  const f = fixture();
  try {
    f.allocate(); f.allocate('network');
    for (const isStopped of [() => false, () => null]) {
      assert.throws(() => recoverExecutionOwners(f.directory, { run: f.run, isStopped }), /active|unknown/);
      assert.equal(f.resources.length, 2);
    }
    const receipts = recoverExecutionOwners(f.directory, { run: f.run, isStopped: () => true });
    assert.equal(receipts.length, 1); assert.equal(receipts[0].status, 'clean'); assert.equal(f.resources.length, 0);
    assert.deepEqual(recoverExecutionOwners(f.directory, { run: f.run }), []);
    assert.throws(() => createExecutionOwner(f.directory, identity, { run: f.run }), /EEXIST/);
  } finally { f.dispose(); }
});
test('missing ownership and substituted journals block admission without guessing cleanup targets', () => {
  for (const fault of ['missing', 'symlink']) {
    const f = fixture();
    try {
      f.allocate(); const path = join(f.directory, readdirSync(f.directory)[0]);
      rmSync(path);
      if (fault === 'symlink') symlinkSync('/etc/passwd', path);
      assert.throws(() => recoverExecutionOwners(f.directory, { run: f.run }), /journal|ownership/);
      assert.equal(f.calls.some(args => args[1] === 'rm'), false);
    } finally { f.dispose(); }
  }
});
test('a previous clean receipt cannot hide a late resource or authorize deleting a live attempt', () => {
  const f = fixture();
  try {
    const args = f.allocate(), resource = { ...f.resources[0] };
    assert.equal(f.owner.cleanup().status, 'clean'); f.resources.push(resource);
    assert.throws(() => recoverExecutionOwners(f.directory, { run: f.run }), /active/);
    assert.equal(recoverExecutionOwners(f.directory, { run: f.run, isStopped: () => true })[0].status, 'clean');
    assert.ok(args.includes('--name'));
  } finally { f.dispose(); }
});
test('phase cleanup refuses a substituted owner before the Docker removal, including networks', () => {
  for (const type of ['container', 'network']) {
    const f = fixture();
    try {
      f.allocate(type); const resource = f.resources[0]; resource.owner = 'b'.repeat(64);
      assert.throws(() => f.owner.prepare(type === 'container' ? ['rm', '-f', resource.name] : ['network', 'rm', resource.name]), /ownership|inventory/);
      assert.equal(f.calls.some(args => args[1] === 'rm'), false);
      assert.throws(() => f.owner.prepare(['run', 'image']), /reconcile/);
      assert.equal(f.resources.length, 1);
    } finally { f.dispose(); }
  }
});
test('phase removal resolves checked ownership to immutable IDs and handles confirmed absence', () => {
  const f = fixture();
  try {
    f.allocate(); const resource = f.resources[0];
    assert.deepEqual(f.owner.prepare(['rm', '-f', resource.name, `${f.owner.prefix}-never-created`]), ['rm', '-f', '-v', resource.id]);
    assert.deepEqual(f.owner.prepare(['container', 'rm', '--force', '--volumes', resource.name]), ['container', 'rm', '--force', '--volumes', resource.id]);
    f.resources.length = 0;
    assert.deepEqual(f.owner.prepare(['rm', '-f', resource.name]), []);
  } finally { f.dispose(); }
});
test('a phase no-op removal prevents another allocation until owned absence is observed', () => {
  const f = fixture();
  try {
    f.allocate(); const args = ['rm', '-f', f.resources[0].name];
    f.owner.prepare(args);
    assert.throws(() => f.owner.removed(args), /not verified absent/);
    assert.throws(() => f.owner.prepare(['run', 'image']), /reconcile/);
    f.resources.length = 0; assert.doesNotThrow(() => f.owner.removed(args));
    assert.equal(f.owner.cleanup().status, 'clean');
  } finally { f.dispose(); }
});

async function workspaceFixture(f) {
  const path = await f.owner.allocateWorkspace(f.directory);
  mkdirSync(join(path, 'source')); mkdirSync(join(path, 'output/evidence'), { recursive: true });
  const baseline = new Map([['demo.js', { content: Buffer.from('original'), mode: '100644' }], ['.gitignore', { content: Buffer.from('node_modules/\n.cache/\n'), mode: '100644' }]]);
  for (const [name, file] of baseline) writeFileSync(join(path, 'source', name), file.content);
  await f.owner.checkpointWorkspace(baseline, baseline, { paths: ['*'] });
  writeFileSync(join(path, 'source/demo.js'), 'modified source');
  mkdirSync(join(path, 'source/node_modules')); writeFileSync(join(path, 'source/node_modules/dependency'), 'disposable');
  mkdirSync(join(path, 'source/.cache')); writeFileSync(join(path, 'source/.cache/download'), 'disposable');
  writeFileSync(join(path, 'output/evidence/report.txt'), 'diagnostic');
  return path;
}
test('workspace recovery requires stopped ownership and runtime absence, then retains edits before disposal', async () => {
  const f = fixture();
  try {
    const path = await workspaceFixture(f);
    for (const isStopped of [() => false, () => null]) {
      await assert.rejects(recoverExecutionWorkspaces(f.directory, { isStopped }), /active|unknown/);
      assert.equal(existsSync(path), true);
    }
    await assert.rejects(recoverExecutionWorkspaces(f.directory, { isStopped: () => true }), /runtime resources/);
    f.owner.cleanup();
    await recoverExecutionWorkspaces(f.directory, { isStopped: () => true });
    assert.equal(existsSync(path), false);
    const bundle = join(f.directory, 'retained', readdirSync(join(f.directory, 'retained'))[0]);
    const changes = JSON.parse(readFileSync(join(bundle, 'changes.json')));
    assert.equal(changes.length, 1); assert.equal(Buffer.from(changes[0].content, 'base64').toString(), 'modified source');
    assert.equal(readFileSync(join(bundle, 'evidence/report.txt'), 'utf8'), 'diagnostic');
    await recoverExecutionWorkspaces(f.directory, { isStopped: () => true });
  } finally { f.dispose(); }
});
test('workspace identity substitution, unsafe evidence and checkpoint changes preserve original recovery state', async () => {
  for (const fault of ['substitution', 'evidence', 'checkpoint']) {
    const f = fixture();
    try {
      const path = await workspaceFixture(f); f.owner.cleanup();
      if (fault === 'substitution') { renameSync(path, `${path}-original`); mkdirSync(path); writeFileSync(join(path, 'foreign'), 'preserve'); }
      if (fault === 'evidence') symlinkSync(join(path, 'source/demo.js'), join(path, 'output/evidence/link'));
      if (fault === 'checkpoint') writeFileSync(join(path, 'recovery.json'), '{}');
      await assert.rejects(f.owner.cleanupWorkspace(), /identity|Unsafe evidence|baseline changed/);
      assert.equal(existsSync(path), true);
      assert.equal(readFileSync(join(fault === 'substitution' ? `${path}-original` : path, 'source/demo.js'), 'utf8'), 'modified source');
    } finally { f.dispose(); }
  }
});
test('local recovery count limits block admission without deleting retained candidates or foreign paths', async () => {
  const f = fixture();
  try {
    const root = join(f.directory, 'retained'); mkdirSync(root);
    for (let index = 0; index < 32; index++) writeFileSync(join(root, `held-${index}`), 'candidate');
    await assert.rejects(f.owner.allocateWorkspace(f.directory), /retention limit/);
    assert.equal(readdirSync(root).length, 32);
    assert.equal(readdirSync(f.directory).filter(name => name.startsWith('lighthouse-engine-')).length, 0);
  } finally { f.dispose(); }
});
test('local recovery byte limits are enforced before allocation without evicting retained evidence', async () => {
  const { openSync, ftruncateSync, closeSync } = await import('node:fs');
  const f = fixture();
  try {
    const root = join(f.directory, 'retained'); mkdirSync(root);
    const fd = openSync(join(root, 'retained-report'), 'w');
    try { ftruncateSync(fd, 512 * 1024 * 1024 + 1); } finally { closeSync(fd); }
    await assert.rejects(f.owner.allocateWorkspace(f.directory), /retention limit/);
    assert.equal(existsSync(join(root, 'retained-report')), true);
  } finally { f.dispose(); }
});
test('interrupted workspace removal retries from sealed retention and rejects changed retained evidence', async () => {
  for (const tampered of [false, true]) {
    const f = fixture();
    try {
      const path = await workspaceFixture(f); f.owner.cleanup();
      await assert.rejects(f.owner.cleanupWorkspace({ remove: async () => {} }), /remains after removal/);
      assert.equal(existsSync(path), true);
      const retained = join(f.directory, 'retained', readdirSync(join(f.directory, 'retained'))[0]);
      if (tampered) {
        writeFileSync(join(retained, 'changes.json'), '[]');
        await assert.rejects(recoverExecutionWorkspaces(f.directory, { isStopped: () => true }), /evidence changed/);
        assert.equal(existsSync(path), true);
      } else {
        await recoverExecutionWorkspaces(f.directory, { isStopped: () => true });
        assert.equal(existsSync(path), false);
      }
    } finally { f.dispose(); }
  }
});
