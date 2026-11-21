import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { instructionBudgetCoverage, measureInstructionBudgets, readInstructionBudgets, supportedInstructionBranches, validateInstructionBudgets } from '../packages/sdlc/src/instruction-budgets.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const ids = ['refine-direct-no-view', 'refine-proposed-visual', 'implement-scoped-no-view', 'implement-existing-view'];
const common = ['product-verification.md', 'skills/audience-guidance/SKILL.md', 'skills/audience-guidance/sources.json', 'README.md'];
const refinement = [...common, 'schemas/estimate.schema.json', 'epic-delivery.md', 'request-triage.md'];
const implementation = [...common, 'skills/propose/SKILL.md', 'change-continuity.md'];
const visual = 'skills/visual-evidence/SKILL.md';

// Inline synthetic byte sources. These are not native agent traces or provider measurements.
async function fixture() {
  const inventory = await readInstructionBudgets();
  const sources = new Map();
  for (const branch of inventory.branches) {
    for (const source of [branch.entry, ...branch.references]) {
      const actual = await readFile(new URL(`../packages/sdlc/${source.path}`, import.meta.url));
      const bytes = Buffer.concat([Buffer.from('Synthetic UTF-8: é 🔦\r\n\r\n', 'utf8'), actual]);
      sources.set(source.path, bytes);
      source.bytes = bytes.length;
      source.sha256 = createHash('sha256').update(bytes).digest('hex');
    }
    const references = branch.references.reduce((sum, source) => sum + source.bytes, 0);
    branch.totals = { entry: branch.entry.bytes, references, combined: branch.entry.bytes + references };
    branch.caps = { ...branch.totals };
  }
  return { inventory, sources, readSource: async path => {
    assert.ok(sources.has(path), `Unexpected source ${path}`);
    return sources.get(path);
  } };
}

test('ordinary test discovery invokes the owning offline instruction-budget check', () => {
  const run = spawnSync(process.execPath, ['scripts/check-instruction-budgets.mjs'], { cwd: root, encoding: 'utf8' });
  assert.equal(run.status, 0, `${run.stdout}\n${run.stderr}`);
  const report = JSON.parse(run.stdout);
  assert.equal(report.status, 'passed');
  assert.deepEqual(report.errors, []);
  assert.deepEqual(report.branches.map(branch => branch.id), ids);
});

test('four real branch inventories retain exact selected inputs and reviewed zero-growth caps', async () => {
  const inventory = await readInstructionBudgets();
  assert.deepEqual(validateInstructionBudgets(inventory), []);
  const combinations = [refinement, [...refinement, visual], implementation, [...implementation, visual]];
  for (const [index, branch] of inventory.branches.entries()) {
    assert.equal(branch.id, ids[index]);
    assert.equal(branch.entry.path, index < 2 ? 'skills/refine/SKILL.md' : 'skills/implement/SKILL.md');
    assert.deepEqual(branch.references.map(source => source.path), combinations[index]);
    assert.equal(new Set(branch.references.map(source => source.path)).size, branch.references.length);
    assert.ok(branch.references.every(source => source.reason.trim()));
    assert.deepEqual(branch.caps, branch.totals, 'no unreviewed headroom');
    assert.equal(branch.capReview.method, 'implementation-source-review');
    assert.match(branch.capReview.reason, /zero silent-growth allowance/);
    for (const source of [branch.entry, ...branch.references]) {
      const actual = await readFile(new URL(`../packages/sdlc/${source.path}`, import.meta.url));
      assert.equal(source.bytes, actual.length);
      assert.equal(source.sha256, createHash('sha256').update(actual).digest('hex'));
    }
  }
});

test('UTF-8 measurement is reproducible, preserves input, counts raw bytes and deduplicates reads', async () => {
  const input = await fixture();
  const before = structuredClone(input.inventory);
  const calls = [];
  const first = await measureInstructionBudgets({ ...input, readSource: async path => { calls.push(path); return input.readSource(path); } });
  const second = await measureInstructionBudgets(input);
  assert.equal(first.status, 'passed');
  assert.deepEqual(first, second);
  assert.deepEqual(input.inventory, before);
  assert.equal(calls.length, input.sources.size, 'shared sources are read once, counted once in each branch');
  assert.equal(new Set(calls).size, calls.length);
  for (const branch of first.branches) {
    assert.equal(branch.entry.bytes, input.sources.get(branch.entry.path).length);
    assert.ok(branch.entry.bytes > input.sources.get(branch.entry.path).toString('utf8').length, 'not JS character counts');
    assert.equal(branch.totals.combined, branch.totals.entry + branch.totals.references);
  }
});

