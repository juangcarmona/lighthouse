import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, rm, realpath } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
import { openRepository, validateBaseline, parseCitations, emitCitation, verifyEvidence } from '@prodshape/core';
import { seedProductModel } from './fixtures/product-model.mjs';
const cli = await realpath(process.env.LIGHTHOUSE_TEST_PACKED_CLI ?? new URL('../packages/cli/src/lighthouse.mjs', import.meta.url).pathname);
const provider = process.env.LIGHTHOUSE_TEST_PACKED_PROVIDER ?? new URL('../../node_modules/.bin/prodshape', import.meta.url).pathname;
const { inspectProductContract } = await import(pathToFileURL(join(dirname(cli), 'product-definition.mjs')));
const { prepareProductEvidence, loadProductCore, productModelDigest } = await import(process.env.LIGHTHOUSE_TEST_PACKED_SDLC ? pathToFileURL(join(process.env.LIGHTHOUSE_TEST_PACKED_SDLC, 'src/product-change.mjs')) : '../packages/sdlc/src/product-change.mjs');
const { preparePlanningProductEvidence } = await import(process.env.LIGHTHOUSE_TEST_PACKED_SDLC ? pathToFileURL(join(process.env.LIGHTHOUSE_TEST_PACKED_SDLC, 'src/opencode-execute.mjs')) : '../packages/sdlc/src/opencode-execute.mjs');
const run = (root, ...args) => spawnSync(process.execPath, [cli, ...args], { cwd: root, encoding: 'utf8' });
async function workspace(t) { const root = await mkdtemp(join(tmpdir(), 'lighthouse-pdac-')); t.after(() => rm(root, { recursive: true, force: true })); assert.equal(run(root, 'init', '--name', 'Product').status, 0); return root; }

for (const version of [null, 'v1alpha1', 'v1alpha2', 'v9', 'v1alpha2\nversion: v1alpha1']) {
  test(`adoption, verify, reconcile and upgrade expose ${version ?? 'missing'} product configuration`, async t => {
    const root = await workspace(t);
    if (version) await seedProductModel(root, version);
    const before = version ? await readFile(join(root, '.product/config.yaml')) : null;
    const result = run(root, 'verify', '--format', 'json');
    const report = JSON.parse(result.stdout), contract = report.results.find(item => item.id === 'foundation.pdac');
    assert.equal(contract.level, 'required');
    assert.equal(contract.status, version === 'v1alpha2' ? 'passed' : 'failed');
    assert.equal(result.status, version === 'v1alpha2' ? 0 : 1, result.stderr);
    assert.equal(contract.evidence[0].requiredSerializationVersion, 'v1alpha2');
    assert.equal(contract.evidence[0].providerVersion, '0.26.1');
    if (version !== 'v1alpha2') {
      assert.ok(report.blocking.includes('foundation.pdac'));
      assert.match(run(root, 'verify').stderr, /v1alpha2|migration/);
      const adoption = run(root, 'authorities', '--adopt-existing', '--format', 'json');
      assert.equal(adoption.status, 1);
      assert.equal(JSON.parse(adoption.stdout).status, 'blocked');
      assert.notEqual(JSON.parse(adoption.stdout).authorities[0].valid, true);
    }
    for (const command of ['reconcile', 'upgrade']) {
      const preview = run(root, command, '--format', 'json');
      assert.equal(preview.status, 0, preview.stderr);
      const plan = JSON.parse(preview.stdout), product = command === 'upgrade' ? plan.adoption.productDefinition : plan.productDefinition;
      assert.equal(product.requiredSerializationVersion, 'v1alpha2');
      assert.equal(product.status === 'passed', version === 'v1alpha2');
      if (version !== 'v1alpha2') assert.notEqual(command === 'upgrade' ? plan.adoption.status : plan.status, command === 'upgrade' ? 'complete' : 'ready');
      assert.match(run(root, command).stdout, /PDaC .*required v1alpha2/);
    }
    if (before) assert.deepEqual(await readFile(join(root, '.product/config.yaml')), before);
    else await assert.rejects(readFile(join(root, '.product/config.yaml')), { code: 'ENOENT' });
  });
}

test('unsupported or missing ProductShape providers cannot satisfy a configured authority', async t => {
  const root = await workspace(t); await seedProductModel(root);
  for (const version of [null, '0.25.0', '0.26.0', 'not-a-version']) {
    const status = await inspectProductContract(root, version);
    assert.equal(status.status, 'unavailable'); assert.match(status.diagnostics.join(' '), /unsupported/); assert.ok(status.nextAction);
  }
});

