import { readFile, writeFile, mkdir, appendFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { preparePendingProductCandidate, loadProductCandidateFromPullRequest, validateProductCandidate, bindValidatedProductCandidate, publishProductChangePullRequest, observeUpdatedProductPull } from '../src/packages/sdlc/src/product-change-actions.mjs';
import { productReviewBinding, validateProductCheckpoint, productModelDigest } from '../src/packages/sdlc/src/product-change.mjs';

const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const env = process.env;
const repository = env.GITHUB_REPOSITORY;
const number = Number(env.RECOVERY_PR);
const expected = env.RECOVERY_HEAD;
if (env.GITHUB_EVENT_NAME !== 'workflow_dispatch' || env.GITHUB_ACTOR !== env.GITHUB_REPOSITORY_OWNER || env.GITHUB_TRIGGERING_ACTOR !== env.GITHUB_REPOSITORY_OWNER || !Number.isSafeInteger(number) || !/^[a-f0-9]{40}$/.test(expected)) throw Error('Explicit owner recovery with a full expected head is required');
const source = resolve('source');
const bridge = await import(pathToFileURL(createRequire(import.meta.url).resolve('@prodshape/integration-openspec')).href);
let advanced;
const api = async (path, method = 'GET', body, optional = false) => {
  const response = await fetch(`https://api.github.com/repos/${repository}${path ? '/' + path : ''}`, { method, headers: { authorization: `Bearer ${env.GH_TOKEN}`, accept: 'application/vnd.github+json', 'content-type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
  if (optional && response.status === 404) return null;
  if (!response.ok) throw Error(`GitHub ${method} ${path}: ${response.status}`);
  const result = response.status === 204 ? null : await response.json();
  if (method === 'PATCH' && path.startsWith('git/refs/heads/')) advanced = body.sha;
  if (method === 'GET' && path === `pulls/${number}` && advanced && result.head.sha !== advanced) {
    const expectedHead = advanced;
    advanced = undefined;
    const fresh = await observeUpdatedProductPull(api, number, expectedHead);
    advanced = expectedHead;
    return fresh;
  }
  return result;
};
const pr = await api(`pulls/${number}`);
if (pr.head.sha !== expected || !pr.draft) throw Error('PR head or draft state changed');
const markers = [...pr.body.matchAll(/<!-- lighthouse-product-change-review:(\{[^\n]*\}) -->/g)];
const checkpoints = [...pr.body.matchAll(/<!-- lighthouse-product-change-checkpoint:(\{[^\n]*\}) -->/g)];
if (markers.length !== 1 || checkpoints.length !== 1) throw Error('Unique publication evidence is required');
const { key, ...fields } = JSON.parse(markers[0][1]);
const checkpoint = JSON.parse(checkpoints[0][1]);
if (productReviewBinding(fields).key !== key || fields.head !== expected || fields.pullRequest !== number || fields.repository !== repository || validateProductCheckpoint(checkpoint).length || checkpoint.parent || checkpoint.state !== 'waiting-product-decision' || checkpoint.identity.head !== expected || checkpoint.proposalDigest !== fields.proposalDigest || checkpoint.identity.issue !== fields.issue) throw Error('Recovery only supports a current, standalone, unapproved product candidate');
const issue = await api(`issues/${fields.issue}`);
if (issue.state !== 'open' || issue.labels.some(label => ['agent-working', 'human-working'].includes(label.name))) throw Error('Issue closed or reserved');
const repositoryInfo = await api('');
const base = (await api(`commits/${repositoryInfo.default_branch}`)).sha;
if (execFileSync('git', ['rev-parse', 'HEAD'], { cwd: source, encoding: 'utf8' }).trim() !== base) throw Error('Source checkout differs from current baseline');
const baselineDigest = await productModelDigest(source);
if (baselineDigest !== fields.baselineDigest) throw Error('Accepted baseline changed; owner review is required');
const loaded = await loadProductCandidateFromPullRequest(api, repository, pr, fields.changeName);
if (loaded.digest !== fields.proposalDigest) throw Error('Candidate differs from the reviewed publication');
const product = preparePendingProductCandidate({ schemaVersion: 1, outcome: 'candidate', entry: 'feedback', changeName: fields.changeName, changeId: fields.changeId, files: loaded.files, baselineDigest, affectedAreas: [], decisions: ['Editorial source-link formatting only; product intent is unchanged. A fresh owner decision is required.'], providerValidation: { status: 'pending', diagnosticCount: 0 } });
if (JSON.stringify(product.files) === JSON.stringify(loaded.files)) throw Error('No supported source-link defect to repair');
const validation = await validateProductCandidate(source, product.changeName, product.files, bridge);
const candidate = bindValidatedProductCandidate(product, validation, baselineDigest);
for (const file of candidate.files) {
  const target = resolve(source, file.path);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, file.content);
}
execFileSync('npm', ['run', 'verify'], { cwd: source, stdio: 'inherit', env: { ...env, GH_TOKEN: '', GITHUB_TOKEN: '' } });
const request = { repository, issue: fields.issue, pullRequest: number, expectedHead: expected, actor: env.GITHUB_ACTOR, workflowRunId: env.GITHUB_RUN_ID, attempt: env.GITHUB_RUN_ATTEMPT, workflowRevision: env.GITHUB_SHA, operation: 'repair-source-link-and-request-new-decision' };
const snapshot = { repository, issue: fields.issue, title: issue.title, stage: 'propose', defaultBranch: repositoryInfo.default_branch, sourceRevision: base, runId: hash(request), workflowRunId: env.GITHUB_RUN_ID, workflowRevision: env.GITHUB_SHA, authorizationDigest: hash(request), policyDigest: hash({ repository, owner: env.GITHUB_REPOSITORY_OWNER, workflowRevision: env.GITHUB_SHA, sourceRevision: base, productChangeEnabled: true }), taskDigest: hash(request), productEntry: 'feedback' };
const beforeWrite = async () => {
  const fresh = await api(`pulls/${number}`);
  const freshIssue = await api(`issues/${fields.issue}`);
  if (fresh.head.sha !== expected || fresh.body !== pr.body || !fresh.draft || fresh.state !== 'open' || freshIssue.state !== 'open' || freshIssue.body !== issue.body || freshIssue.labels.some(label => ['agent-working', 'human-working'].includes(label.name)) || (await api(`commits/${repositoryInfo.default_branch}`)).sha !== base) throw Error('Recovery inputs changed during validation');
};
const runUrl = `https://github.com/${repository}/actions/runs/${env.GITHUB_RUN_ID}`;
const publication = await publishProductChangePullRequest(api, repository, snapshot, candidate, { validation, runUrl, beforeWrite });
const fresh = await api(`pulls/${number}`);
if (fresh.head.sha !== publication.binding.head || !fresh.body.includes(JSON.stringify(publication.binding)) || !fresh.body.includes(JSON.stringify(publication.checkpoint))) throw Error('Publication needs reconciliation');
await api(`issues/${number}/comments`, 'POST', { body: publication.body });
await mkdir('recovery-output', { recursive: true });
await writeFile('recovery-output/publication.json', JSON.stringify({ request, validation, binding: publication.binding, checkpoint: publication.checkpoint }, null, 2));
await appendFile(env.GITHUB_STEP_SUMMARY, `Repaired and revalidated [PR #${number}](${pr.html_url}) at ${fresh.head.sha}.\n\nOpenSpec, ProductShape and npm run verify passed. Waiting for a fresh product decision.\n\nReview key: ${publication.binding.key}\n`);