test('each entry, reference and combined cap independently rejects excess at its boundary', async () => {
  for (const kind of ['entry', 'references', 'combined']) {
    for (const index of [0, 1, 2, 3]) {
      const input = await fixture();
      const branch = input.inventory.branches[index];
      branch.caps[kind]--;
      const report = await measureInstructionBudgets(input);
      assert.equal(report.status, 'failed');
      assert.equal(report.errors.length, 1);
      assert.equal(report.errors[0].code, 'budget.exceeded');
      assert.ok(report.errors[0].message.startsWith(`${branch.id}: ${kind}`));
    }
  }
});

test('supported branches and every required cap fail closed when uncapped', async () => {
  for (const kind of ['entry', 'references', 'combined']) {
    for (const value of [undefined, null, 0, -1, 1.5, '100', Infinity, Number.MAX_SAFE_INTEGER + 1]) {
      const input = await fixture();
      input.inventory.branches[0].caps[kind] = value;
      const report = await measureInstructionBudgets(input);
      assert.equal(report.status, 'failed');
      assert.ok(report.errors.some(error => error.code === 'budget.uncapped'));
    }
  }
  const input = await fixture();
  input.inventory.branches.pop();
  assert.ok(validateInstructionBudgets(input.inventory).some(error => error.code === 'budget.branch'));
  const absent = await fixture();
  delete absent.inventory.branches[0].caps;
  assert.equal((await measureInstructionBudgets(absent)).status, 'failed');
});

test('stale entry and reference identities fail even for equal-length edits or generous caps', async () => {
  for (const path of ['skills/refine/SKILL.md', 'skills/implement/SKILL.md', 'product-verification.md', visual]) {
    const input = await fixture();
    const altered = Buffer.from(input.sources.get(path));
    altered[0] = 'X'.charCodeAt(0);
    input.sources.set(path, altered);
    for (const branch of input.inventory.branches) for (const kind of ['entry', 'references', 'combined']) branch.caps[kind] *= 2;
    const report = await measureInstructionBudgets(input);
    assert.equal(report.status, 'failed');
    assert.ok(report.errors.some(error => error.code === 'budget.stale-source' && error.message.includes(path)));
    assert.ok(!report.errors.some(error => error.code === 'budget.exceeded'));
  }
});

test('growth reports actual totals, exceeded caps and stale identities; stale totals alone also fail', async () => {
  const input = await fixture();
  const path = 'skills/refine/SKILL.md';
  input.sources.set(path, Buffer.concat([input.sources.get(path), Buffer.from('\nMore guidance.\n')]));
  const report = await measureInstructionBudgets(input);
  assert.equal(report.status, 'failed');
  for (const code of ['budget.stale-source', 'budget.stale-total', 'budget.exceeded']) assert.ok(report.errors.some(error => error.code === code));
  assert.ok(report.branches[0].totals.entry > input.inventory.branches[0].totals.entry);
  const stale = await fixture();
  stale.inventory.branches[0].totals.references++;
  assert.ok((await measureInstructionBudgets(stale)).errors.some(error => error.code === 'budget.stale-total'));
});

test('missing sources and invalid UTF-8 never yield a passing or partial total', async () => {
  for (const path of ['skills/refine/SKILL.md', 'product-verification.md', visual]) {
    for (const missing of [true, false]) {
      const input = await fixture();
      const report = await measureInstructionBudgets({ ...input, readSource: async selected => {
        if (selected === path) {
          if (missing) throw new Error('Synthetic missing file');
          return Buffer.from([0xc3, 0x28]);
        }
        return input.readSource(selected);
      } });
      assert.equal(report.status, 'failed');
      assert.ok(report.errors.some(error => error.code === 'budget.source' && error.message.includes(path)));
      assert.ok(report.branches.some(branch => branch.totals === null));
    }
  }
});