function artifact(id, type, metadata, sections) {
  return `---\nid: ${id}\ntype: ${type}\ntitle: ${id}\nstatus: active\n${metadata}\n---\n\n${sections.map(([name, text]) => `## ${name}\n\n${text}\n`).join('\n')}`;
}
async function domainModel(root) {
  await seedProductModel(root);
  const files = new Map([
    ['bc-publication', artifact('BC-PUBLICATION', 'bounded-context', '', [['Responsibility', 'Manage document publication.'], ['Language', 'Document, draft, published, retired.'], ['Boundaries', 'No delivery-stage state.'], ['External Relationships', 'Readers observe publication.']])],
    ['term-document', artifact('TERM-DOCUMENT', 'domain-term', 'defined-in: BC-PUBLICATION', [['Definition', 'A titled publication.'], ['Distinguish From', 'A delivery work item.'], ['Usage', 'Documents can be published and retired.']])],
    ['br-publication', artifact('BR-PUBLICATION', 'business-rule', 'applies-to: [BC-PUBLICATION]', [['Rule', 'A draft with a nonempty title can be published. Only a published document can retire. Retired documents are terminal.'], ['Rationale', 'Readers receive valid publications.'], ['Examples', 'A blank draft cannot publish.'], ['Exceptions', 'None.']])],
    ['uc-publication', artifact('UC-PUBLICATION', 'use-case', 'primary-actor: ACT-READER\nbounded-context: BC-PUBLICATION\ngoverned-by: [BR-PUBLICATION]', [['Goal', 'Manage a document publication.'], ['Trigger', 'A reader requests publication or retirement.'], ['Preconditions', 'The document exists.'], ['Main Flow', 'The rule admits a valid state transition.'], ['Alternative Flows', 'A forbidden transition is rejected.'], ['Failure Conditions', 'A blank title or invalid source state.'], ['Postconditions', 'The resulting state is observable.']])],
    ['lc-document', artifact('LC-DOCUMENT', 'domain-lifecycle', `subject: TERM-DOCUMENT
states:
  - {id: DRAFT, title: Draft, initial: true, terminal: false}
  - {id: PUBLISHED, title: Published, initial: false, terminal: false}
  - {id: RETIRED, title: Retired, initial: false, terminal: true}
transitions:
  - {id: PUBLISH, title: Publish, from: [DRAFT], to: PUBLISHED, trigger: Publication requested, governed-by: [BR-PUBLICATION], realized-by: [UC-PUBLICATION]}
  - {id: RETIRE, title: Retire, from: [PUBLISHED], to: RETIRED, trigger: Retirement requested, governed-by: [BR-PUBLICATION], realized-by: [UC-PUBLICATION]}`, [['Purpose', 'Explain document publication.'], ['Invariants', 'A published document has a nonempty title.'], ['State Semantics', 'A retired document is terminal.'], ['Transition Semantics', 'Publish a draft; retire a publication.'], ['Boundaries', 'This is a domain lifecycle, not an SDLC stage.']])],
  ]);
  const scenarios = [
    ['PUBLISH', 'A titled draft exists', 'A reader requests publication', 'The document becomes published', 'PUBLISH'],
    ['RETIRE', 'A published document exists', 'A reader requests retirement', 'The document becomes retired', 'RETIRE'],
    ['TERMINAL', 'A retired document exists', 'A reader requests publication', 'The request is rejected'],
    ['INVARIANT', 'A draft has an empty title', 'A reader requests publication', 'The request is rejected'],
    ['FORBIDDEN', 'A draft exists', 'A reader requests retirement', 'The request is rejected'],
  ];
  for (const [id, given, when, then, transition] of scenarios) files.set(`sb-${id.toLowerCase()}`, artifact(`SB-${id}`, 'structured-behaviour', `illustrates: [UC-PUBLICATION, BR-PUBLICATION]\ngiven: [${given}]\nwhen: ${when}\nthen: [${then}]${transition ? `\ncovers-transition: {lifecycle: LC-DOCUMENT, transition: ${transition}}` : ''}`, [['Intent', then], ['Boundaries', 'Only the named context and stimulus.']]));
  for (const [name, text] of files) await writeFile(join(root, 'docs/product/model', name + '.md'), text);
}

