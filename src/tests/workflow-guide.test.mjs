import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { join, dirname, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { routeIssue } from '../packages/sdlc/src/issue-actions.mjs';
import { buildLabelReconciliationPlan } from '../packages/sdlc/src/reconcile.mjs';
import { declarationFromCatalog } from '../packages/sdlc/src/capabilities.mjs';

const names = ['router', 'triage', 'refine', 'propose', 'implement', 'integrate', 'review', 'apply-review'];
const packageRoot = new URL('../packages/sdlc/', import.meta.url);

test('installed workflow display names are short and retain dispatch filenames', async () => {
  for (const id of names) {
    const file = `lighthouse-sdlc-${id}.${id === 'router' ? 'yml' : 'md'}`;
    const expected = id === 'apply-review' ? 'apply review' : id;
    for (const path of [new URL(`workflows/${file}`, packageRoot), new URL(`../../.github/workflows/${file}`, import.meta.url)]) {
      assert.equal((await readFile(path, 'utf8')).match(/^name: (.+)$/m)?.[1], expected, path.pathname);
    }
  }
});

test('catalog requests match native label routing and preserve existing adopter labels', async () => {
  const catalog = JSON.parse(await readFile(new URL('capabilities.json', packageRoot), 'utf8'));
  const declaration = declarationFromCatalog(catalog);
  const labels = declaration.capabilities[0].configuration.labels;
  assert.deepEqual(labels.filter(x => x.role === 'command').map(x => x.name).sort(), ['implement', 'propose', 'refine', 'triage']);
  const issue = { number: 179, state: 'open', labels: [] };
  for (const label of labels) {
    const event = { action: 'labeled', issue, label };
    assert.equal(routeIssue(event, 'owner', 'owner', 'issues').run, label.role === 'command', label.name);
    assert.equal(routeIssue(event, 'outsider', 'owner', 'issues').run, false, label.name);
  }
  assert.equal(routeIssue({ action: 'labeled', issue: { ...issue, labels: [{ name: 'future' }] }, label: { name: 'implement' } }, 'owner', 'owner', 'issues').run, false);
  const existing = [{ name: 'refine', color: '123456', description: 'Project wording' }, { name: 'custom', color: '654321' }];
  const plan = buildLabelReconciliationPlan(declaration, existing);
  assert.equal(plan.canApply, true);
  assert.equal(plan.changes.find(x => x.name === 'refine').operation, 'preserve');
  assert.equal(plan.changes.find(x => x.name === 'custom').operation, 'preserve');
  for (const name of ['propose', 'future', 'waiting-review']) assert.ok(plan.operations.some(x => x.name === name && x.type === 'create-label'));
});

test('packed delivery instructions resolve without the source repository', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'lighthouse-guide-'));
  try {
    const packed = spawnSync('npm', ['pack', '--workspace', '@juangcarmona/lighthouse-sdlc', '--pack-destination', dir, '--json'], { encoding: 'utf8' });
    assert.equal(packed.status, 0, packed.stderr);
    const extracted = spawnSync('tar', ['-xzf', join(dir, JSON.parse(packed.stdout)[0].filename), '-C', dir], { encoding: 'utf8' });
    assert.equal(extracted.status, 0, extracted.stderr);
    const root = join(dir, 'package');
    for (const file of ['README.md', 'github-actions.md', 'completion.md', 'request-triage.md', 'host-contract.md']) {
      const source = await readFile(join(root, file), 'utf8');
      for (const match of source.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
        const href = match[1];
        if (/^(?:https?:|#)/.test(href)) continue;
        const [relative, anchor] = href.split('#');
        const target = resolve(dirname(join(root, file)), relative);
        assert.ok(target.startsWith(`${root}/`), `${file}: link escapes installed package: ${href}`);
        const text = await readFile(target, 'utf8');
        if (anchor && target.endsWith('.md')) {
          const headings = [...text.matchAll(/^#{1,6} (.+)$/gm)].map(x => x[1].toLowerCase().replace(/[^\p{L}\p{N}\s-]/gu, '').replace(/ /g, '-'));
          assert.ok(headings.includes(anchor), `${file}: missing heading ${href}`);
        }
      }
    }
  } finally { await rm(dir, { recursive: true, force: true }); }
});
