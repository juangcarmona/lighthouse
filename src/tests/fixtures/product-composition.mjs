import { createHash } from 'node:crypto';

export const hash = value => createHash('sha256').update(value).digest('hex');
export function compositionFixture() {
  const base = 'openspec/changes/synthetic-draft/';
  const request = { repository: 'owner/fixture', worker: 'product-change', stage: 'propose', runId: '1'.repeat(64), taskDigest: '2'.repeat(64), sourceRevision: '3'.repeat(40), baselineDigest: '4'.repeat(64) };
  const schemaPin = 'schema: product-change\ncreated: 2026-11-16\nskip_specs: true\n';
  const ids = Array.from({ length: 61 }, (_, i) => `FR-SYNTHETIC-${String(i + 1).padStart(3, '0')}`);
  const operations = { add: ids.slice(0, 22), modify: ids.slice(22), remove: [] };
  const manifest = `---\nid: CHG-SYNTHETIC\ntype: product-change\nstatus: draft\noperations:\n${Object.entries(operations).map(([key, values]) => values.length ? `  ${key}:\n${values.map(id => `    - ${id}\n`).join('')}` : `  ${key}: []\n`).join('')}---\n\n# Synthetic draft\n`;
  const files = [
    { path: `${base}.openspec.yaml`, content: schemaPin },
    { path: `${base}product-change/change.md`, content: manifest },
    { path: `${base}proposal.md`, content: '# Synthetic retained proposal\n' },
    ...ids.map(id => ({ path: `${base}product-change/proposed/${id.toLowerCase()}.md`, content: `---\nid: ${id}\ntype: functional-requirement\nstatus: draft\n---\n\n# Synthetic artifact\n\n${'Exact UTF-8 text: λ and é.\n'.repeat(100)}` })),
  ];
  let padding = 276 * 1024 - files.reduce((sum, file) => sum + Buffer.byteLength(file.content), 0);
  for (let i = 3; i < files.length; i++) {
    const size = Math.ceil(padding / (files.length - i));
    files[i].content += 'x'.repeat(size); padding -= size;
  }
  const binding = { sourceRevision: request.sourceRevision, baselineDigest: request.baselineDigest, changeName: 'synthetic-draft', schemaPinSha256: hash(schemaPin) };
  const draft = { kind: 'lighthouse-retained-product-draft/v1', revision: 1, binding, files: files.map(file => ({ ...file, sha256: hash(file.content) })) };
  const context = { request, issue: { body: `Synthetic retained input:\n\n\x60\x60\x60json\n${JSON.stringify(draft)}\n\x60\x60\x60\n`, ownerAnswers: [] }, productChange: { changeName: 'synthetic-draft', schemaPin, baselineDigest: request.baselineDigest, entry: 'idea' } };
  const envelope = { schemaVersion: 1, result: { schemaVersion: 1, runId: request.runId, stage: request.stage, gate: 'planned', status: 'passed', evidence: [], missingEvidence: [], unavailableChecks: [], pendingReview: [], nextAction: 'Host: validate the candidate before requesting the product decision.', output: { productChange: { schemaVersion: 1, outcome: 'candidate', entry: 'idea', affectedAreas: ['Synthetic requirements'], decisions: ['Review synthetic changes.'], changeName: 'synthetic-draft', changeId: 'CHG-SYNTHETIC', baselineDigest: request.baselineDigest, providerValidation: { status: 'pending', diagnosticCount: 0 } } } }, effect: { type: 'issue-comment', body: 'The synthetic candidate is prepared for host validation.' } };
  return { context, draft, files, ids, operations, envelope };
}
