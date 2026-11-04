import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { sourceFiles, validateImplementationPolicy } from './implementation.mjs';

const hash = value => createHash('sha256').update(value).digest('hex');
const contains = (prefix, path) => prefix.endsWith('/') ? path.startsWith(prefix) : prefix === path;
const fileDigest = file => file ? hash(file.mode + '\0' + file.content.toString('base64')) : null;
export const sourceDigest = source => hash(JSON.stringify([...source].sort(([a], [b]) => a.localeCompare(b)).map(([path, file]) => [path, fileDigest(file)])));

// Read effective bytes, not Git status: index flags and a candidate commit cannot hide an edit.
export async function committedSource(root, revision) {
  const git = args => execFileSync('git', ['-C', root, ...args], { encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 });
  if (!/^[a-f0-9]{40}$/.test(revision ?? '') || git(['rev-parse', 'HEAD']).trim() !== revision) throw Error('Source checkout does not match the admitted revision');
  const entries = git(['ls-tree', '-rz', '--full-tree', revision]).split('\0').filter(Boolean);
  if (entries.length > 5000) throw Error('Admitted source inventory exceeds bounds');
  const tracked = new Map(entries.map(entry => {
    const match = entry.match(/^(100644|100755) blob ([a-f0-9]{40})\t(.+)$/s);
    if (!match) throw Error('Admitted source contains an unsupported member');
    return [match[3], { mode: match[1], sha: match[2] }];
  }));
  const source = await sourceFiles(root, tracked);
  if (source.size !== tracked.size) throw Error('Working source inventory differs from the admitted revision');
  for (const [path, expected] of tracked) {
    const file = source.get(path);
    if (!file || file.mode !== expected.mode || createHash('sha1').update(`blob ${file.content.length}\0`).update(file.content).digest('hex') !== expected.sha) throw Error(`Working source differs from the admitted revision: ${path}`);
  }
  return source;
}

export function verificationIntegrity(before, after, policy, issue) {
  if (!policy.verification) return { status: 'unconfigured' };
  validateImplementationPolicy(policy, issue);
  const { paths, corrections } = policy.verification;
  const inputs = [...new Set([...before.keys(), ...after.keys()])].sort().filter(path => paths.some(prefix => contains(prefix, path)));
  const changed = inputs.filter(path => fileDigest(before.get(path)) !== fileDigest(after.get(path)));
  const forbidden = changed.filter(path => !Object.hasOwn(corrections, path));
  if (forbidden.length) throw Error(`Verification inputs changed without an admitted correction reason: ${forbidden.join(', ')}`);
  for (const path of paths.filter(path => !path.endsWith('/'))) if (!after.has(path)) throw Error(`Required verification input is absent: ${path}`);
  return { status: 'passed', policyDigest: hash(JSON.stringify({ checks: policy.checks, verification: policy.verification })),
    baseline: hash(JSON.stringify(inputs.map(path => [path, fileDigest(before.get(path))]))),
    candidate: hash(JSON.stringify(inputs.map(path => [path, fileDigest(after.get(path))]))),
    paths, inputCount: inputs.length, corrections: changed.map(path => ({ path, reason: corrections[path], before: fileDigest(before.get(path)), after: fileDigest(after.get(path)) })) };
}