test('lifecycle and SB context reaches workers; real runs retain failed and stale evidence separately', async t => {
  const root = await workspace(t); await domainModel(root);
  const baseline = await validateBaseline(await openRepository(root));
  assert.deepEqual(baseline.diagnostics, []);
  const digest = await productModelDigest(root), output = join(root, 'evidence');
  await prepareProductEvidence(root, output, await loadProductCore(), { baselineDigest: digest });
  const index = JSON.parse(await readFile(join(output, 'index.json')));
  assert.equal(index.serializationVersion, 'v1alpha2');
  const lc = JSON.parse(await readFile(join(output, 'LC-DOCUMENT.json')));
  assert.equal(lc.definition.frontmatter.states[2].terminal, true); assert.match(lc.definition.body, /nonempty title/);
  const sb = JSON.parse(await readFile(join(output, 'SB-PUBLISH.json')));
  assert.equal(sb.definition.frontmatter['covers-transition'].transition, 'PUBLISH');
  const planning = join(root, 'planning'); await mkdir(planning);
  await writeFile(join(planning, 'context.json'), JSON.stringify({ contract: { rules: 'Product scope.' } }));
  const contextEvidence = await preparePlanningProductEvidence(root, planning, { core: await loadProductCore() });
  assert.equal(contextEvidence.serializationVersion, 'v1alpha2');
  assert.equal(contextEvidence.baselineDigest, digest);
  assert.equal(JSON.parse(await readFile(join(root, '.lighthouse-product-evidence/LC-DOCUMENT.json'))).definition.frontmatter.transitions[0].id, 'PUBLISH');
  assert.match(JSON.parse(await readFile(join(planning, 'context.json'))).contract.rules, /product-verification.md/);
  const implementation = `export function act(doc, event) { if (event === 'publish' && doc.state === 'draft' && doc.title.trim()) return {...doc,state:'published'}; if(event === 'retire' && doc.state === 'published') return {...doc,state:'retired'}; throw Error('forbidden'); }`;
  await writeFile(join(root, 'publication.mjs'), implementation);
  const checks = [
    ['PUBLISH', "assert.equal(act({state:'draft',title:'Title'},'publish').state,'published')"],
    ['RETIRE', "assert.equal(act({state:'published',title:'Title'},'retire').state,'retired')"],
    ['TERMINAL', "assert.throws(()=>act({state:'retired',title:'Title'},'publish'))"],
    ['INVARIANT', "assert.throws(()=>act({state:'draft',title:''},'publish'))"],
    ['FORBIDDEN', "assert.throws(()=>act({state:'draft',title:'Title'},'retire'))"],
  ];
  const revision = 'a'.repeat(40), results = [];
  for (const [id, assertion] of checks) {
    const execution = spawnSync(process.execPath, ['--input-type=module', '-e', `import assert from 'node:assert/strict'; import {act} from './publication.mjs'; ${assertion};`], { cwd: root, encoding: 'utf8' });
    assert.equal(execution.status, 0, execution.stderr);
    const node = baseline.graph.nodes.find(n => n.id === `SB-${id}`);
    const citationFile = join(root, `citation-${id}.md`);
    await writeFile(citationFile, `<!-- ${emitCitation({ id: node.id, digest: node.digest, form: 'payload' })} -->`);
    const { records: [citation] } = await parseCitations(citationFile, root);
    results.push({ 'test-id': id, level: 'domain', outcome: 'passed', citations: [{ id: citation.id, digest: citation.digest }] });
  }
  const evidence = { format: 'pdac-verification-evidence/v1alpha1', provider: 'node-assert', 'run-id': 'original-green', revision, results };
  const original = JSON.stringify(evidence);
  const verified = await verifyEvidence(original, 'run.json', baseline.artifacts, revision);
  assert.deepEqual(verified.diagnostics, []); assert.ok(verified.evidenceResults.every(r => r.outcome === 'passed' && r.citationStatuses[0] === 'current'));
  await writeFile(join(root, 'publication.mjs'), implementation.replace("doc.state === 'draft'", "doc.state !== 'published'"));
  const failed = spawnSync(process.execPath, ['--input-type=module', '-e', `import assert from 'node:assert/strict';import {act} from './publication.mjs';${checks[2][1]}`], { cwd: root });
  assert.notEqual(failed.status, 0);
  const red = { ...evidence, 'run-id': 'terminal-regression', results: [{ ...results[2], outcome: 'failed' }] };
  const failedVerification = await verifyEvidence(JSON.stringify(red), 'failed.json', baseline.artifacts, revision);
  assert.deepEqual(failedVerification.diagnostics, []); assert.equal(failedVerification.evidenceResults[0].outcome, 'failed');
  await writeFile(join(root, 'run.json'), original);
  const currentCLI = spawnSync(provider, ['evidence', 'verify', 'run.json', '--format', 'json'], { cwd: root, encoding: 'utf8' });
  assert.equal(currentCLI.status, 0, currentCLI.stderr);
  const file = join(root, 'docs/product/model/sb-publish.md'); await writeFile(file, (await readFile(file, 'utf8')).replace('The document becomes published', 'The document becomes published and is visible to readers'));
  const changed = await validateBaseline(await openRepository(root));
  const stale = await verifyEvidence(original, 'run.json', changed.artifacts, 'b'.repeat(40));
  assert.equal(stale.evidenceResults[0].outcome, 'passed'); assert.equal(stale.evidenceResults[0].citationStatuses[0], 'stale'); assert.ok(stale.diagnostics.length);
  assert.equal(await readFile(join(root, 'run.json'), 'utf8'), original);
  const staleCLI = spawnSync(provider, ['evidence', 'verify', 'run.json', '--format', 'json'], { cwd: root, encoding: 'utf8' });
  assert.equal(JSON.parse(staleCLI.stdout).documents[0].evidenceResults[0].citationStatuses[0], 'stale');
  const invalidTarget = { ...evidence, results: [{ ...results[0], citations: [{ id: 'LC-DOCUMENT', digest: lc.inspect.digest }] }] };
  assert.ok((await verifyEvidence(JSON.stringify(invalidTarget), 'lc.json', baseline.artifacts, revision)).diagnostics.some(d => d.code === 'PRODUCT081'));
});

