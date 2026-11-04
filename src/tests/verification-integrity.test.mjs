import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { verificationIntegrity, committedSource, sourceDigest } from '../packages/sdlc/src/verification-integrity.mjs';
import { validateImplementationPolicy } from '../packages/sdlc/src/implementation.mjs';

const file = content => ({ mode: '100644', content: Buffer.from(content) });
const policy = () => ({ scope: 'Repair the boundary', paths: ['src/', 'tests/', 'scripts/', 'package.json'], reviewRequired: false, checks: [['npm', 'run', 'verify']], verification: { paths: ['package.json', 'scripts/', 'tests/'], corrections: {} } });
const original = () => new Map([['package.json', file('{"scripts":{"verify":"node scripts/verify.mjs"}}')], ['scripts/verify.mjs', file('import "../tests/rule.test.mjs";')], ['tests/rule.test.mjs', file('assert.equal(eligible(2), true);')], ['src/rule.mjs', file('export const eligible = value => value > 2;')]]);

test('admitted verification inputs protect entrypoints, transitive wrappers and assertions', () => {
  const before = original(), admitted = policy();
  assert.equal(verificationIntegrity(before, before, admitted, 101).status, 'passed');
  for (const path of ['package.json', 'scripts/verify.mjs', 'tests/rule.test.mjs', 'scripts/nested.mjs']) {
    const candidate = new Map(before); candidate.set(path, file('process.exit(0);'));
    assert.throws(() => verificationIntegrity(before, candidate, admitted, 101), /without an admitted correction reason/);
  }
  const absent = new Map(before); absent.delete('package.json');
  admitted.verification.corrections['package.json'] = 'Remove the obsolete command entrypoint';
  assert.throws(() => verificationIntegrity(before, absent, admitted, 101), /absent/);
  const repaired = new Map(before); repaired.set('src/rule.mjs', file('export const eligible = value => value >= 2;'));
  assert.equal(verificationIntegrity(before, repaired, policy(), 101).status, 'passed');
  assert.notEqual(sourceDigest(before), sourceDigest(repaired));
});

test('a test correction retains an admitted reason and invalidates the previous verification binding', () => {
  const before = original(), candidate = new Map(before), admitted = policy();
  candidate.set('tests/rule.test.mjs', file('assert.equal(eligible(2), true); assert.equal(eligible(1), false);'));
  admitted.verification.corrections['tests/rule.test.mjs'] = 'Add the adjacent lower boundary without weakening equality.';
  const correction = verificationIntegrity(before, candidate, admitted, 101);
  assert.equal(correction.corrections.length, 1);
  assert.match(correction.corrections[0].reason, /without weakening/);
  assert.notEqual(correction.baseline, correction.candidate);
  assert.notEqual(correction.policyDigest, verificationIntegrity(before, before, policy(), 101).policyDigest);
  const unreasoned = policy(); unreasoned.verification.corrections['tests/rule.test.mjs'] = '';
  assert.throws(() => validateImplementationPolicy(unreasoned, 101), /correction reasons/);
  const broad = policy(); broad.verification.paths = ['*'];
  assert.throws(() => validateImplementationPolicy(broad, 101), /explicit input paths/);
  assert.equal(verificationIntegrity(before, before, { ...policy(), verification: undefined }, 101).status, 'unconfigured');
});

test('committed, working-tree and hidden-index tampering cannot redefine the admitted source', async t => {
  for (const scenario of ['working-tree', 'assume-unchanged', 'skip-worktree', 'committed']) await t.test(scenario, async () => {
    const root = await mkdtemp(join(tmpdir(), 'lighthouse-verifier-integrity-'));
    const git = args => execFileSync('git', ['-C', root, '-c', 'core.hooksPath=/dev/null', ...args], { encoding: 'utf8', env: { ...process.env, GIT_AUTHOR_NAME: 'Fixture', GIT_AUTHOR_EMAIL: 'fixture@localhost', GIT_COMMITTER_NAME: 'Fixture', GIT_COMMITTER_EMAIL: 'fixture@localhost' } });
    try {
      await mkdir(join(root, 'scripts')); await writeFile(join(root, 'scripts/verify.mjs'), 'throw Error("required failure");');
      git(['init', '--template=', '--initial-branch=main']); git(['add', '.']); git(['commit', '-qm', 'Admitted checker']);
      const revision = git(['rev-parse', 'HEAD']).trim();
      assert.equal((await committedSource(root, revision)).size, 1);
      if (['assume-unchanged', 'skip-worktree'].includes(scenario)) git(['update-index', '--' + scenario, 'scripts/verify.mjs']);
      await writeFile(join(root, 'scripts/verify.mjs'), 'process.exit(0);');
      if (scenario === 'committed') { git(['add', '.']); git(['commit', '-qm', 'Hide the weakened checker in HEAD']); }
      if (scenario !== 'working-tree') assert.equal(git(['status', '--porcelain']).trim(), '');
      await assert.rejects(committedSource(root, revision), /admitted revision/);
    } finally { await rm(root, { recursive: true, force: true }); }
  });
});
