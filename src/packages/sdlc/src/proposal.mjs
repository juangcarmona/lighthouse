import { loadDispatch, checkDispatchClaim } from './stage-dispatch.mjs';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { isDeepStrictEqual } from 'node:util';
import { checkProductResumePullRequest } from './product-change.mjs';

export const changeName = issue => {
  if (!Number.isSafeInteger(issue) || issue < 1) throw Error('Invalid proposal issue');
  return `issue-${issue}-proposal`;
};
export const proposalRoot = issue => `openspec/changes/${changeName(issue)}`;

export function validateProposalFiles(files, issue) {
  const root = proposalRoot(issue), seen = new Set();
  if (!Array.isArray(files) || files.length > 24) throw Error('Proposal needs at most 24 bounded files');
  let bytes = 0;
  for (const file of files) {
    if (!file || Object.keys(file).sort().join(',') !== 'content,path' || typeof file.path !== 'string' || typeof file.content !== 'string') throw Error('Invalid proposal file');
    const relative = file.path.slice(root.length + 1);
    if (!file.path.startsWith(`${root}/`) || !/^(\.openspec\.yaml|proposal\.md|design\.md|tasks\.md|specs\/[a-z0-9]+(?:-[a-z0-9]+)*(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)*\/spec\.md)$/.test(relative)) throw Error('Proposal write outside authorized Markdown paths');
    if (relative === '.openspec.yaml' && file.content.trim() !== 'skip_specs: true') throw Error('Proposal metadata may only declare skip_specs: true');
    if (seen.has(file.path) || !file.content.trim() || file.content.includes('\0')) throw Error('Duplicate or empty proposal file');
    seen.add(file.path); bytes += Buffer.byteLength(file.content);
    if (bytes > 96000) throw Error('Proposal exceeds 96000 bytes');
  }
  for (const name of ['proposal.md', 'design.md', 'tasks.md']) if (!seen.has(`${root}/${name}`)) throw Error(`Missing ${name}`);
  const hasSpec = [...seen].some(path => path.startsWith(`${root}/specs/`));
  const skipsSpecs = seen.has(`${root}/.openspec.yaml`);
  if (hasSpec === skipsSpecs) throw Error('Proposal needs specifications or an explicit docs-only skip_specs declaration');
  const tasks = files.find(file => file.path === `${root}/tasks.md`).content;
  if (!/^- \[ \] /m.test(tasks) || /^\s*[-*] \[[xX]\]/m.test(tasks)) throw Error('Proposal tasks must be pending implementation');
  return files;
}

const openspec = (cwd, args) => execFileSync('npx', ['--yes', '--package', '@fission-ai/openspec@1.15.0', 'openspec', ...args], { cwd, encoding: 'utf8', timeout: 120000, maxBuffer: 1024 * 1024, env: { ...process.env, OPENSPEC_TELEMETRY: '0', CI: 'true' }, stdio: ['ignore', 'pipe', 'pipe'] });

// Use the provider's scaffold, instructions and validator; never maintain a copied schema.
export async function prepareProposal(issue, files, provider = openspec) {
  if (files) validateProposalFiles(files, issue);
  const dir = await mkdtemp(join(tmpdir(), 'lighthouse-proposal-'));
  const name = changeName(issue);
  try {
    await provider(dir, ['new', 'change', name, '--schema', 'spec-driven', '--json']);
    if (!files) {
      const instructions = {};
      for (const artifact of ['proposal', 'specs', 'design', 'tasks']) {
        const value = JSON.parse(await provider(dir, ['instructions', artifact, '--change', name, '--json']));
        instructions[artifact] = { outputPath: value.outputPath, instruction: value.instruction, template: value.template };
      }
      return { provider: '@fission-ai/openspec@1.15.0', schema: 'spec-driven', root: proposalRoot(issue), instructions };
    }
    const metadata = `${proposalRoot(issue)}/.openspec.yaml`;
    for (const file of files) {
      const path = join(dir, file.path);
      if (file.path === metadata) { await writeFile(path, `${(await readFile(path, 'utf8')).trimEnd()}\nskip_specs: true\n`); continue; }
      await mkdir(dirname(path), { recursive: true }); await writeFile(path, file.content);
    }
    await provider(dir, ['validate', name, '--strict', '--no-interactive']);
    const status = JSON.parse(await provider(dir, ['status', '--change', name, '--json']));
    if (!status.isPlanningComplete) throw Error('OpenSpec planning artifacts are incomplete');
    return [...files.filter(file => file.path !== metadata), { path: metadata, content: await readFile(join(dir, metadata), 'utf8') }];
  } finally { await rm(dir, { recursive: true, force: true }); }
}