test('added, removed, duplicate and reclassified references fail even with refreshed observations', async () => {
  for (const change of ['add', 'remove', 'duplicate', 'reason', 'entry']) {
    const input = await fixture();
    const branch = input.inventory.branches[0];
    if (change === 'add') branch.references.push({ ...input.inventory.branches[1].references.at(-1) });
    if (change === 'remove') branch.references.pop();
    if (change === 'duplicate') branch.references.push({ ...branch.references[0] });
    if (change === 'reason') branch.references[0].reason = 'Not selected in this branch.';
    if (change === 'entry') branch.entry = { ...input.inventory.branches[2].entry };
    const references = branch.references.reduce((sum, source) => sum + source.bytes, 0);
    branch.totals = { entry: branch.entry.bytes, references, combined: branch.entry.bytes + references };
    branch.caps = { ...branch.totals };
    let reads = 0;
    const report = await measureInstructionBudgets({ ...input, readSource: async () => { reads++; throw new Error('Must not read'); } });
    assert.equal(report.status, 'failed');
    assert.ok(report.errors.some(error => error.code === 'budget.selection'));
    assert.equal(reads, 0);
  }
});

test('schema, unknown branches, duplicate branches and unsafe paths refuse before reading', async () => {
  for (const mutate of [
    value => { value.schemaVersion = 2; },
    value => { value.method = 'model-tokens'; },
    value => { value.extra = true; },
    value => { value.branches[0].id = 'triage'; },
    value => { value.branches[1] = structuredClone(value.branches[0]); },
    value => { value.branches[0].entry.path = '../outside.md'; },
    value => { value.branches[0].references[0].path = '/outside.md'; },
    value => { value.branches[0].entry.sha256 = 'not-a-digest'; },
    value => { value.branches[0].capReview.reason = ''; },
    value => { value.coverage.uncoveredBranches = []; }
  ]) {
    const input = await fixture();
    mutate(input.inventory);
    const report = await measureInstructionBudgets({ ...input, readSource: async () => assert.fail('invalid inventory must not read sources') });
    assert.equal(report.status, 'failed');
    assert.ok(report.errors.length);
  }
  for (const inventory of [null, {}, [], 'invalid']) {
    assert.ok(validateInstructionBudgets(inventory).length);
    assert.equal((await measureInstructionBudgets({ inventory, readSource: async () => assert.fail('invalid inventory must not read sources') })).status, 'failed');
  }
});

test('coverage object member ordering does not change valid JSON meaning', async () => {
  const input = await fixture();
  input.inventory.coverage = Object.fromEntries(Object.entries(input.inventory.coverage).reverse());
  assert.deepEqual(validateInstructionBudgets(input.inventory), []);
  assert.equal((await measureInstructionBudgets(input)).status, 'passed');
});

test('coverage exclusions and public selection copies cannot waive mandatory guidance', () => {
  const coverage = instructionBudgetCoverage();
  assert.deepEqual(coverage.uncoveredBranches, ['triage', 'standalone proposal/integration/review', 'Product Change preparation/apply', 'corrections', 'unattended routes', 'browser-e2e', 'adopter-specific branches']);
  assert.ok(coverage.excluded.includes('variable issue/model/project context'));
  assert.match(coverage.limitations, /not actual model tokens/);
  assert.match(coverage.limitations, /mandatory guidance and full evidence remain required/);
  coverage.uncoveredBranches.length = 0;
  const branches = supportedInstructionBranches();
  branches[0].references.length = 0;
  assert.ok(instructionBudgetCoverage().uncoveredBranches.length);
  assert.deepEqual(supportedInstructionBranches()[0].references.map(source => source.path), refinement);
});

