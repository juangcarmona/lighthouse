import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { checkSemanticTokens, inspectCss, resolveVisualAuthority, validateSemanticTokenConfig } from '../packages/cli/src/semantic-tokens.mjs';

const ui = new URL('../packages/ui/', import.meta.url);
const guide = await readFile(new URL('DESIGN.md', ui), 'utf8');
const skill = await readFile(new URL('skills/ui-design/SKILL.md', ui), 'utf8');
const tokens = await readFile(new URL('tokens.css', ui), 'utf8');
const uiPackage = JSON.parse(await readFile(new URL('package.json', ui), 'utf8'));
const managedFiles = { 'docs/design/DESIGN.md': guide, '.agents/skills/lighthouse-ui/SKILL.md': skill };
const installed = { name: uiPackage.name, version: uiPackage.version, tokens, source: `${uiPackage.name}/tokens.css` };
const hash = value => createHash('sha256').update(value).digest('hex');
const roles = new Set([...tokens.matchAll(/(--lh-[a-z0-9-]+)\s*:/gu)].map(match => match[1]));
const primitives = new Set(['--lh-white', '--lh-night', '--lh-navy', '--lh-slate', '--lh-blue-deep', '--lh-blue', '--lh-blue-light', '--lh-ice', '--lh-slate-light', '--lh-slate-muted']);
const inspect = (css, exceptions = []) => inspectCss(css, { path: 'src/app.css', roles, primitives, exceptions });
const clean = result => { assert.deepEqual(result.diagnostics, []); assert.deepEqual(result.limitations, []); };
const exception = (overrides = {}) => ({ path: 'src/app.css', property: 'color', value: '#2459a6', reason: 'Reviewed brand requirement', owner: 'product-owner', review: '2027-01-15', ...overrides });

