import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { checkMarkdownLinks, validatePublicationFiles } from '../packages/sdlc/src/publication-checks.mjs';

test('publication validates links against the proposed overlay and existing repository targets', async () => {
  const root = await mkdtemp(join(tmpdir(), 'publication-links-'));
  try {
    await writeFile(join(root, 'existing.md'), '# Existing\n');
    await checkMarkdownLinks(root, [{ path: 'docs/new.md', content: '[Existing](../existing.md) and [Proposed](other.md)\n' }, { path: 'docs/other.md', content: '# Other\n' }]);
    await assert.rejects(checkMarkdownLinks(root, [{ path: 'docs/new.md', content: '[Missing](absent.md)\n' }]), /missing absent/);
    await assert.rejects(checkMarkdownLinks(root, [{ path: 'docs/new.md', content: '[Removed](../existing.md)\n' }, { path: 'existing.md', content: null }]), /missing/);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('hook-free publication rejects malformed Markdown using the actual pinned adopted configuration', async () => {
  const root = await mkdtemp(join(tmpdir(), 'publication-style-'));
  try {
    await writeFile(join(root, 'package.json'), JSON.stringify({ scripts: { markdownlint: 'npx -y markdownlint-cli2@0.23.3' } }));
    await writeFile(join(root, '.markdownlint-cli2.jsonc'), '{"config":{"default":true,"MD013":false},"globs":["**/*.md"]}');
    await assert.rejects(validatePublicationFiles(root, [{ path: 'proposal.md', content: '#Missing heading space\n' }]));
    await validatePublicationFiles(root, [{ path: 'proposal.md', content: '# Valid proposal\n\nA complete paragraph.\n' }]);
  } finally { await rm(root, { recursive: true, force: true }); }
});