export function checkRefinement(predecessor, envelope, run, current, marker, dispatched = false) {
  if (run.status !== 'completed' || run.conclusion !== 'success' || (dispatched ? run.path !== '.github/workflows/lighthouse-sdlc-refine.lock.yml' : run.event !== 'issues' && run.event !== 'issue_comment' && run.event !== 'workflow_dispatch' || run.path !== '.github/workflows/lighthouse-sdlc-router.yml' || run.actor?.login !== current.owner)) throw Error('Predecessor is not a successful owner workflow');
  if (String(run.id) !== String(predecessor.workflowRunId) || run.head_sha !== (dispatched ? predecessor.workflowRevision : predecessor.sourceRevision) || predecessor.stage !== 'refine' || predecessor.issue !== current.issue || envelope.result?.stage !== 'refine' || envelope.result?.status !== 'passed' || envelope.result?.gate !== 'ready' || envelope.result?.runId !== predecessor.runId || marker !== predecessor.runId) throw Error('Refinement evidence identity mismatch');
  if (predecessor.sourceRevision !== current.sourceRevision || predecessor.taskDigest !== current.taskDigest) throw Error('Refinement is stale; run refine against the current source and owner intent first');
}

export async function loadStageReport(api, repo, report, current) {
  const marker = report?.body.match(/<!-- lighthouse-actions:([a-f0-9]{64}) -->/)?.[1];
  const runId = report?.body.match(/\[Workflow run\]\(https:\/\/github\.com\/[^/]+\/[^/]+\/actions\/runs\/(\d+)\)/)?.[1];
  if (!marker || !runId) throw Error('No authenticated refinement report; run refine first');
  const run = await api(`actions/runs/${runId}`);
  const artifacts = await api(`actions/runs/${runId}/artifacts?per_page=100`);
  const dir = await mkdtemp(join(tmpdir(), 'lighthouse-predecessor-'));
  try {
    const values = {};
    for (const [kind, file] of [['input', 'request.json'], ['result', 'envelope.json']]) {
      const artifact = artifacts.artifacts.find(a => a.name === `lighthouse-${/<!-- lighthouse-stage:implement:/.test(report.body) ? 'implement-' : ''}${kind}-${current.issue}-${run.run_attempt}` && !a.expired);
      if (!artifact || artifact.size_in_bytes > 2 * 1024 * 1024) throw Error('Refinement artifact unavailable or too large; run refine first');
      const archive = join(dir, `${kind}.zip`);
      const bytes = execFileSync('gh', ['api', `repos/${repo}/actions/artifacts/${artifact.id}/zip`], { maxBuffer: 2 * 1024 * 1024, timeout: 30000 });
      await writeFile(archive, bytes);
      values[kind] = JSON.parse(execFileSync('python3', ['-c', 'import sys,zipfile; z=zipfile.ZipFile(sys.argv[1]); matches=[i for i in z.infolist() if i.filename==sys.argv[2]]; assert len(matches)==1 and matches[0].file_size<=128000, "Invalid artifact member"; data=z.open(matches[0]).read(128001); assert len(data)<=128000; sys.stdout.buffer.write(data)', archive, file], { encoding: 'utf8', maxBuffer: 128000, timeout: 10000 }));
    }
    const request = values.input;
    if (request.dispatch) {
      if (!['triage', 'refine', 'propose', 'implement'].includes(request.stage) || !report.body.includes(`<!-- lighthouse-stage:${request.stage}:`)) throw Error('Unexpected dispatched stage');
      const dispatch = await loadDispatch(api, repo, current.owner, current.issue, request.dispatch.commentId, run);
      const dispatchedRevision = request.epic && request.stage === 'implement' ? request.baseRevision : request.sourceRevision;
      if (dispatch.request.stage !== request.stage || dispatch.request.id !== request.dispatch.requestId || dispatch.request.sourceRevision !== dispatchedRevision || dispatch.request.workflowRevision !== request.workflowRevision || !isDeepStrictEqual(dispatch.request.epic, request.epic)) throw Error('Dispatched report identity mismatch');
      await checkDispatchClaim(api, repo, current.issue, request.dispatch, run.id);
    } else if (!['issues', 'issue_comment', 'workflow_dispatch'].includes(run.event) || run.path !== '.github/workflows/lighthouse-sdlc-router.yml' || run.actor?.login !== current.owner || run.head_sha !== request.sourceRevision) throw Error('Stage report identity mismatch');
    if (run.status !== 'completed' || run.conclusion !== 'success' || String(run.id) !== String(request.workflowRunId) || request.issue !== current.issue || marker !== request.runId) throw Error('Stage report identity mismatch');
    return { request: values.input, envelope: values.result, report: report.html_url, run, marker };
  } finally { await rm(dir, { recursive: true, force: true }); }
}

