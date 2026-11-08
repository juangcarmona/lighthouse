import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, symlink, readFile, lstat, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';
import { runImplementationChecks } from '../packages/sdlc/src/implementation-runtime.mjs';
import { checkedCandidateTree, committedSourceLinks, sourceLinksFromTree, sourceLinksDigest, validateSourceLinks } from '../packages/sdlc/src/source-link-tree.mjs';

test('the checked regular-file tree retains unchanged opaque links from the published Git overlay', async () => {
  const root = await mkdtemp(join(tmpdir(), 'lh-opaque-tree-')), previousPath = process.env.PATH;
  const git = (directory, args) => execFileSync('git', ['-C', directory, '-c', 'core.hooksPath=/dev/null', ...args], { encoding: 'utf8', env: { ...process.env, GIT_CONFIG_GLOBAL: '/dev/null', GIT_AUTHOR_NAME: 'Fixture', GIT_AUTHOR_EMAIL: 'fixture@localhost', GIT_COMMITTER_NAME: 'Fixture', GIT_COMMITTER_EMAIL: 'fixture@localhost' } }).trim();
  try {
    const original = join(root, 'original'), candidate = join(root, 'candidate'), bin = join(root, 'bin');
    await mkdir(join(original, '.claude/skills'), { recursive: true }); await mkdir(candidate); await mkdir(bin);
    await writeFile(join(bin, 'docker'), '#!/bin/sh\ncase "$*" in *"--entrypoint node"*) echo v24.0.0;; esac\nexit 0\n', { mode: 0o755 }); process.env.PATH = `${bin}:${previousPath}`;
    await writeFile(join(original, '.gitignore'), '.claude/skills/\n');
    await writeFile(join(original, 'README.md'), 'Original\n');
    await symlink('/not-readable-by-the-candidate', join(original, '.claude/skills/example'));
    git(original, ['init', '--template=', '--initial-branch=main']); git(original, ['add', '--force', '--all']); git(original, ['commit', '-qm', 'Admitted source']);
    const revision = git(original, ['rev-parse', 'HEAD']);
    const sha = git(original, ['rev-parse', `${revision}:.claude/skills/example`]);
    const sourceLinks = { schemaVersion: 1, sourceRevision: revision, entries: [{ path: '.claude/skills/example', mode: '120000', sha }] };
    assert.deepEqual(await committedSourceLinks(original, revision), sourceLinks);
    assert.ok(!JSON.stringify(sourceLinks).includes('/not-readable-by-the-candidate'));
    await writeFile(join(candidate, '.gitignore'), await readFile(join(original, '.gitignore')));
    await writeFile(join(candidate, 'README.md'), 'Candidate\n');
    await writeFile(join(original, 'README.md'), 'Candidate\n'); git(original, ['add', 'README.md']);
    const publicationTree = git(original, ['write-tree']);
    const request = { repository: 'owner/repo', issue: 7, runId: 'a'.repeat(64), workflowRunId: '44', attempt: 1, taskDigest: 'b'.repeat(64),
      sourceRevision: revision, sourceLinks, implementation: { policy: { paths: ['README.md'], checks: [], reviewRequired: false } } };
    const receipt = await runImplementationChecks({ config: { image: 'fixture', uid: process.getuid() }, request, changes: [], workspace: candidate,
      output: join(root, 'output'), name: 'opaque-fixture', redact: value => value, cancelled: () => false });
    assert.equal(receipt.candidateTree, publicationTree, 'the complete checked tree must equal the original Git base plus the regular candidate change');
    await assert.rejects(lstat(join(candidate, '.claude/skills/example')), { code: 'ENOENT' });
    assert.equal(git(candidate, ['status', '--porcelain']), '');
    assert.notEqual(git(candidate, ['rev-parse', 'HEAD^{tree}']), publicationTree, 'opaque metadata must not change the executable workspace index or HEAD');
    const plainTree = git(candidate, ['rev-parse', 'HEAD^{tree}']);
    assert.equal(await checkedCandidateTree(candidate, undefined, revision), plainTree);
    await assert.rejects(checkedCandidateTree(candidate, { ...sourceLinks, entries: [{ ...sourceLinks.entries[0], path: 'README.md' }] }, revision), /collides/);
    await assert.rejects(checkedCandidateTree(candidate, { ...sourceLinks, entries: [{ ...sourceLinks.entries[0], path: 'README.md/child' }] }, revision), /collides/);
    await rm(join(original, '.claude/skills/example')); await symlink('/changed-unread-target', join(original, '.claude/skills/example'));
    await assert.rejects(committedSourceLinks(original, revision), /source link changed/);
  } finally { process.env.PATH = previousPath; await rm(root, { recursive: true, force: true }); }
});

test('opaque source-link metadata rejects unsupported, reordered, duplicated and forged source identities', () => {
  const revision = 'a'.repeat(40), entry = { path: '.claude/skills/example', mode: '120000', sha: 'b'.repeat(40) };
  const value = { schemaVersion: 1, sourceRevision: revision, entries: [entry] };
  assert.equal(sourceLinksDigest(value, revision), sourceLinksDigest({ entries: [{ sha: entry.sha, mode: entry.mode, path: entry.path }], sourceRevision: revision, schemaVersion: 1 }, revision));
  for (const changed of [{ ...value, schemaVersion: 2 }, { ...value, sourceRevision: 'c'.repeat(40) }, { ...value, entries: [] }, { ...value, extra: true },
    { ...value, entries: [entry, entry] }, ...[{ path: '../outside' }, { path: '.git/config' }, { path: '/absolute' }, { mode: '100644' }, { sha: 'not-a-hash' }].map(delta => ({ ...value, entries: [{ ...entry, ...delta }] })),
    { ...value, entries: [{ ...entry, path: 'parent' }, { ...entry, path: 'parent/child' }] }]) assert.throws(() => validateSourceLinks(changed, revision), /source-link/i);
  assert.equal(sourceLinksFromTree(revision, { truncated: false, tree: [{ path: 'README.md', mode: '100644', type: 'blob', sha: entry.sha }] }), undefined);
  for (const tree of [{ truncated: true, tree: [] }, { truncated: false, tree: [{ ...entry, type: 'commit' }] }, { truncated: false, tree: [{ ...entry, type: 'blob' }, { ...entry, type: 'blob' }] }])
    assert.throws(() => sourceLinksFromTree(revision, tree), /source-link|source tree/i);
});
