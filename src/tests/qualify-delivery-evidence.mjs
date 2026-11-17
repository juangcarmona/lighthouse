import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const mode = process.argv[2], env = process.env;
const repository = 'juangcarmona/lighthouse', repositoryId = 1427668548;
const packageRoot = resolve(env.LIGHTHOUSE_QUALIFIED_PACKAGE);
const sdk = name => import(pathToFileURL(join(packageRoot, 'src', name + '.mjs')));
const { createIssueApi } = await sdk('github-rest');
const api = createIssueApi(repository, env);
const root = resolve(env.LIGHTHOUSE_QUALIFICATION_ROOT);
const metadata = JSON.parse(await readFile(join(packageRoot, 'package.json'), 'utf8'));
assert.equal(metadata.name, '@juangcarmona/lighthouse-sdlc');
assert.equal(metadata.version, env.LIGHTHOUSE_EXPECTED_SDLC);
const published = JSON.parse(await readFile(join(root, 'published-metadata.json'), 'utf8'));
assert.equal(published.version, metadata.version);
assert.equal(published.gitHead, env.LIGHTHOUSE_EXPECTED_RELEASE);
const installedLock = JSON.parse(await readFile(join(resolve(packageRoot, '../../..'), 'package-lock.json'), 'utf8'));
assert.equal(installedLock.packages['node_modules/@juangcarmona/lighthouse-sdlc'].integrity, published['dist.integrity'] ?? published.dist?.integrity);
const runId = Number(env.GITHUB_RUN_ID), attempt = Number(env.GITHUB_RUN_ATTEMPT), revision = env.GITHUB_SHA;
const candidateTree = execFileSync('git', ['rev-parse', 'HEAD^{tree}'], { encoding: 'utf8' }).trim();
async function authority() {
  assert.equal(env.GITHUB_REPOSITORY, repository);
  assert.equal(env.GITHUB_EVENT_NAME, 'workflow_dispatch');
  const repo = await api(''), run = await api(`actions/runs/${runId}/attempts/${attempt}`);
  assert.equal(repo.id, repositoryId); assert.equal(repo.full_name, repository);
  assert.equal(run.repository.id, repositoryId); assert.equal(run.head_sha, revision);
  assert.equal(run.actor.id, repo.owner.id); assert.equal(run.triggering_actor.id, repo.owner.id);
  assert.equal(run.path, '.github/workflows/lighthouse-evidence-qualification.yml');
  assert.equal(run.event, 'workflow_dispatch'); assert.equal(run.status, 'in_progress'); assert.equal(run.run_attempt, attempt);
  assert.equal((await api(`commits/${repo.default_branch}`)).sha, revision);
  assert.equal((await api(`git/commits/${revision}`)).tree.sha, candidateTree);
}
await authority();
await mkdir(root, { recursive: true });
if (mode === 'capture') {
  const { collectGithubMeasurements } = await sdk('measurement-github');
  const { renderMeasurementReport } = await sdk('measurement-report');
  const { deriveMeasurements, stableJson } = await sdk('measurement');
  const { prepareAcceptance, verifyAcceptance, produceAcceptance } = await sdk('delivery-acceptance');
  const { retainVisualEvidence } = await sdk('visual-evidence');
  const end = new Date().toISOString(), start = new Date(Date.parse(end) - 14 * 86400000).toISOString();
  const bundle = await collectGithubMeasurements(repository, { start, end }, { api, bounds: { maxPages: 1, maxIssues: 6, maxPullRequests: 6, maxRuns: 20, maxRequests: 180 }, workflows: ['lighthouse-sdlc-review.lock.yml', 'lighthouse-sdlc-implement.lock.yml'] });
  const frozen = stableJson(bundle) + '\n';
  await writeFile(join(root, 'frozen.json'), frozen);
  const html = renderMeasurementReport(JSON.parse(frozen));
  assert.equal(html, renderMeasurementReport(JSON.parse(frozen)));
  await writeFile(join(root, 'report.html'), html);
  await writeFile(join(root, 'metrics.json'), stableJson(deriveMeasurements(bundle)) + '\n');
  const failedPublication = bundle.records.find(r => r.kind === 'workflow-job' && r.data.publication && r.data.conclusion === 'failure');
  const blockedReview = bundle.records.find(r => r.kind === 'stage-result' && r.data.stage === 'review' && r.data.status === 'blocked');
  const missingUsage = bundle.records.find(r => r.kind === 'usage' && r.data.coverage === 'unavailable');
  assert.ok(failedPublication && blockedReview && missingUsage, 'The bounded live sample must retain the three independently reconciled source cases');
  assert.equal((await api(`actions/jobs/${failedPublication.data.jobId}`)).conclusion, 'failure');
  const { createActionsJsonReader } = await sdk('actions-artifact');
  const blockedArtifact = await api(`actions/artifacts/${blockedReview.data.artifactId}`);
  const readBlocked = await createActionsJsonReader(api, repository, blockedReview.data.runId, blockedArtifact.name);
  assert.equal(readBlocked('envelope.json').result.status, 'blocked');
  assert.equal(readBlocked('envelope.json').result.stage, 'review');
  const usageArtifacts = await api(`actions/runs/${missingUsage.data.runId}/artifacts?per_page=100`);
  const usageArchive = usageArtifacts.artifacts.find(a => a.name === `lighthouse-telemetry-agent-${missingUsage.data.attempt}` && !a.expired);
  let usageStatus = 'source-artifact-unavailable';
  if (usageArchive) {
    const reader = await createActionsJsonReader(api, repository, missingUsage.data.runId, usageArchive.name);
    const usage = reader(`lighthouse-${missingUsage.data.runId}-${missingUsage.data.attempt}/evidence/host/telemetry-usage.json`, true) ?? reader('telemetry-usage.json', true);
    assert.ok(!usage || usage.coverage === 'unavailable'); usageStatus = usage?.coverage ?? 'source-member-unavailable';
  }
  const prepared = await prepareAcceptance(api, repository, { policyRevision: revision, issue: 590, pullRequest: 741, scope: { path: 'docs/product/model/business-rules/br-delivery-acceptance.md', revision }, criteria: { path: 'docs/product/model/requirements/functional/fr-change-evidence.md', revision } });
  const acceptance = await verifyAcceptance(api, repository, { binding: prepared.binding, receipts: [] });
  assert.equal(acceptance.status, 'pending', 'A healthy route with no explicit owner delivery decision stays pending');
  const productApproval = await api('issues/comments/6961817230');
  assert.equal(productApproval.user.id, (await api('')).owner.id);
  await assert.rejects(produceAcceptance(api, repository, 6961817230, { runId, attempt, revision }), /delivery-decision source/);
  await writeFile(join(root, 'acceptance.json'), JSON.stringify({ preparedBinding: prepared.binding, currentVerification: acceptance, productApprovalRejectedAsDeliverySource: true, liveAcceptedDecisionProduced: false }, null, 2));
  const browser = await chromium.launch();
  const captures = [], browserChecks = [];
  try {
    for (const colorScheme of ['light', 'dark']) for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
      const context = await browser.newContext({ viewport, colorScheme, reducedMotion: 'reduce' }), page = await context.newPage();
      const network = [];
      page.on('request', request => { if (request.url().startsWith('http')) network.push(request.url()); });
      await page.goto(pathToFileURL(join(root, 'report.html')).href);
      await page.getByRole('heading', { level: 1 }).waitFor();
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true, 'Report must not overflow the page');
      const accessibility = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
      assert.deepEqual(accessibility.violations.map(v => v.id), []);
      await page.keyboard.press('Tab');
      assert.equal(await page.evaluate(() => document.activeElement.tagName), 'A');
      assert.equal(network.length, 0);
      browserChecks.push({ colorScheme, viewport, noPageOverflow: true, accessibilityViolations: 0, keyboardLinkFocus: true, externalRequests: 0 });
      if (colorScheme === 'dark') {
        const id = viewport.width > 1000 ? 'operator-report-wide' : 'operator-report-narrow';
        const path = id + '.png';
        await page.getByRole('heading', { name: 'Operator findings', exact: true }).scrollIntoViewIfNeeded();
        await page.screenshot({ path: join(root, path) });
        captures.push({ id, kind: 'candidate', view: 'Lighthouse delivery observation report', state: 'Real bounded GitHub observations and explicit coverage gaps', viewport, path, baseline: 'new', baselineReason: 'The static operator report is a new view introduced by issue #221.' });
      }
      await context.close();
    }
  } finally { await browser.close(); }
  const feature = await api('pulls/747');
  assert.equal(feature.merged, true); assert.equal(feature.base.repo.id, repositoryId);
  const integratedFeature = await api(`git/commits/${feature.merge_commit_sha}`);
  const sourceBaseline = integratedFeature.parents[0].sha;
  const priorReport = await api(`contents/src/packages/sdlc/src/measurement-report.mjs?ref=${sourceBaseline}`, 'GET', undefined, true);
  assert.equal(priorReport, null, 'The source baseline for #221 did not contain this report view');
  const candidateReport = await api(`contents/src/packages/sdlc/src/measurement-report.mjs?ref=${revision}`);
  assert.equal(candidateReport.type, 'file');
  const request = { repository, repositoryId, issue: 221, runId: `qualification-${runId}-${attempt}`, workflowRunId: String(runId), attempt, stage: 'implement', sourceRevision: sourceBaseline, baseRevision: revision, visualEvidence: { required: true } };
  const envelope = { result: { output: { visualEvidence: { schemaVersion: 1, status: 'provided', reason: 'Native published-package qualification of the actual Lighthouse operator report; no visual or delivery acceptance is asserted.', items: captures } } } };
  await retainVisualEvidence(request, envelope, root, root, { candidateTree });
  await writeFile(join(root, 'request.json'), JSON.stringify(request)); await writeFile(join(root, 'envelope.json'), JSON.stringify(envelope));
  await writeFile(join(root, 'qualification.json'), JSON.stringify({ schemaVersion: 1, repository, repositoryId, revision, candidateTree, runId, attempt, packageVersion: metadata.version, publishedGitHead: published.gitHead, publishedIntegrity: published['dist.integrity'] ?? published.dist?.integrity, inputSha256: deriveMeasurements(bundle).inputSha256, offlineRerenderByteIdentical: true, browserChecks, sourceCases: { failedPublication: failedPublication.source.url, blockedReview: blockedReview.source.url, missingUsage: missingUsage.source.url, usageStatus }, acceptanceStatus: acceptance.status, liveAcceptedDecisionProduced: false, kind: 'native published SDK and producer pipeline; no model worker execution' }, null, 2));
} else if (mode === 'publish') {
  const { publishVisualEvidence } = await sdk('visual-publication');
  const request = JSON.parse(await readFile(join(root, 'request.json'), 'utf8')), envelope = JSON.parse(await readFile(join(root, 'envelope.json'), 'utf8'));
  const publication = await publishVisualEvidence(api, request, envelope, root, { candidateTree, beforeWrite: authority });
  assert.ok(publication?.commit);
  await writeFile(join(root, 'publication.json'), JSON.stringify(publication, null, 2));
  process.stdout.write(JSON.stringify({ evidence: publication.url, commit: publication.commit, packageVersion: metadata.version }) + '\n');
} else throw Error('Select capture or publish');