test('a reviewed legacy relationship migration preserves governance before compliant verification', async t => {
  const root = await workspace(t); await seedProductModel(root, 'v1alpha1');
  const model = join(root, 'docs/product/model');
  await writeFile(join(model, 'bc-docs.md'), artifact('BC-DOCS', 'bounded-context', '', [['Responsibility', 'Manage publications.'], ['Language', 'Document.'], ['Boundaries', 'Publication only.'], ['External Relationships', 'Readers.']]));
  await writeFile(join(model, 'term-publication.md'), artifact('TERM-PUBLICATION', 'domain-term', 'defined-in: BC-DOCS', [['Definition', 'A document made available to readers.'], ['Distinguish From', 'An unpublished draft.'], ['Usage', 'Readers observe publications.']]));
  const rule = artifact('BR-PUBLISH', 'business-rule', 'applies-to: [BC-DOCS, UC-PUBLISH]', [['Rule', 'Only valid publications are accepted.'], ['Rationale', 'Preserve reader trust.'], ['Examples', 'Reject invalid titles.'], ['Exceptions', 'None.']]);
  const useCase = artifact('UC-PUBLISH', 'use-case', 'primary-actor: ACT-READER\nbounded-context: BC-DOCS\nuses-terms: [TERM-PUBLICATION]\ngoverned-by: []', [['Goal', 'Publish a document.'], ['Trigger', 'Publication requested.'], ['Preconditions', 'A draft exists.'], ['Main Flow', 'Validate and publish it.'], ['Alternative Flows', 'An invalid draft is rejected.'], ['Failure Conditions', 'Invalid publication.'], ['Postconditions', 'A valid publication is observable.']]);
  await writeFile(join(model, 'br-publish.md'), rule); await writeFile(join(model, 'uc-publish.md'), useCase);
  assert.deepEqual((await validateBaseline(await openRepository(root))).diagnostics, []);
  assert.equal(spawnSync(provider, ['validate'], { cwd: root }).status, 0);
  assert.equal(run(root, 'verify').status, 1);
  const { writeRepositoryFile, parseArtifactDocument } = await import('@prodshape/core');
  await writeRepositoryFile(root, 'docs/product/model/br-publish.md', rule.replace('BC-DOCS, UC-PUBLISH', 'BC-DOCS'), 'reviewed serialization migration');
  await writeRepositoryFile(root, 'docs/product/model/uc-publish.md', useCase.replace('governed-by: []', 'governed-by: [BR-PUBLISH]'), 'reviewed serialization migration');
  await writeRepositoryFile(root, '.product/config.yaml', 'version: v1alpha2\nproduct-root: docs/product\n', 'reviewed serialization migration');
  assert.equal(parseArtifactDocument(await readFile(join(model, 'br-publish.md'), 'utf8'), 'br').artifact.body, parseArtifactDocument(rule, 'br').artifact.body);
  assert.deepEqual((await validateBaseline(await openRepository(root))).diagnostics, []);
  assert.equal(spawnSync(provider, ['--serialization-version', 'v1alpha2', 'validate'], { cwd: root }).status, 0);
  assert.equal(run(root, 'verify').status, 0);
});

test('a v1alpha2 label alone cannot make an invalid product model compliant', async t => {
  const root = await workspace(t); await seedProductModel(root);
  const path = join(root, 'docs/product/model/actors/act-reader.md');
  await writeFile(path, (await readFile(path, 'utf8')).replace('title: Reader', 'title: ""'));
  const verified = run(root, 'verify', '--format', 'json');
  assert.equal(verified.status, 1);
  const result = JSON.parse(verified.stdout).results.find(item => item.id === 'foundation.pdac');
  assert.equal(result.status, 'failed'); assert.match(result.problems.join(' '), /act-reader.md/);
  const upgrade = JSON.parse(run(root, 'upgrade', '--format', 'json').stdout);
  assert.equal(upgrade.adoption.status, 'pending');
  assert.equal(upgrade.adoption.productDefinition.serializationVersion, 'v1alpha2');
  assert.equal(upgrade.adoption.productDefinition.status, 'failed');
});
