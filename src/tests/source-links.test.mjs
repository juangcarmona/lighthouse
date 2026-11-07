import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { committedSource } from '../packages/sdlc/src/verification-integrity.mjs';
import { sourceFiles, validateChanges } from '../packages/sdlc/src/implementation.mjs';
import { snapshotSource } from '../packages/sdlc/src/opencode-execute.mjs';

async function fixture(t, target = '../../.agents/skills/demo') {
  const directory = await mkdtemp(join(tmpdir(), 'lighthouse-source-links-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const root = join(directory, 'source'), link = join(root, '.claude/skills/demo');
  await mkdir(join(root, '.agents/skills/demo'), { recursive: true });
  await mkdir(join(root, '.claude/skills'), { recursive: true });
  await writeFile(join(root, '.agents/skills/demo/SKILL.md'), 'Synthetic read-only skill');
  await writeFile(join(root, 'README.md'), 'Synthetic source');
  await writeFile(join(directory, 'outside'), 'external contents must not enter the snapshot');
  await symlink(target === 'external' ? join(directory, 'outside') : target === 'dangling' ? join(directory, 'missing') : target, link);
  const git = args => execFileSync('git', ['-C', root, '-c', 'core.hooksPath=/dev/null', ...args], { encoding: 'utf8', env: { ...process.env, GIT_AUTHOR_NAME: 'Fixture', GIT_AUTHOR_EMAIL: 'fixture@localhost', GIT_COMMITTER_NAME: 'Fixture', GIT_COMMITTER_EMAIL: 'fixture@localhost' } });
  git(['init', '--template=', '--initial-branch=main']); git(['add', '.']); git(['commit', '-qm', 'Synthetic admitted source']);
  return { directory, root, link, git, revision: git(['rev-parse', 'HEAD']).trim() };
}

test('committed skill links are authenticated and omitted without following targets', { skip: process.platform === 'win32' }, async t => {
  for (const target of ['relative', 'external', 'dangling']) await t.test(target, async t => {
    const f = await fixture(t, target === 'relative' ? undefined : target);
    const admitted = await committedSource(f.root, f.revision);
    assert.deepEqual([...admitted.keys()].sort(), ['.agents/skills/demo/SKILL.md', 'README.md']);
    assert.equal([...admitted.values()].some(file => file.content.includes('external contents')), false);
    const snapshot = join(f.directory, 'snapshot'); await mkdir(snapshot);
    await snapshotSource(f.root, snapshot);
    const materialized = await sourceFiles(snapshot, admitted);
    assert.deepEqual([...materialized.keys()].sort(), [...admitted.keys()].sort());
    await assert.rejects(sourceFiles(f.root), /Unsafe implementation file/);
  });
});

test('source admission rejects changed, missing, replaced and newly introduced links', { skip: process.platform === 'win32' }, async t => {
  for (const scenario of ['retargeted', 'missing', 'regular-replacement', 'new-link', 'parent-link']) await t.test(scenario, async t => {
    const f = await fixture(t);
    if (['retargeted', 'missing', 'regular-replacement'].includes(scenario)) await rm(f.link);
    if (scenario === 'retargeted') await symlink('../../README.md', f.link);
    if (scenario === 'regular-replacement') await writeFile(f.link, '../../.agents/skills/demo');
    if (scenario === 'new-link') await symlink(join(f.directory, 'outside'), join(f.root, 'untracked-link'));
    if (scenario === 'parent-link') {
      await rm(join(f.root, '.agents'), { recursive: true });
      await symlink(f.directory, join(f.root, '.agents'));
    }
    await assert.rejects(committedSource(f.root, f.revision), /source link|Unsafe implementation file/);
  });
});

test('unsupported Git members remain outside source admission', async t => {
  const f = await fixture(t);
  f.git(['update-index', '--add', '--cacheinfo', `160000,${f.revision},vendor/submodule`]);
  f.git(['commit', '-qm', 'Unsupported gitlink']);
  await assert.rejects(committedSource(f.root, f.git(['rev-parse', 'HEAD']).trim()), /unsupported member/);
  assert.throws(() => validateChanges([{ path: 'src/link', mode: '120000', content: Buffer.from('../outside').toString('base64') }], { paths: ['src/'] }), /Invalid or out-of-scope/);
});
