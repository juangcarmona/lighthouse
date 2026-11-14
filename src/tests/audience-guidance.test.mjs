import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';

const root = process.cwd();
const policyPath = 'src/packages/sdlc/skills/audience-guidance/SKILL.md';
const registerPath = 'src/packages/sdlc/skills/audience-guidance/sources.json';
const stages = ['triage', 'refine', 'propose', 'implement', 'integrate', 'review', 'product-change', 'independent-review', 'browser-e2e', 'concise-results'];
const load = path => readFile(resolve(root, path), 'utf8');

// Structural review fixture, not a prose-quality score or a product validator.
// Deliberate mutations below prove the known missing/contradictory cases fail.
function reviewPolicy(text) {
  const checks = [
    ['human-order', /\| Human explanations:[^\n]+\| Plain English → Humanizer → evidence comparison \|/],
    ['agent-audience', /\| Agent instructions:[^\n]+documents reached through agent pointers \| Writing for Agents → instruction comparison \|/],
    ['visual-scope', /\| UI and visual changes:[^\n]+\| Taste → accepted UI contract and visual evidence \|/],
    ['not-general-prose', /Taste is not a general prose requirement\./],
    ['preservation', /Retain evidence, uncertainty, technical terms, delivery state, obligations, scope, negation, exceptions, numbers, owners and next actions\./],
    ['authority', /skill output cannot override product or architecture authority/],
    ['fallback', /Otherwise use the corresponding fallback below\./],
    ['method', /Record the helper revision used or the fallback method/],
    ['approval', /a Taste recommendation is not acceptance/],
    ['offline', /require no global skill discovery, network access or host-specific installation/],
    ['no-hooks', /Do not execute external hooks as part of writing review\./]
  ];
  return checks.filter(([, pattern]) => !pattern.test(text)).map(([id]) => id);
}

test('audience policy covers each audience, fallback and authority boundary', async () => {
  assert.deepEqual(reviewPolicy(await load(policyPath)), []);
});

test('review fixture rejects missing or contradictory audience guidance', async () => {
  const policy = await load(policyPath);
  const cases = [
    ['human-order', 'Plain English → Humanizer → evidence comparison', 'Humanizer → evidence comparison'],
    ['agent-audience', 'Writing for Agents → instruction comparison', 'Humanizer → instruction comparison'],
    ['visual-scope', 'Taste → accepted UI contract and visual evidence', 'Taste → overrides accepted UI contract'],
    ['not-general-prose', 'Taste is not a general prose requirement.', 'Taste is required for all prose.'],
    ['preservation', 'Retain evidence, uncertainty, technical terms, delivery state, obligations, scope, negation, exceptions, numbers, owners and next actions.', 'Simplify uncertainty and delivery state away.'],
    ['authority', 'skill output cannot override product or architecture authority', 'skill output can override product or architecture authority'],
    ['fallback', 'Otherwise use the corresponding fallback below.', 'Skip review if the helper is missing.'],
    ['approval', 'a Taste recommendation is not acceptance', 'a Taste recommendation grants acceptance']
  ];
  for (const [id, before, after] of cases) {
    assert.ok(policy.includes(before), `fixture target missing: ${id}`);
    assert.ok(reviewPolicy(policy.replace(before, after)).includes(id), `undetected contradiction: ${id}`);
  }
});

function reviewSources(register) {
  const expected = new Map([
    ['plain-english', ['https://github.com/Tradelord223/plain-english', 'skills/plain-english/SKILL.md']],
    ['humanizer', ['https://github.com/blader/humanizer', 'SKILL.md']],
    ['writing-for-agents', ['https://github.com/mattpocock/skills', 'skills/productivity/writing-for-agents/SKILL.md']],
    ['taste', ['https://github.com/Leonxlnx/taste-skill', 'skills/taste-skill/SKILL.md']]
  ]);
  assert.equal(register.schemaVersion, 1);
  assert.equal(register.sources.length, expected.size);
  assert.deepEqual(new Set(register.sources.map(source => source.id)), new Set(expected.keys()));
  for (const source of register.sources) {
    assert.deepEqual([source.repository, source.path], expected.get(source.id));
    assert.match(source.revision, /^[a-f0-9]{40}$/);
    assert.match(source.sha256, /^[a-f0-9]{64}$/);
    assert.equal(source.license, 'MIT');
    assert.equal(source.licensePath, 'LICENSE');
    for (const field of ['version', 'copyright', 'review', 'fallback']) assert.ok(source[field]?.trim());
  }
}

test('canonical skill sources have immutable pins, license review and reachable fallbacks', async () => {
  const register = JSON.parse(await load(registerPath));
  reviewSources(register);
  const policy = await load(policyPath);
  for (const source of register.sources) {
    const [file, anchor] = source.fallback.split('#');
    assert.equal(file, 'SKILL.md');
    const headings = [...policy.matchAll(/^### (.+)$/gm)].map(([, heading]) => heading.toLowerCase().replaceAll(' ', '-'));
    assert.ok(headings.includes(anchor), `missing fallback: ${source.id}`);
  }
  for (const replacement of [{ revision: 'main' }, { sha256: '' }, { repository: 'https://github.com/other/taste' }]) {
    const altered = structuredClone(register);
    Object.assign(altered.sources[0], replacement);
    assert.throws(() => reviewSources(altered));
  }
});

test('repository and every packaged delivery skill point to the shared audience policy', async () => {
  assert.match(await load('AGENTS.md'), /src\/packages\/sdlc\/skills\/audience-guidance\/SKILL\.md/);
  assert.match(await load('src/packages/sdlc/README.md'), /skills\/audience-guidance\/SKILL\.md/);
  for (const stage of stages) {
    const path = `src/packages/sdlc/skills/${stage}/SKILL.md`;
    const text = await load(path);
    const target = text.match(/\[the audience policy\]\(([^)]+)\)/)?.[1];
    assert.equal(target, '../audience-guidance/SKILL.md', `missing or wrong audience pointer: ${stage}`);
    assert.equal(resolve(dirname(resolve(root, path)), target), resolve(root, policyPath));
    assert.doesNotMatch(text, /Use Humanizer when installed|Apply Humanizer when available/);
  }
  const proposal = await load('src/packages/sdlc/skills/propose/SKILL.md');
  assert.match(proposal, /change overviews, PR descriptions/);
  const implementation = await load('src/packages/sdlc/skills/implement/SKILL.md');
  assert.match(implementation, /PR summaries, agent-facing instructions or UI\/visual changes/);
});