export async function loadRefinement(api, repo, reports, current) {
  const report = [...reports].reverse().find(c => c.user.login === 'github-actions[bot]' && (/<!-- lighthouse-stage:refine:passed -->/.test(c.body) || /^## Refinement:/m.test(c.body)) && /<!-- lighthouse-actions:[a-f0-9]{64} -->/.test(c.body));
  const evidence = await loadStageReport(api, repo, report, current);
  checkRefinement(evidence.request, evidence.envelope, evidence.run, current, evidence.marker, !!evidence.request.dispatch);
  return { request: evidence.request, envelope: evidence.envelope, report: evidence.report };
}

export async function createProposalPullRequest(api, snapshot, files, body, runUrl, beforeWrite) {
  const branch = `lighthouse/propose-${snapshot.issue}-${snapshot.runId.slice(0, 12)}`;
  // A fresh immutable branch per run avoids updating a human's or another run's work.
  const commit = await api(`git/commits/${snapshot.sourceRevision}`);
  const tree = await api('git/trees', 'POST', { base_tree: commit.tree.sha, tree: files.map(file => ({ path: file.path, mode: '100644', type: 'blob', content: file.content })) });
  const created = await api('git/commits', 'POST', { message: `docs: propose issue #${snapshot.issue}`, tree: tree.sha, parents: [snapshot.sourceRevision] });
  await beforeWrite();
  if (snapshot.productResume) {
    const resume = snapshot.productResume;
    const current = await api(`pulls/${resume.pullRequest}`);
    checkProductResumePullRequest(current, snapshot.repository, resume);
    await api(`git/refs/heads/${resume.branch}`, 'PATCH', { sha: created.sha, force: false });
    const proof = { schemaVersion: 1, issue: snapshot.issue, runId: snapshot.runId, applyIntent: resume.receiptIntent, head: created.sha };
    await api(`pulls/${resume.pullRequest}`, 'PATCH', { body: `${current.body}\n\n${body.trim()}\n\n[Proposal evidence](${runUrl}).\n\n<!-- lighthouse-product-proposal:${JSON.stringify(proof)} -->` });
    return { number: resume.pullRequest, html_url: current.html_url };
  }
  await api('git/refs', 'POST', { ref: `refs/heads/${branch}`, sha: created.sha });
  const pr = await api('pulls', 'POST', { title: `Proposal for #${snapshot.issue}: ${snapshot.title.slice(0, 160)}`, head: branch, base: snapshot.defaultBranch, body: `${body}\n\nRelated to #${snapshot.issue}. Proposal only; implementation requires a separate owner decision.\n\nOpenSpec 1.15.0 strict validation passed. [Execution evidence](${runUrl}).\n\n<!-- lighthouse-proposal:${snapshot.runId} -->` });
  return pr;
}
