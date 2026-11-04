import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, readFileSync, readdirSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createExecutionOwner, recoverExecutionOwners } from '../packages/sdlc/src/execution-cleanup.mjs';

const identity = { repository: 'owner/repo', runId: 'a'.repeat(64), workflowRunId: '123', attempt: 1 };
function fixture() {
  const directory = mkdtempSync(join(tmpdir(), 'lh-cleanup-')), resources = [], calls = [];
  let next = 0;
  const control = { noOp: false, lostRemove: false, unavailable: false, incomplete: false };
  const run = args => {
    calls.push(args);
    if (control.unavailable) throw Error('Runtime unavailable');
    if (args[1] === 'ls') return resources.filter(row => row.type === args[0]).map(row => row.id).join('\n');
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
    assert.equal(f.calls.filter(args => args[1] === 'ls').length, 4);
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
    assert.equal(f.owner.cleanup().status, 'clean');
    const second = createExecutionOwner(f.directory, { ...identity, attempt: 2 }, { run: f.run });
    const pending = second.prepare(['run', 'image']);
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
