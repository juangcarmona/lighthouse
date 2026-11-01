import test from 'node:test';
import assert from 'node:assert/strict';
import { readUnattendedPlanningReview } from '../packages/sdlc/src/unattended-planning-evidence.mjs';
import { unattendedDigest } from '../packages/sdlc/src/unattended.mjs';
import { stageContext } from '../packages/sdlc/src/unattended-runtime.mjs';

function fixture() {
  const repository = 'owner/repo', issue = 196, runId = '123', attempt = '1', revision = 'a'.repeat(40), head = 'b'.repeat(40), merge = 'c'.repeat(40), intent = 'd'.repeat(64), policyDigest = 'e'.repeat(64);
  const completion = { merged: true, merge, binding: { repository, issue, pr: 238, head, intent } };
  const prior = { workflow: { runId, attempt }, receipt: { authorization: { unattended: { owner: 'owner', route: 'ff', policyDigest } } } };
  const run = { path: '.github/workflows/lighthouse-sdlc-unattended.yml', event: 'workflow_dispatch', status: 'completed', conclusion: 'success', actor: { login: 'owner' }, triggering_actor: { login: 'owner' }, repository: { full_name: repository }, run_attempt: 1, head_sha: revision };
  const root = unattendedDigest({ repository, issue, route: 'ff', run: runId });
  const id = (sequence, stage, worker) => unattendedDigest({ runId: root, sequence, stage, worker });
  const refine = id(1, 'refine', 'refine'), propose = id(2, 'propose', 'propose'), review = id(3, 'integrate', 'independent-review');
  const path = `openspec/changes/issue-${issue}-proposal/.openspec.yaml`, refined = { eligibility: { points: 1 } };
  const original = [{ path: 'openspec/changes/issue-196-proposal/proposal.md', content: 'Plan' }, { path, content: 'skip_specs: true' }];
  const metadata = 'schema: spec-driven\nskip_specs: true\n';
  const plan = { files: [{ ...original[0] }, { path, content: metadata }], refinement: refined };
  const binding = unattendedDigest({ revision, intent, policyDigest, purpose: 'plan', details: { refined, plan } });
  const result = stageContext({ stage: 'integrate', runId: review }, {}).contract.envelope.result;
  result.output.review = { binding, verdict: 'accept', findings: [] };
  const request = (runId, stage, worker) => ({ runId, issue, stage, worker, sourceRevision: revision });
  const member = (stageRunId, name) => `${stageRunId}/tmp/lighthouse-${runId}-1/${name}`;
  const files = new Map([
    ['report.json', { status: 'passed', published: { number: 238, head: { sha: head } }, integrated: { sha: merge } }],
    ['candidate.json', [{ path, content: Buffer.from(metadata).toString('base64') }]],
    [member(refine, 'request.json'), request(refine, 'refine', 'refine')],
    [member(refine, 'envelope.json'), { result: { runId: refine, stage: 'refine', status: 'passed', output: refined } }],
    [member(propose, 'request.json'), request(propose, 'propose', 'propose')],
    [member(propose, 'envelope.json'), { result: { runId: propose, stage: 'propose', status: 'passed', output: { files: original } } }],
    [member(propose, 'runtime.json'), { model: 'openai/producer', execution: { status: 'passed' } }],
    [member(review, 'request.json'), request(review, 'integrate', 'independent-review')],
    [member(review, 'envelope.json'), { result }],
    [member(review, 'runtime.json'), { model: 'openai/reviewer', execution: { status: 'passed' } }],
  ]);
  const api = async () => run;
  const read = async (_api, repo, idValue, artifact, file) => { assert.equal(repo, repository); assert.equal(idValue, runId); assert.equal(artifact, 'lighthouse-unattended-123-1'); if (!files.has(file)) throw Error('Missing artifact'); return structuredClone(files.get(file)); };
  return { completion, prior, run, files, api, read, member, review, propose, binding };
}

test('reconstructs an independently reviewed plan from authenticated retained artifacts', async () => {
  const f = fixture(), evidence = await readUnattendedPlanningReview(f.api, f.completion, f.prior, f.read);
  assert.equal(evidence.binding, f.binding);
  assert.equal(evidence.verdict, 'accept');
  assert.equal(evidence.providerSettings, 'unverified');
  assert.equal(evidence.details.plan.files[1].content, 'schema: spec-driven\nskip_specs: true\n');
});

test('rejects changed plans, producer identity, results, run authority and missing artifacts', async () => {
  for (const corrupt of [
    f => { f.completion.binding.intent = 'f'.repeat(64); },
    f => { f.run.actor.login = 'intruder'; },
    f => { f.files.get('report.json').integrated.sha = 'f'.repeat(40); },
    f => { f.files.get(f.member(f.review, 'runtime.json')).model = 'openai/producer'; },
    f => { f.files.get(f.member(f.review, 'envelope.json')).result.output.review.verdict = 'request-changes'; },
    f => { f.files.delete('candidate.json'); },
  ]) {
    const f = fixture(); corrupt(f);
    assert.equal(await readUnattendedPlanningReview(f.api, f.completion, f.prior, f.read), null);
  }
});
