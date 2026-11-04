// Trusted Linux/Docker adapter only: persist ownership before allocation and observe absence after removal.
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync, renameSync, lstatSync, statSync, readdirSync, openSync, fsyncSync, closeSync } from 'node:fs';
import { join, dirname, isAbsolute } from 'node:path';

const label = 'io.lighthouse.execution';
const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const docker = args => execFileSync('docker', args, { encoding: 'utf8', timeout: 30000, maxBuffer: 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] });
const processIdentity = pid => ({ boot: readFileSync('/proc/sys/kernel/random/boot_id', 'utf8').trim(), start: readFileSync(`/proc/${pid}/stat`, 'utf8').split(') ').at(-1).split(' ')[19], namespace: statSync(`/proc/${pid}/ns/pid`).ino });
const currentProcess = () => ({ pid: process.pid, ...processIdentity(process.pid) });
function stopped(process) {
  try {
    if (readFileSync('/proc/sys/kernel/random/boot_id', 'utf8').trim() !== process.boot) return true;
    // A changed PID namespace cannot prove that an earlier host process is gone.
    if (statSync('/proc/self/ns/pid').ino !== process.namespace) return null;
    return processIdentity(process.pid).start !== process.start;
  } catch (error) { return error.code === 'ENOENT' ? true : null; }
}
function persist(path, value) {
  const staging = `${path}.tmp`;
  writeFileSync(staging, JSON.stringify(value), { mode: 0o600, flag: 'w' });
  const fd = openSync(staging, 'r'); try { fsyncSync(fd); } finally { closeSync(fd); }
  renameSync(staging, path);
  const directory = openSync(dirname(path), 'r'); try { fsyncSync(directory); } finally { closeSync(directory); }
}
function inventory(run) {
  const result = [];
  for (const type of ['container', 'network']) {
    const ids = run(type === 'container' ? ['container', 'ls', '-aq', '--no-trunc'] : ['network', 'ls', '-q', '--no-trunc']).trim().split(/\s+/).filter(Boolean);
    if (ids.length > 1024 || ids.some(id => !/^[a-f0-9]{64}$/.test(id))) throw Error('Runtime inventory is incomplete');
    if (!ids.length) continue;
    const format = `{"id":{{json .Id}},"name":{{json .Name}},"owner":{{json (index ${type === 'container' ? '.Config.Labels' : '.Labels'} "${label}")}}}`;
    const rows = run([type, 'inspect', '--format', format, ...ids]).trim().split('\n').map(line => JSON.parse(line));
    if (rows.length !== ids.length || new Set(rows.map(row => row.id)).size !== ids.length || rows.some(row => !ids.includes(row.id) || typeof row.name !== 'string')) throw Error('Runtime inventory is incomplete');
    result.push(...rows.map(row => ({ type, id: row.id, name: row.name.replace(/^\//, ''), owner: row.owner })));
  }
  return result;
}
function validate(record) {
  if (record?.schemaVersion !== 1 || record.key !== digest(record.identity) || !/^[a-f0-9]{64}$/.test(record.key) || !record.process || !Number.isSafeInteger(record.process.pid) || !Array.isArray(record.resources) || record.resources.length > 512 || record.resources.some(resource => !['container', 'network'].includes(resource.type) || !new RegExp(`^lighthouse-${record.key.slice(0, 24)}-[a-z0-9-]{1,180}$`).test(resource.name))) throw Error('Execution ownership journal is invalid; operator inspection required');
}
function openOwner(path, record, run) {
  validate(record);
  const prefix = `lighthouse-${record.key.slice(0, 24)}`;
  return {
    prefix,
    prepare(args) {
      const type = args[0] === 'run' ? 'container' : args[0] === 'network' && args[1] === 'create' ? 'network' : null;
      if (!type) return args;
      if (record.cleanup) throw Error('Execution resources already terminated; reconcile before another allocation');
      const nameIndex = args.indexOf('--name');
      const name = type === 'network' ? args.at(-1) : nameIndex >= 0 ? args[nameIndex + 1] : `${prefix}-helper-${record.resources.length}`;
      const resource = { type, name, pending: true };
      validate({ ...record, resources: [...record.resources, resource] });
      const prior = record.resources.find(item => item.type === type && item.name === name);
      if (prior) prior.pending = true; else record.resources.push(resource);
      // The durable intent precedes Docker, including a lost create acknowledgement.
      persist(path, record);
      const at = type === 'container' ? 1 : 2;
      return [...args.slice(0, at), '--label', `${label}=${record.key}`, ...(type === 'container' && nameIndex < 0 ? ['--name', name] : []), ...args.slice(at)];
    },
    completed(args) {
      const name = args[0] === 'run' ? args[args.indexOf('--name') + 1] : args[0] === 'network' && args[1] === 'create' ? args.at(-1) : null;
      const resource = record.resources.find(item => item.name === name);
      if (resource) { resource.pending = false; persist(path, record); }
    },
    observe() {
      for (const row of inventory(run)) {
        const resource = record.resources.find(item => item.type === row.type && item.name === row.name);
        if (resource && row.owner === record.key) resource.pending = false;
      }
      persist(path, record);
    },
    cleanup() {
      const receipt = { schemaVersion: 1, identity: record.identity, owner: record.key, observedAt: new Date().toISOString(), status: 'unknown', resources: record.resources, remaining: [], removalErrors: 0 };
      try {
        const before = inventory(run);
        const owned = before.filter(row => row.owner === record.key || record.resources.some(item => item.type === row.type && item.name === row.name));
        if (owned.some(row => row.owner !== record.key || !record.resources.some(item => item.type === row.type && item.name === row.name))) throw Error('Resource ownership mismatch');
        for (const row of owned) record.resources.find(item => item.type === row.type && item.name === row.name).pending = false;
        // Containers first, then their private networks. Delete immutable IDs only after checking ownership.
        for (const resource of owned.sort((a, b) => a.type.localeCompare(b.type))) {
          try { run(resource.type === 'container' ? ['container', 'rm', '-f', '-v', resource.id] : ['network', 'rm', resource.id]); }
          catch { receipt.removalErrors++; }
        }
        receipt.remaining = inventory(run).filter(row => row.owner === record.key || record.resources.some(item => item.type === row.type && item.name === row.name)).map(({ type, id, name }) => ({ type, id, name }));
        receipt.status = receipt.remaining.length ? 'failed' : record.resources.some(item => item.pending) ? 'unknown' : 'clean';
        if (receipt.status === 'unknown') receipt.action = 'A create acknowledgement was lost and the resource was never observed; reconcile the owning runtime before another allocation.';
      } catch { receipt.action = 'Restore runtime inventory and verify this execution ownership before retrying; never prune shared resources.'; }
      record.cleanup = receipt;
      persist(path, record);
      return receipt;
    }
  };
}
export function createExecutionOwner(directory, identity, { run = docker } = {}) {
  if (!isAbsolute(directory) || !identity || !/^[\w.-]+\/[\w.-]+$/.test(identity.repository ?? '') || !/^[a-f0-9]{64}$/.test(identity.runId ?? '') || !/^\d+$/.test(String(identity.workflowRunId ?? '')) || !Number.isSafeInteger(identity.attempt) || identity.attempt < 1) throw Error('Execution cleanup needs immutable repository, run and attempt ownership');
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  const key = digest(identity), path = join(directory, `${key}.json`);
  const record = { schemaVersion: 1, identity, key, process: currentProcess(), resources: [] };
  // Never overwrite the durable ownership of an earlier invocation.
  writeFileSync(path, JSON.stringify(record), { flag: 'wx', mode: 0o600 });
  persist(path, record);
  return openOwner(path, record, run);
}
export function recoverExecutionOwners(directory, { run = docker, isStopped = stopped } = {}) {
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  const receipts = [], records = [], observed = inventory(run);
  for (const name of readdirSync(directory).filter(name => name.endsWith('.json'))) {
    const path = join(directory, name), stat = lstatSync(path);
    if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 1024 * 1024) throw Error('Unsafe execution ownership journal');
    const record = JSON.parse(readFileSync(path, 'utf8')); validate(record);
    if (name !== `${record.key}.json`) throw Error('Execution ownership journal identity mismatch');
    records.push({ path, record });
  }
  if (observed.some(row => row.owner && !records.some(({ record }) => record.key === row.owner))) throw Error('Runtime ownership has no durable journal; operator inspection required');
  for (const { path, record } of records) {
    if (record.cleanup?.status === 'clean' && !observed.some(row => row.owner === record.key || record.resources.some(item => item.type === row.type && item.name === row.name))) continue;
    if (isStopped(record.process) !== true) throw Error('Earlier execution is active or its host identity is unknown; retain its resources and inspect the owning host');
    const receipt = openOwner(path, record, run).cleanup(); receipts.push(receipt);
    if (receipt.status !== 'clean') throw Error('Earlier execution resources are not verified absent; operator reconciliation required before admission');
  }
  return receipts;
}
export const ownedDockerArgs = (config, args) => config.resourceOwner?.prepare(args) ?? args;
export function runOwnedDocker(config, args, options = {}) {
  const owned = ownedDockerArgs(config, args);
  try {
    const result = execFileSync('docker', owned, options);
    config.resourceOwner?.completed(owned); return result;
  } catch (error) {
    if (Number.isInteger(error.status) && ![125, 126, 127].includes(error.status)) config.resourceOwner?.completed(owned);
    throw error;
  }
}