async function fixture(t) {
  const root = await mkdtemp(join(tmpdir(), 'lighthouse-semantic-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const manifest = { profiles: ['visual-theme'], packages: { ui: { name: uiPackage.name, version: uiPackage.version } }, managed: Object.keys(managedFiles), semanticTokens: { enabled: true, files: ['src/app.css'] } };
  const state = { schemaVersion: 1, package: { name: '@juangcarmona/lighthouse', version: '0.13.27' }, files: Object.fromEntries(Object.entries(managedFiles).map(([path, value]) => [path, { hash: hash(value), scope: 'harness' }])) };
  const write = async (path, content) => { await mkdir(dirname(join(root, path)), { recursive: true }); await writeFile(join(root, path), content); };
  for (const [path, content] of Object.entries(managedFiles)) await write(path, content);
  await write('.lighthouse/upgrade.json', JSON.stringify(state));
  await write('src/app.css', '.card { color: var(--lh-text); background: var(--lh-surface); width: 390px; padding: 12px; }');
  return { root, manifest, managedFiles: { ...managedFiles }, installed: { ...installed }, state, write };
}

test('standalone grammar passes semantic declarations, fallback nesting, comments, strings and intentional geometry', () => {
  clean(inspect(`/* color: var(--lh-nope); */
    @layer product { @media (width > 30rem) { @supports (display: grid) {
      .card[data-title="var(--lh-missing)"] {
        color: var(--lh-text, var(--lh-text-muted, currentColor));
        background: transparent; border: 1px solid var(--lh-border);
        font-family: var(--lh-font-sans); border-radius: var(--lh-radius-panel);
        box-shadow: none; transition: color var(--lh-motion-fast) ease;
        width: min(100%, 48rem); padding: 12px; margin: 0 auto;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        content: "var(--lh-nope); { color: red; }";
      }
    } } }`));
});

for (const [name, css, code] of [
  ['undefined role', '.a { color: var(--lh-tex); }', 'undefined-role'],
  ['nested fallback role', '.a { color: var(--lh-text, var(--lh-missing)); }', 'undefined-role'],
  ['geometry fallback role', '.a { width: calc(100% - var(--lh-missing)); }', 'undefined-role'],
  ['primitive reference', '.a { color: var(--lh-blue); }', 'primitive-reference'],
  ['primitive fallback', '.a { color: var(--lh-text, var(--lh-white)); }', 'primitive-reference'],
  ['raw color', '.a { color: #fff; }', 'raw-presentation'],
  ['raw named color', '.a { color: rebeccapurple; }', 'raw-presentation'],
  ['raw fallback', '.a { color: var(--lh-text, #fff); }', 'raw-presentation'],
  ['deep raw fallback', '.a { color: var(--lh-text, var(--lh-text-muted, red)); }', 'raw-presentation'],
  ['raw radius', '.a { border-radius: 7px; }', 'raw-presentation'],
  ['raw font string', '.a { font-family: "Segoe UI"; }', 'raw-presentation'],
  ['raw shadow', '.a { box-shadow: 0 4px 8px #000; }', 'raw-presentation'],
  ['raw motion', '.a { transition: color 120ms ease; }', 'raw-presentation'],
  ['unknown definition', ':root { --lh-made-up: #fff; }', 'undefined-role'],
  ['canonical primitive redefinition', ':root { --lh-blue: #123; }', 'primitive-reference'],
  ['unreviewed product override', '.brand { --lh-action: var(--lh-text); }', 'product-override'],
]) test(`standalone checker rejects ${name}`, () => {
  assert.ok(inspect(css).diagnostics.some(item => item.code === code));
});

for (const [name, css, code] of [
  ['import', '@import "./other.css"; .a { color: var(--lh-text); }', 'unresolved-import'],
  ['nesting', '.a { & .b { color: red; } }', 'unsupported-nesting'],
  ['unknown property', '.a { backdrop-filter: blur(2px); }', 'unsupported-property'],
  ['unknown function', '.a { background: linear-gradient(red, blue); }', 'unsupported-function'],
  ['external alias', '.a { color: var(--product-color); }', 'unresolved-reference'],
  ['alias definition', ':root { --product-color: red; }', 'unsupported-alias'],
  ['unknown at-rule', '@font-face { font-family: Demo; }', 'unsupported-syntax'],
  ['unclosed block', '.a { color: var(--lh-text);', 'unsupported-syntax'],
  ['unbalanced function', '.a { color: var(--lh-text; }', 'unsupported-syntax'],
  ['missing declaration colon', '.a { color red; }', 'unsupported-declaration'],
  ['unclosed string', '.a { content: "unfinished; }', 'unsupported-syntax'],
  ['escape', '.a { co\\lor: red; }', 'unsupported-syntax'],
  ['interpolation', '.a { color: ${color}; }', 'unsupported-syntax'],
]) test(`coverage reports ${name} instead of claiming complete CSS support`, () => {
  assert.ok(inspect(css).limitations.some(item => item.code === code));
});

test('literal font names and decoration colors cannot masquerade as semantic references', async t => {
  const context = await fixture(t);
  for (const declaration of [
    'font-family: TOKEN', 'font-family: token', 'font-family: var(--lh-font-sans, TOKEN)',
    'font-family: transparent', 'font-family: currentColor', 'font-family: none', 'font-family: 0',
    'color: TOKEN', 'border: 1px solid TOKEN', 'transition: TOKEN',
    'text-decoration: underline #fff', 'text-decoration: underline red',
    'text-decoration: underline var(--lh-text, red)',
  ]) {
    const css = `.a { ${declaration}; }`;
    assert.ok(inspect(css).diagnostics.some(item => item.code === 'raw-presentation'), declaration);
    await context.write('src/app.css', css);
    assert.equal((await checkSemanticTokens(context)).status, 'failed', declaration);
  }
  for (const declaration of [
    'font-family: var(--lh-font-sans)', 'font-family: inherit',
    'font-family: var(--lh-font-sans, var(--lh-font-mono))',
    'text-decoration: underline var(--lh-text)', 'text-decoration: underline',
    'text-decoration: underline dotted currentColor', 'text-decoration: none',
    'color: currentColor', 'background: transparent', 'box-shadow: none', 'border: 0',
  ]) clean(inspect(`.a { ${declaration}; }`));
  const reviewed = exception({ property: 'text-decoration', value: 'underline #fff' });
  clean(inspect('.a { text-decoration: underline #fff; }', [reviewed]));
  assert.ok(inspect('.a { color: \u0000; }').limitations.some(item => item.code === 'unsupported-syntax'));
});

test('raw exceptions match exact declarations and retain review information', () => {
  const permitted = exception();
  const result = inspect('.a { color: #2459a6; width: 1440px; }', [permitted]);
  clean(result);
  assert.deepEqual(result.usedExceptions, [permitted]);
  for (const nearMiss of [exception({ path: 'src/other.css' }), exception({ property: 'background' }), exception({ value: '#fff' }), exception({ selector: '.b' }), exception({ role: '--lh-action' })]) {
    assert.ok(inspect('.a { color: #2459a6; }', [nearMiss]).diagnostics.some(item => item.code === 'raw-presentation'));
  }
  assert.ok(inspect('.a { color: #2459a6; background: red; }', [permitted]).diagnostics.some(item => item.code === 'raw-presentation'));
});

test('raw exceptions never bypass undefined roles, primitives or syntax limitations', () => {
  for (const value of ['var(--lh-missing, #2459a6)', 'var(--lh-blue, #2459a6)']) {
    assert.ok(inspect(`.a { color: ${value}; }`, [exception({ value })]).diagnostics.some(item => ['undefined-role', 'primitive-reference'].includes(item.code)));
  }
  clean(inspect('.a { color: rgb(1 2 3); }', [exception({ value: 'rgb(1 2 3)' })]));
  assert.ok(inspect('.a { background: linear-gradient(red, blue); }', [exception({ property: 'background', value: 'linear-gradient(red, blue)' })]).limitations.some(item => item.code === 'unsupported-function'));
});

test('reviewed product overrides are role and selector scoped, not canonical definition exemptions', () => {
  const override = exception({ property: '--lh-action', value: '#2459a6', selector: '.brand', role: '--lh-action' });
  clean(inspect('.brand { --lh-action: #2459a6; }', [override]));
  assert.ok(inspect(':root { --lh-action: #2459a6; }', [override]).diagnostics.some(item => item.code === 'product-override'));
  assert.ok(inspect('.brand { --lh-focus: #2459a6; }', [override]).diagnostics.some(item => item.code === 'product-override'));
  const themedOverride = { ...override, selector: '[data-lh-theme="dark"]' };
  clean(inspect('/* product decision */ [data-lh-theme="dark"] { --lh-action: #2459a6; }', [themedOverride]));
  assert.ok(inspect('[data-lh-theme="light"] { --lh-action: #2459a6; }', [themedOverride]).diagnostics.some(item => item.code === 'product-override'));
});

test('selection is independent and does not inspect sources or authority when absent/disabled', async () => {
  for (const semanticTokens of [undefined, { enabled: false }]) {
    const result = await checkSemanticTokens({ root: '/not-an-adopter', manifest: { semanticTokens } });
    assert.equal(result.status, 'not-applicable');
    assert.deepEqual(result.coverage.inspected, []);
  }
});

test('selected source inventory resolves actual installed authority, not root naming, deterministically', async t => {
  const context = await fixture(t);
  await context.write('DESIGN.md', 'source: fake.css\n--lh-fake: red;');
  const before = await readFile(join(context.root, 'src/app.css'));
  const first = await checkSemanticTokens(context), second = await checkSemanticTokens(context);
  assert.equal(first.status, 'passed', first.problems.join('\n'));
  assert.deepEqual(first, second);
  assert.deepEqual(await readFile(join(context.root, 'src/app.css')), before);
  assert.equal(first.evidence[0].guide, 'docs/design/DESIGN.md');
  assert.equal(first.evidence[0].tokenHash, hash(tokens));
  assert.ok(first.coverage.uninspected.includes('CSS-in-JS'));
  await context.write('src/app.css', '.a { color: var(--lh-fake); }');
  assert.equal((await checkSemanticTokens(context)).status, 'failed');
});

for (const [name, mutate] of [
  ['profile absent', async c => { c.manifest.profiles = []; }],
  ['package missing', async c => { c.installed = null; }],
  ['package version drift', async c => { c.installed.version = '99.0.0'; }],
  ['guide unowned', async c => { c.manifest.managed = []; }],
  ['guide missing', async c => { await rm(join(c.root, 'docs/design/DESIGN.md')); }],
  ['guide drift', async c => { await c.write('docs/design/DESIGN.md', `${guide}\nEdited`); }],
  ['ownership absent', async c => { await rm(join(c.root, '.lighthouse/upgrade.json')); }],
  ['ownership stale', async c => { c.state.files['docs/design/DESIGN.md'].hash = '0'.repeat(64); await c.write('.lighthouse/upgrade.json', JSON.stringify(c.state)); }],
  ['source metadata ambiguous', async c => { c.managedFiles['docs/design/DESIGN.md'] = guide.replace('source: ./tokens.css', 'source: ./tokens.css\nsource: ./other.css'); await c.write('docs/design/DESIGN.md', c.managedFiles['docs/design/DESIGN.md']); c.state.files['docs/design/DESIGN.md'].hash = hash(c.managedFiles['docs/design/DESIGN.md']); await c.write('.lighthouse/upgrade.json', JSON.stringify(c.state)); }],
  ['source metadata missing', async c => { c.managedFiles['docs/design/DESIGN.md'] = guide.replace('source: ./tokens.css\n', ''); await c.write('docs/design/DESIGN.md', c.managedFiles['docs/design/DESIGN.md']); c.state.files['docs/design/DESIGN.md'].hash = hash(c.managedFiles['docs/design/DESIGN.md']); await c.write('.lighthouse/upgrade.json', JSON.stringify(c.state)); }],
  ['canonical roles missing', async c => { c.installed.tokens = ':root { --lh-text: red; }'; }],
]) test(`authority fails closed: ${name}`, async t => {
  const context = await fixture(t); await mutate(context);
  const result = await checkSemanticTokens(context);
  assert.equal(result.status, 'failed');
  assert.match(result.problems.join('\n'), /Visual authority unavailable/);
  assert.deepEqual(result.coverage.inspected, []);
});

test('canonical definitions are authority inputs and remain unchanged', async t => {
  const context = await fixture(t);
  const authority = await resolveVisualAuthority(context);
  assert.ok(authority.roles.has('--lh-positive'));
  assert.ok(authority.primitives.has('--lh-blue'));
  assert.equal((await checkSemanticTokens(context)).status, 'passed');
  assert.equal(context.installed.tokens, tokens);
});

test('inventory reports exclusions, generated and uninspected inputs; zero-file coverage fails', async t => {
  const context = await fixture(t);
  context.manifest.semanticTokens.files.push('dist/generated.css');
  context.manifest.semanticTokens.exclude = [{ path: 'dist/generated.css', reason: 'Generated output; inspect src/app.css' }];
  const result = await checkSemanticTokens(context);
  assert.equal(result.status, 'passed');
  assert.equal(result.coverage.excluded[0].path, 'dist/generated.css');
  context.manifest.semanticTokens.exclude = [];
  assert.equal((await checkSemanticTokens(context)).status, 'failed');
  context.manifest.semanticTokens.files = [];
  assert.match((await checkSemanticTokens(context)).problems.join('\n'), /No standalone CSS files inspected/);
  context.manifest.semanticTokens.files = ['src/app.css'];
  context.manifest.semanticTokens.exclude = [{ path: 'src/app.css', reason: 'Deliberate coverage gap' }];
  assert.equal((await checkSemanticTokens(context)).status, 'failed');
});

test('missing selected sources, symlinks and unresolved imports fail with coverage evidence', async t => {
  const context = await fixture(t);
  context.manifest.semanticTokens.files = ['src/missing.css'];
  assert.equal((await checkSemanticTokens(context)).status, 'failed');
  await symlink(join(context.root, 'src/app.css'), join(context.root, 'src/link.css'));
  context.manifest.semanticTokens.files = ['src/link.css'];
  assert.match((await checkSemanticTokens(context)).problems.join('\n'), /non-symlink/);
  context.manifest.semanticTokens.files = ['src/app.css'];
  await context.write('src/app.css', '@import "./unknown.css"; .a { color: var(--lh-text); }');
  const result = await checkSemanticTokens(context);
  assert.equal(result.status, 'failed');
  assert.equal(result.coverage.limitations[0].code, 'unresolved-import');
});

test('configuration rejects broad or unreviewed exceptions and undeclared source paths', () => {
  for (const config of [
    { enabled: true }, { enabled: true, files: ['../app.css'] }, { enabled: true, files: ['src/**/*.css'] },
    { enabled: true, files: {}, exclude: [{ path: 'src/app.css', reason: 'Invalid inventory' }] },
    { enabled: true, files: ['node_modules/app.css'] }, { enabled: true, files: ['src/.hidden.css'] },
    { enabled: true, files: ['src/app.css'], exceptions: [{ path: '*', reason: 'Everything' }] },
    { enabled: true, files: ['src/app.css'], exceptions: [exception({ owner: '' })] },
    { enabled: true, files: ['src/app.css'], exceptions: [exception({ review: 'not-a-date' })] },
    { enabled: true, files: ['src/app.css'], exceptions: [exception({ review: '2027-02-31' })] },
    { enabled: true, files: ['src/app.css'], exclude: [{ path: 'src/other.css', reason: 'Not declared' }] },
  ]) assert.ok(validateSemanticTokenConfig(config).length > 0);
  assert.deepEqual(validateSemanticTokenConfig({ enabled: true, files: ['src/app.css'], exceptions: [exception()] }), []);
});