// Independent source-content fixtures use real copied sources and the real owning
// process. They are not simulation traces or installed-provider measurements.
test('owning process binds actual entry and transitive reference surfaces despite refreshed observations', async t => {
  const cases = [
    ['skills/refine/SKILL.md', 'add'],
    ['change-continuity.md', 'add'],
    ['skills/refine/SKILL.md', 'remove'],
    ['skills/propose/SKILL.md', 'remove'],
    ['skills/refine/SKILL.md', 'redirect'],
    ['skills/refine/SKILL.md', 'condition'],
    ['skills/refine/SKILL.md', 'plain-control'],
    ['change-continuity.md', 'plain-control'],
    ['skills/refine/SKILL.md', 'reference-definition'],
    ['change-continuity.md', 'literal-path']
  ];
  for (const [path, mutation] of cases) await t.test(`${path}: ${mutation}`, async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'lighthouse-budget-binding-'));
    try {
      const packageRoot = join(workspace, 'src/packages/sdlc');
      await mkdir(join(workspace, 'scripts'), { recursive: true });
      await cp(join(root, 'src/packages/sdlc'), packageRoot, { recursive: true });
      await cp(join(root, 'scripts/check-instruction-budgets.mjs'), join(workspace, 'scripts/check-instruction-budgets.mjs'));
      const run = () => spawnSync(process.execPath, ['scripts/check-instruction-budgets.mjs'], { cwd: workspace, encoding: 'utf8' });
      const control = run();
      assert.equal(control.status, 0, `${control.stdout}\n${control.stderr}`);
      const baseline = JSON.parse(control.stdout);
      assert.deepEqual(baseline.errors, []);
      assert.ok(!baseline.branches[0].references.some(source => source.path === visual), 'conditional visual input stays unselected');
      assert.ok(baseline.branches.every(branch => !branch.references.some(source => source.path === 'compact-output.md')), 'lookup/recovery input stays unselected');

      const sourcePath = join(packageRoot, path);
      const original = await readFile(sourcePath, 'utf8');
      const paragraphs = original.split('\n\n');
      const index = paragraphs.findIndex(paragraph => {
        if (mutation === 'remove' || mutation === 'redirect' || mutation === 'condition') return paragraph.includes('[product-derived verification]');
        return paragraph.length > 180 && !paragraph.includes('.md') && !paragraph.includes('](');
      });
      assert.ok(index >= 0, 'independently selected real source paragraph exists');
      const previous = paragraphs[index];
      let replacement;
      if (mutation === 'add') replacement = 'Read and apply [mandatory additional guidance](additional-required.md) before continuing.';
      if (mutation === 'reference-definition') replacement = 'Read and apply [mandatory additional guidance][required].\n\n[required]: additional-required.md';
      if (mutation === 'literal-path') replacement = 'Read and apply `additional-required.md` before continuing.';
      if (mutation === 'remove') replacement = 'This paragraph no longer selects the former guidance.';
      if (mutation === 'redirect') replacement = previous.replace('../../product-verification.md', '../../additional-required.md');
      if (mutation === 'condition') replacement = previous.replace('read and apply', 'skip and omit');
      if (mutation === 'plain-control') replacement = `X${previous.slice(1)}`;
      assert.ok(Buffer.byteLength(replacement) <= Buffer.byteLength(previous));
      paragraphs[index] = replacement + ' '.repeat(Buffer.byteLength(previous) - Buffer.byteLength(replacement));
      const changed = paragraphs.join('\n\n');
      assert.equal(Buffer.byteLength(changed), Buffer.byteLength(original), 'same-size source edit');
      assert.notEqual(changed, original);
      await writeFile(sourcePath, changed);
      // Make a real, over-budget new input; refusal must not pretend to measure it.
      await writeFile(join(packageRoot, path.startsWith('skills/') ? 'skills/refine/additional-required.md' : 'additional-required.md'), 'x'.repeat(91584));
      const inventoryPath = join(packageRoot, 'instruction-budgets.json');
      const inventory = JSON.parse(await readFile(inventoryPath, 'utf8'));
      const before = structuredClone(inventory);
      for (const branch of inventory.branches) for (const source of [branch.entry, ...branch.references]) {
        if (source.path === path) source.sha256 = createHash('sha256').update(changed).digest('hex');
      }
      for (const [i, branch] of inventory.branches.entries()) {
        assert.deepEqual(branch.caps, before.branches[i].caps);
        assert.deepEqual(branch.totals, before.branches[i].totals);
        assert.deepEqual(branch.references.map(source => source.path), before.branches[i].references.map(source => source.path));
      }
      await writeFile(inventoryPath, JSON.stringify(inventory));
      const result = run();
      const report = JSON.parse(result.stdout);
      if (mutation === 'plain-control') {
        assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
        assert.deepEqual(report.errors, []);
      } else {
        assert.equal(result.status, 1, `${result.stdout}\n${result.stderr}`);
        assert.equal(report.status, 'failed');
        assert.equal(report.errors.length, 1, 'refreshed observations and unchanged caps leave only the binding failure');
        assert.equal(report.errors[0].code, 'budget.selection-binding');
        assert.ok(report.errors[0].message.startsWith(`${path}:`));
      }
      assert.ok(report.branches.every(branch => !branch.references.some(source => source.path.includes('additional-required'))));
      assert.deepEqual(report.branches.map(branch => branch.totals), baseline.branches.map(branch => branch.totals));
    } finally {
      await rm(workspace, { recursive: true, force: true });
    }
  });
});
