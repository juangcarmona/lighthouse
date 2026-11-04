import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const read = path => readFile(new URL(path, import.meta.url), 'utf8');
const cataloguePath = '../../docs/architecture/06-runtime-view/worker-catalogue.md';

test('the actual installer preview covers all catalogue workers, optional compositions and accessible flow pages', async () => {
  const catalogue = await read(cataloguePath);
  const installer = new URL('../packages/sdlc/src/install-workflows.mjs', import.meta.url);
  const source = await readFile(installer, 'utf8');
  const selections = [...new Set([...source.matchAll(/'(\-\-with-[\w-]+)'/g)].map(match => match[1]))];
  const target = await mkdtemp(join(tmpdir(), 'lighthouse-catalogue-'));
  try {
    const preview = spawnSync(process.execPath, [fileURLToPath(installer), target, 'a'.repeat(40), ...selections], { encoding: 'utf8' });
    assert.equal(preview.status, 0, preview.stderr);
    const files = [...preview.stdout.matchAll(/Would write .*\/\.github\/workflows\/(lighthouse-[\w-]+\.(?:md|yml))/g)].map(match => match[1]);
    assert.ok(files.length > 0, 'installer preview produced no workflow inventory');
    for (const flag of selections) assert.ok(catalogue.includes('`' + flag + '`'), `selection missing: ${flag}`);
    for (const file of files) {
      assert.ok(catalogue.includes(`/workflows/${file})`), `source link missing for ${file}`);
      if (!file.endsWith('.md')) continue;
      const name = file.slice('lighthouse-sdlc-'.length, -3);
      assert.ok(catalogue.includes(`## ${name}\n`), `catalogue omits ${name}`);
      assert.ok(catalogue.includes(`](${name}.md)`), `flow navigation missing for ${name}`);
      const flow = await read(`../../docs/architecture/06-runtime-view/${name}.md`);
      assert.ok(flow.includes(`/workflows/${file})`), `flow source missing for ${name}`);
      assert.match(flow, /Technical failure|technical failure/, `technical exit missing for ${name}`);
    }
    for (const name of ['worker-catalogue', ...files.filter(file => file.endsWith('.md')).map(file => file.slice('lighthouse-sdlc-'.length, -3)), 'maintenance', 'unattended']) {
      const flow = await read(`../../docs/architecture/06-runtime-view/${name}.md`);
      const diagrams = [...flow.matchAll(/```mermaid\n([\s\S]*?)```/g)];
      assert.ok(diagrams.length > 0, `diagram missing for ${name}`);
      for (const diagram of diagrams) {
        assert.match(diagram[1], /accTitle:/, `accessible title missing for ${name}`);
        assert.match(diagram[1], /accDescr:/, `accessible description missing for ${name}`);
      }
    }
  } finally { await rm(target, { recursive: true, force: true }); }
});

test('catalogue covers executable command labels, dispatch choices and activation gates', async () => {
  const catalogue = await read(cataloguePath);
  const capabilities = JSON.parse(await read('../packages/sdlc/capabilities.json'));
  const commands = capabilities.capabilities.find(capability => capability.id === 'labels').configuration.labels.filter(label => label.role === 'command').map(label => label.name);
  for (const command of commands) assert.ok(catalogue.includes('`' + command + '`'), `command missing: ${command}`);
  const router = await read('../packages/sdlc/workflows/lighthouse-sdlc-router.yml');
  const maintenance = await read('../packages/sdlc/workflows/lighthouse-worker-maintenance.yml');
  const unattended = await read('../packages/sdlc/workflows/lighthouse-sdlc-unattended.yml');
  const gates = new Set([...router.matchAll(/^  (LIGHTHOUSE_[A-Z_]+):/gm), ...router.matchAll(/vars\.(LIGHTHOUSE_[A-Z_]+)/g), ...maintenance.matchAll(/vars\.(LIGHTHOUSE_[A-Z_]+)/g)].map(match => match[1]));
  for (const gate of gates) assert.ok(catalogue.includes('`' + gate + '`'), `activation gate missing: ${gate}`);
  for (const source of [router, unattended]) for (const match of source.matchAll(/^\s+options:\s*\[([^\]]+)\]/gm)) {
    for (const value of match[1].split(',').map(value => value.trim())) assert.ok([...catalogue.matchAll(/`([^`\n]+)`/g)].some(span => span[1].split(/[ :]+/).includes(value)), `dispatch choice missing: ${value}`);
  }
  assert.ok(catalogue.includes('/src/packages/sdlc/README.md)'));
  assert.match(catalogue, /Packaged source/);
  assert.match(catalogue, /Installed workflow/);
  assert.match(catalogue, /Enabled policy/);
  assert.match(catalogue, /Native acceptance/);
});
