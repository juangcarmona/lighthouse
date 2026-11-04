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
    await assert.rejects(validatePublicationFiles(root, [{ path: 'proposal.md', content: '#Missing heading space\n' }]), error => /MD018|MD041/.test(`${error.stdout}\n${error.stderr}`));
    await validatePublicationFiles(root, [{ path: 'proposal.md', content: '# Valid proposal\n\n' + 'A complete paragraph. '.repeat(10).trim() + '\n' }]);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('publication preserves an adopter without a declared Markdown style command while still checking links', async () => {
  const root = await mkdtemp(join(tmpdir(), 'publication-adopter-'));
  try {
    await validatePublicationFiles(root, [{ path: 'proposal.md', content: '## Adopter-owned heading\n' }]);
    await assert.rejects(validatePublicationFiles(root, [{ path: 'proposal.md', content: '[Missing](absent.md)\n' }]), /missing absent/);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('publisher uses the admitted repository policy and candidate facts rather than the harness checkout', async () => {
  const root = await mkdtemp(join(tmpdir(), 'publication-snapshot-'));
  const policyRevision = 'a'.repeat(40), candidateRevision = 'b'.repeat(40), reads = [];
  let remoteExists = true;
  const values = {
    'package.json': JSON.stringify({ scripts: { markdownlint: 'npx -y markdownlint-cli2@0.23.3' } }),
    '.markdownlint-cli2.jsonc': JSON.stringify({ config: { default: true, MD013: false, 'trusted-rule': true }, customRules: ['.markdownlint-rules.cjs'], globs: ['**/*.md'] }),
    '.markdownlint-rules.cjs': "module.exports = [{ names: ['trusted-rule'], description: 'Canonical policy', tags: ['trusted'], function: () => {} }];",
  };
  const source = { policyRevision, candidateRevision, api: async path => {
    reads.push(path);
    if (path === `contents/remote.md?ref=${candidateRevision}`) return remoteExists ? { type: 'file' } : null;
    const name = path.match(/^contents\/(.*?)\?ref=/)?.[1];
    assert.equal(path, `contents/${name}?ref=${policyRevision}`);
    const content = values[name];
    return content === undefined ? null : { type: 'file', encoding: 'base64', size: Buffer.byteLength(content), content: Buffer.from(content).toString('base64') };
  } };
  try {
    await writeFile(join(root, 'package.json'), JSON.stringify({ scripts: { markdownlint: 'untrusted candidate command' } }));
    await writeFile(join(root, '.markdownlint-rules.cjs'), "throw Error('Candidate policy must never execute');");
    await validatePublicationFiles(root, [{ path: 'docs/proposal.md', content: '# Proposal\n\n[Actual candidate target](../remote.md)\n' }], source);
    assert.ok(reads.includes(`contents/.markdownlint-rules.cjs?ref=${policyRevision}`));
    remoteExists = false;
    await writeFile(join(root, 'remote.md'), '# Harness-only target\n');
    await assert.rejects(validatePublicationFiles(root, [{ path: 'docs/proposal.md', content: '# Proposal\n\n[Missing candidate target](../remote.md)\n' }], source), /missing/);
    await assert.rejects(validatePublicationFiles(root, [], { ...source, policyRevision: 'main' }), /immutable/);
  } finally { await rm(root, { recursive: true, force: true }); }
});
