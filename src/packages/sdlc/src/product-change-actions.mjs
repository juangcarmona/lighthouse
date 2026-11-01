import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import { validateProductChangeFiles, validateProductCheckpoint, validateProductWorkspace, loadProductBridge, productReviewBinding, parseProductDecision, verifyProductDecision, authorizeProductApply, createProductApplyReceipt, productModelDigest, productModelDirectory } from './product-change.mjs';
import { checkImplementationPullRequest, checkProposal } from './proposal-review.mjs';
import { handoff } from './handoff.mjs';

const marker = '<!-- lighthouse-product-change-';
const digest = value => createHash('sha256').update(value).digest('hex');
export function preparePendingProductCandidate(product) {
  if (product.providerValidation?.status !== 'pending') return product;
  validateProductChangeFiles(product.files, { changeName: product.changeName });
  const path = `openspec/changes/${product.changeName}/.openspec.yaml`;
  const metadata = product.files.find(file => file.path === path);
  const flags = [...metadata.content.matchAll(/^\s*skip_specs\s*:\s*(.*?)\s*$/gm)];
  if (flags.length > 1 || flags.length === 1 && !/^true(?:\s+#.*)?$/.test(flags[0][1])) throw Error('Product Change schema pin has conflicting skip_specs metadata');
  if (flags.length) return product;
  if (product.proposalDigest !== undefined) throw Error('Cannot normalize a Product Change with a supplied proposal digest');
  return { ...product, files: product.files.map(file => file.path === path ? { ...file, content: `${file.content.trimEnd()}\nskip_specs: true\n` } : file) };
}

export async function validateProductCandidate(root, changeName, files, bridge) {
  const summary = validateProductChangeFiles(files, { changeName });
  const temp = await mkdtemp(join(tmpdir(), 'lighthouse-product-change-'));
  try {
    const productRoot = dirname(await productModelDirectory(root));
    for (const name of [productRoot, '.product/config.yaml', 'openspec/config.yaml', 'openspec/schemas']) {
      const source = join(root, name);
      try {
        const stat = await import('node:fs/promises').then(fs => fs.lstat(source));
        if (stat.isDirectory()) {
          await mkdir(dirname(join(temp, name)), { recursive: true });
          await cp(source, join(temp, name), { recursive: true, errorOnExist: true, force: false });
        }
        else {
          const destination = join(temp, name);
          await mkdir(dirname(destination), { recursive: true });
          await writeFile(destination, await readFile(source));
        }
      } catch (error) { if (error.code !== 'ENOENT') throw error; }
    }
    for (const file of files) {
      const destination = join(temp, file.path);
      await mkdir(dirname(destination), { recursive: true });
      await writeFile(destination, file.content, { flag: 'wx' });
    }
    execFileSync('npx', ['--yes', '--package', '@fission-ai/openspec@1.15.0', 'openspec', 'validate', changeName, '--strict', '--no-interactive'], { cwd: temp, encoding: 'utf8', timeout: 120000, maxBuffer: 1024 * 1024, env: { ...process.env, OPENSPEC_TELEMETRY: '0', CI: 'true' } });
    const checked = await validateProductWorkspace(temp, changeName, bridge);
    return { ...summary, baselineDigest: await productModelDigest(root), modelRoot: await productModelDirectory(root), openSpec: 'passed', provider: 'passed', diagnosticCount: checked.diagnostics?.length ?? 0 };
  } finally { await rm(temp, { recursive: true, force: true }); }
}

export function bindValidatedProductCandidate(product, validation, baselineDigest) {
  if (validation.provider !== 'passed' || validation.openSpec !== 'passed' || !/^[a-f0-9]{64}$/.test(validation.digest ?? '') || !Number.isSafeInteger(validation.diagnosticCount) || validation.diagnosticCount < 0 || validation.changeId !== product.changeId || validation.baselineDigest !== baselineDigest || product.baselineDigest !== baselineDigest || product.proposalDigest !== undefined && product.proposalDigest !== validation.digest) throw Error('Product Change candidate or baseline changed during validation');
  if (product.providerValidation?.status === 'passed' && product.providerValidation.diagnosticCount !== validation.diagnosticCount) throw Error('Product Change provider validation evidence does not match the host result');
  if (!['pending', 'passed'].includes(product.providerValidation?.status)) throw Error('Product Change provider validation state is invalid');
  return { ...product, proposalDigest: validation.digest, providerValidation: { status: 'passed', diagnosticCount: validation.diagnosticCount } };
}

export async function loadProductCandidateFromPullRequest(api, repository, pr, changeName) {
  if (pr?.state !== 'open' || pr.merged || pr.user?.login !== 'github-actions[bot]' || pr.user?.type !== 'Bot' || pr.head?.repo?.full_name !== repository || pr.base?.repo?.full_name !== repository) throw Error('Product Change review needs an open bot-owned PR in this repository');
  const changed = await api(`pulls/${pr.number}/files?per_page=100`);
  if (!Array.isArray(changed) || changed.length >= 100 || changed.some(file => file.status === 'removed' || file.status === 'renamed')) throw Error('Product Change PR file list exceeds its bound or contains removals');
  const files = [];
  for (const item of changed) {
    if (!item.filename.startsWith(`openspec/changes/${changeName}/`)) continue;
    const value = await api(`contents/${item.filename}?ref=${pr.head.sha}`);
    if (value.type !== 'file' || value.encoding !== 'base64' || value.size > 65536) throw Error(`Product Change file cannot be reviewed: ${item.filename}`);
    files.push({ path: item.filename, content: Buffer.from(value.content, 'base64').toString('utf8') });
  }
  const checked = validateProductChangeFiles(files, { changeName });
  return { files, ...checked };
}

export async function productModelDigestFromApi(api, revision, overrides = []) {
  const tree = await api(`git/trees/${revision}?recursive=1`);
  if (tree.truncated || !Array.isArray(tree.tree) || tree.tree.length > 10000) throw Error('Accepted product model tree exceeds the API bound');
  let modelRoot = 'docs/product/model';
  const config = await api(`contents/.product/config.yaml?ref=${revision}`, 'GET', undefined, true);
  if (config) {
    if (config.type !== 'file' || config.encoding !== 'base64' || config.size > 65536) throw Error('ProductShape config is not a bounded regular file');
    const value = Buffer.from(config.content, 'base64').toString('utf8').match(/^product-root:\s*(.*?)\s*$/m)?.[1]?.replace(/^(?:"(.*)"|'(.*)')$/, (_match, doubleQuoted, singleQuoted) => doubleQuoted ?? singleQuoted);
    if (value) modelRoot = `${value}/model`;
  }
  if (!safeRelative(modelRoot) || modelRoot.split('/').some(part => part.startsWith('.'))) throw Error('ProductShape product-root is unsafe');
  const entries = tree.tree.filter(item => item.path.startsWith(`${modelRoot}/`) && item.type === 'blob').sort((a, b) => a.path.localeCompare(b.path));
  if (!entries.length || entries.length > 512) throw Error('Accepted product model file list is empty or exceeds its bound');
  const changed = new Map(overrides.filter(file => file.path.startsWith(`${modelRoot}/`)).map(file => [file.path, file.deleted ? null : Buffer.from(file.content, 'utf8')]));
  const rows = [];
  let bytes = 0;
  for (const entry of entries) {
    if (entry.mode !== '100644' && entry.mode !== '100755' || entry.size > 65536) throw Error(`Accepted product model path is not a bounded regular file: ${entry.path}`);
    if (changed.has(entry.path) && changed.get(entry.path) === null) { changed.delete(entry.path); continue; }
    const blob = changed.has(entry.path) ? null : await api(`git/blobs/${entry.sha}`);
    if (blob && (blob.encoding !== 'base64' || blob.size > 65536)) throw Error(`Accepted product artifact exceeds its bound: ${entry.path}`);
    const content = changed.get(entry.path) ?? Buffer.from(blob.content, 'base64');
    changed.delete(entry.path);
    bytes += content.length;
    if (bytes > 8 * 1024 * 1024) throw Error('Accepted product model exceeds its aggregate bound');
    rows.push(`${entry.path.slice(`${modelRoot}/`.length)}\0${createHash('sha256').update(content).digest('hex')}\n`);
  }
  for (const [path, content] of changed) {
    if (content === null) throw Error(`Product apply cannot delete a missing model file: ${path}`);
    bytes += content.length;
    if (content.length > 65536 || bytes > 8 * 1024 * 1024) throw Error('Applied product model exceeds its aggregate bound');
    rows.push(`${path.slice(`${modelRoot}/`.length)}\0${createHash('sha256').update(content).digest('hex')}\n`);
  }
  if (rows.length > 512) throw Error('Applied product model file list exceeds its bound');
  return { digest: createHash('sha256').update(rows.sort((a, b) => a.split('\0')[0].localeCompare(b.split('\0')[0])).join('')).digest('hex'), modelRoot };
}

export function reviewText({ repository, snapshot, head, changeId, changeName, files, candidate, validation, runUrl, approvalKey, prUrl }) {
  const manifest = files.find(file => file.path.endsWith('/product-change/change.md'))?.content ?? '';
  const sections = [...manifest.matchAll(/^## (.+?)\n([\s\S]*?)(?=^## |(?![\s\S]))/gm)].map(match => `### ${match[1]}\n${match[2].trim()}`).join('\n\n');
  const artifacts = files.filter(file => file.path.includes('/proposed/')).map(file => `- [${file.path}](https://github.com/${repository}/blob/${head}/${file.path})`).join('\n');
  const areas = candidate.affectedAreas?.map(area => `- ${area}`).join('\n') || '- See the change manifest.';
  const decisions = candidate.decisions?.map(decision => `- ${decision}`).join('\n') || '- Review the proposed behavior in the change manifest.';
  return handoff({ status: 'review', stage: snapshot.stage, happened: `Product decision: ${changeId} was prepared for [issue #${snapshot.issue}](https://github.com/${repository}/issues/${snapshot.issue}).\n\n### Affected product areas\n${areas}\n\n### Decisions and trade-offs\n${decisions}\n\n### Product Change\n${sections}\n\n### Proposed artifacts\n${artifacts || 'No artifact links were produced.'}\n\nValidation: ProductShape overlay and OpenSpec strict validation passed (${validation.provider}, ${validation.openSpec}).`, action: `Owner: review the proposal on this PR. Approve this exact product delta in a new comment with \`/product-change approve ${changeName} ${approvalKey}\`. To request a revision, put \`/product-change request-changes ${changeName} ${approvalKey}\` on the first line of a new comment and describe the change on the next line.`, next: 'Approval starts trusted ProductShape apply. Implementation, PR merge, release and deployment require their own authorization.', link: `[Review the branch diff](https://github.com/${repository}/compare/${snapshot.defaultBranch}...${head}) · [Product Change PR](${prUrl})`, details: `[Preparation run](${runUrl})` }).replace(/<!--\s*lighthouse-/gi, '&lt;!-- lighthouse-');
}

export async function publishProductChangePullRequest(api, repository, snapshot, candidate, { validation, runUrl, beforeWrite }) {
  const files = validateProductChangeFiles(candidate.files, { changeName: candidate.changeName });
  if (files.changeId !== candidate.changeId || files.digest !== candidate.proposalDigest || validation.provider !== 'passed' || validation.openSpec !== 'passed') throw Error('Product Change candidate validation evidence is stale');
  const pulls = await api('pulls?state=open&per_page=100');
  if (pulls.length >= 100) throw Error('Open pull request list exceeds bounds');
  const issuePulls = pulls.filter(pr => pr.head?.ref?.startsWith(`lighthouse/implement-${snapshot.issue}-`) || pr.head?.ref?.startsWith(`lighthouse/product-change-${snapshot.issue}-`) || pr.head?.ref?.startsWith(`lighthouse/propose-${snapshot.issue}-`));
  if (issuePulls.length > 1) throw Error('Issue has multiple eligible delivery PRs; owner review is required');
  let pr = issuePulls[0] ? await api(`pulls/${issuePulls[0].number}`) : null;
  let base, branch, parent;
  if (pr) {
    if ((pr.head.ref.startsWith(`lighthouse/implement-${snapshot.issue}-`) || pr.head.ref.startsWith(`lighthouse/propose-${snapshot.issue}-`)) && (pr.body?.includes('<!-- lighthouse-product-change:') || pr.body?.includes('<!-- lighthouse-product-change-review:'))) {
      if (pr.user?.login !== 'github-actions[bot]' || pr.user?.type !== 'Bot' || pr.state !== 'open' || pr.merged || pr.head?.repo?.full_name !== repository) throw Error('Existing Product Change PR is not a current bot-owned PR');
    } else if (pr.head.ref.startsWith(`lighthouse/implement-${snapshot.issue}-`)) checkImplementationPullRequest(pr, repository);
    else if (pr.head.ref.startsWith(`lighthouse/propose-${snapshot.issue}-`)) checkProposal(pr, repository);
    else if (pr.user?.login !== 'github-actions[bot]' || pr.user?.type !== 'Bot' || pr.state !== 'open' || pr.merged || !pr.body?.includes('<!-- lighthouse-product-change:')) throw Error('Existing issue PR is not an eligible Lighthouse Product Change draft');
    if (pr.base?.ref !== snapshot.defaultBranch || pr.head?.repo?.full_name !== repository) throw Error('Existing issue PR targets an unexpected repository or base');
    if (!pr.draft) throw Error('Product Change cannot modify a PR already submitted for review');
    branch = pr.head.ref; parent = pr.head.sha;
    base = await api(`git/commits/${parent}`);
  } else {
    branch = `lighthouse/implement-${snapshot.issue}-${snapshot.runId.slice(0, 12)}`;
    parent = snapshot.sourceRevision;
    base = await api(`git/commits/${parent}`);
  }
  if (snapshot.productParent?.pullRequest && (!pr || pr.number !== snapshot.productParent.pullRequest.number || snapshot.productEntry !== 'feedback' && pr.head.sha !== snapshot.productParent.pullRequest.head || pr.head.ref !== snapshot.productParent.pullRequest.branch)) throw Error('Parent issue PR changed before Product Change publication');
  const tree = await api('git/trees', 'POST', { base_tree: base.tree.sha, tree: candidate.files.map(file => ({ path: file.path, mode: '100644', type: 'blob', content: file.content })) });
  const commit = await api('git/commits', 'POST', { message: `docs: prepare product change for #${snapshot.issue}`, tree: tree.sha, parents: [parent] });
  await beforeWrite();
  if (pr) {
    if ((await api(`pulls/${pr.number}`)).head.sha !== parent) throw Error('Issue PR changed before Product Change publication');
    await api(`git/refs/heads/${branch}`, 'PATCH', { sha: commit.sha, force: false });
    pr = await api(`pulls/${pr.number}`);
  } else {
    const existingBranch = await api(`git/ref/heads/${branch}`, 'GET', undefined, true);
    if (existingBranch) throw Error('Product Change branch already exists without its reviewed PR; reconcile before retry');
    await api('git/refs', 'POST', { ref: `refs/heads/${branch}`, sha: commit.sha });
    const title = `Product change for #${snapshot.issue}: ${snapshot.title.slice(0, 150)}`;
    pr = await api('pulls', 'POST', { title, head: branch, base: snapshot.defaultBranch, draft: true, body: `Product Change ${candidate.changeId} prepared for #${snapshot.issue}.\n\n${runUrl}\n\n<!-- lighthouse-product-change:${JSON.stringify({ schemaVersion: 1, issue: snapshot.issue, changeName: candidate.changeName, changeId: candidate.changeId, proposalDigest: candidate.proposalDigest })} -->` });
  }
  const repositoryInfo = await api('');
  const policyDigest = snapshot.policyDigest;
  const binding = productReviewBinding({ repository, issue: snapshot.issue, pullRequest: pr.number, changeName: candidate.changeName, changeId: candidate.changeId, proposalDigest: candidate.proposalDigest, baselineDigest: candidate.baselineDigest, policyDigest, authorityDigest: snapshot.authorizationDigest, head: pr.head.sha, ...(snapshot.productParent ? { parentDigest: digest(JSON.stringify(snapshot.productParent)) } : {}) });
  const checkpoint = {
    schemaVersion: 1, kind: 'checkpoint',
    identity: { repository, issue: snapshot.issue, parentRunId: String(snapshot.dispatch?.routerRunId ?? snapshot.workflowRunId), authorizationDigest: snapshot.authorizationDigest, policyDigest, workflowRevision: snapshot.workflowRevision, head: pr.head.sha },
    requestDigest: snapshot.dispatch?.digest ?? snapshot.taskDigest,
    changeName: candidate.changeName, changeId: candidate.changeId, proposalDigest: candidate.proposalDigest, baselineDigest: candidate.baselineDigest,
    state: 'waiting-product-decision', effectIds: [`pr:${pr.number}:${pr.head.sha}`], ...(snapshot.productParent ? { parent: snapshot.productParent } : {})
  };
  const checkpointErrors = validateProductCheckpoint(checkpoint);
  if (checkpointErrors.length) throw Error(checkpointErrors.join('; '));
  const body = reviewText({ repository, snapshot, head: pr.head.sha, changeId: candidate.changeId, changeName: candidate.changeName, files: candidate.files, candidate, validation, runUrl, approvalKey: binding.key, prUrl: pr.html_url });
  const reviewMarker = `${marker}review:${JSON.stringify(binding)} -->`;
  const checkpointMarker = `${marker}checkpoint:${JSON.stringify(checkpoint)} -->`;
  let prBody = pr.body ?? '';
  prBody = /<!-- lighthouse-product-change(?:-review|:review):/.test(prBody)
    ? prBody.replace(/<!-- lighthouse-product-change(?:-review|:review):\{[^\n]*\} -->/g, reviewMarker)
    : `${prBody}\n\n${reviewMarker}`;
  prBody = /<!-- lighthouse-product-change(?:-checkpoint|:checkpoint):/.test(prBody)
    ? prBody.replace(/<!-- lighthouse-product-change(?:-checkpoint|:checkpoint):\{[^\n]*\} -->/g, checkpointMarker)
    : `${prBody}\n${checkpointMarker}`;
  await api(`pulls/${pr.number}`, 'PATCH', { body: prBody });
  return { pullRequest: pr, binding, checkpoint, body, repositoryDefaultBranch: repositoryInfo.default_branch };
}

export function checkProductDryRun(preview, changeId) {
  if (preview.outcome !== 'dry-run' || preview.plan?.changeId && preview.plan.changeId !== changeId) {
    const codes = (preview.plan?.diagnostics ?? []).filter(item => item.severity === 'error' && /^[A-Z][A-Z0-9]{0,31}$/.test(item.code ?? '')).map(item => item.code).slice(0, 10);
    throw Error(`ProductShape dry-run does not match the reviewed change${codes.length ? `: ${[...new Set(codes)].join(', ')}` : ''}`);
  }
}

export async function applyApprovedProductChange({ root, changeName, checkpoint, approval, currentBinding, currentIdentity, bridge, headAfter, resultingModelDigest, reportBeforeWrite, publish }) {
  const intent = authorizeProductApply({ checkpoint, approval, currentBinding, currentIdentity });
  const provider = bridge ?? await loadProductBridge();
  const manifest = join(root, 'openspec', 'changes', changeName, 'product-change', 'change.md');
  const original = await readFile(manifest, 'utf8');
  if (!/^status:\s*draft\s*$/m.test(original)) throw Error('Only a draft Product Change can enter the authenticated apply path');
  await writeFile(manifest, original.replace(/^status:\s*draft\s*$/m, 'status: approved'));
  await validateProductWorkspace(root, changeName, provider);
  const preview = await provider.applyOpenSpecProductChange(root, changeName, { dryRun: true });
  checkProductDryRun(preview, checkpoint.changeId);
  const applied = await provider.applyOpenSpecProductChange(root, changeName, { reportBeforeWrite });
  if (applied.outcome !== 'applied' || applied.change?.id !== checkpoint.changeId) throw Error('ProductShape apply was refused or returned a different change');
  if ((applied.resultingModel?.diagnostics ?? []).some(item => item.severity === 'error')) throw Error('ProductShape resulting model has validation errors');
  const computedDigest = await productModelDigest(root);
  if (resultingModelDigest && resultingModelDigest !== computedDigest) throw Error('Product model changed while the apply receipt was being prepared');
  const receipt = createProductApplyReceipt({ intent, approval, checkpoint, headAfter, resultingModelDigest: computedDigest, validated: true });
  if (typeof publish !== 'function') throw Error('Trusted publisher is required for Product Change apply');
  await publish(receipt, applied, { manifest, affectedCitations: applied.affectedCitations ?? [], resultingModelDigest: computedDigest });
  return { receipt, applied, affectedCitations: applied.affectedCitations ?? [], resultingModelDigest: computedDigest };
}

export async function collectProductApplyFiles(root, changeName, baseRevision) {
  const prefix = `openspec/changes/${changeName}/product-change/change.md`;
  const modelRoot = await productModelDirectory(root);
  const options = { cwd: root, encoding: 'utf8', maxBuffer: 128000 };
  const changed = execFileSync('git', ['diff', '--name-only', '-z', '--no-renames', baseRevision, '--'], options).split('\0').filter(Boolean);
  const added = execFileSync('git', ['ls-files', '--others', '--exclude-standard', '-z', '--', '.', ':(exclude).lighthouse-harness', ':(exclude).lighthouse-harness/**'], options).split('\0').filter(Boolean);
  const paths = [...new Set([...changed, ...added])].sort();
  if (!paths.includes(prefix) || paths.length > 520 || paths.some(path => path !== prefix && !path.startsWith(`${modelRoot}/`))) throw Error('Trusted apply wrote outside the Product Change manifest and accepted model');
  const files = [];
  let bytes = 0;
  for (const path of paths) {
    const absolute = join(root, path);
    let stat;
    try { stat = await import('node:fs/promises').then(fs => fs.lstat(absolute)); }
    catch (error) {
      if (error.code !== 'ENOENT' || path === prefix) throw error;
      files.push({ path, deleted: true });
      continue;
    }
    if (!stat.isFile() || stat.isSymbolicLink()) throw Error(`Trusted apply produced a non-regular path: ${path}`);
    if (stat.size > 65536) throw Error(`Trusted apply artifact exceeds its bound: ${path}`);
    const content = await readFile(absolute, 'utf8');
    bytes += Buffer.byteLength(content);
    if (bytes > 8 * 1024 * 1024) throw Error('Trusted apply output exceeds its aggregate bound');
    files.push({ path, content });
  }
  const manifest = files.find(file => file.path === prefix)?.content ?? '';
  if (!/^status:\s*applied\s*$/m.test(manifest)) throw Error('Provider did not record the applied Product Change status');
  return { files, modelRoot };
}

export function validateProductApplyFiles(files, changeName, modelRoot = 'docs/product/model') {
  if (!safeRelative(modelRoot) || modelRoot.split('/').some(part => part.startsWith('.'))) throw Error('Product apply model root is unsafe');
  const manifestPath = `openspec/changes/${changeName}/product-change/change.md`;
  if (!Array.isArray(files) || !files.length || files.length > 520) throw Error('Product apply output file list is empty or exceeds its bound');
  const seen = new Set(); let bytes = 0;
  for (const file of files) {
    const deletion = file?.deleted === true && Object.keys(file).sort().join(',') === 'deleted,path';
    if (!file || !deletion && (Object.keys(file).sort().join(',') !== 'content,path' || typeof file.content !== 'string') || typeof file.path !== 'string' || seen.has(file.path)) throw Error('Invalid or duplicated Product apply output file');
    if (file.path !== manifestPath && !file.path.startsWith(`${modelRoot}/`)) throw Error(`Product apply output escaped the accepted model: ${file.path}`);
    if (!safeRelative(file.path) || deletion && file.path === manifestPath || !deletion && file.content.includes('\0')) throw Error(`Unsafe Product apply output: ${file.path}`);
    if (deletion) { seen.add(file.path); continue; }
    const size = Buffer.byteLength(file.content);
    if (size > 65536) throw Error(`Product apply output exceeds its file bound: ${file.path}`);
    bytes += size;
    if (bytes > 8 * 1024 * 1024) throw Error('Product apply output exceeds its aggregate bound');
    seen.add(file.path);
  }
  const manifest = files.find(file => file.path === manifestPath)?.content ?? '';
  if (!/^status:\s*applied\s*$/m.test(manifest)) throw Error('Product apply output does not retain the provider applied status');
  return files;
}

const safeRelative = path => !path.startsWith('/') && !path.includes('\\') && !path.split('/').some(part => !part || part === '.' || part === '..');

export function productApplyHandoff({ stage, receipt, pullRequest, url, affectedCitations, parent }) {
  return handoff({ status: 'completed', stage, happened: `Product Change ${receipt.changeId} was applied to the provider-validated model on PR #${pullRequest}.\n\nAffected citations:\n${(affectedCitations ?? []).map(item => `- \`${item.document ?? item.file ?? item.id ?? 'consumer'}\`: ${item.status ?? 'refresh required'}`).join('\n') || '- None reported.'}`, action: 'Owner: review the applied model and affected citations on the linked PR.', next: parent ? 'The workflow will recheck the existing parent authorization before requesting its continuation. Merge remains separate.' : 'Merge and any further delivery require their own authorization.', link: `[Review PR #${pullRequest}](${url})`, details: `<!-- lighthouse-product-apply:${JSON.stringify(receipt)} -->` });
}

export async function observeUpdatedProductPull(api, number, expectedHead, wait = ms => new Promise(resolve => setTimeout(resolve, ms))) {
  for (let attempt = 0; attempt < 20; attempt++) {
    const pr = await api(`pulls/${number}`);
    if (pr.state !== 'open' || pr.merged) throw Error('Product PR closed while confirming the applied head');
    if (pr.head?.sha === expectedHead) return pr;
    if (attempt < 19) await wait(1000);
  }
  throw Error('Product PR head update could not be confirmed; reconcile publication before retrying');
}

export async function advanceProductRef(api, branch, head) {
  try {
    await api(`git/refs/heads/${branch}`, 'PATCH', { sha: head, force: false });
  } catch (error) {
    const current = await api(`git/ref/heads/${branch}`, 'GET', undefined, true).catch(() => null);
    if (current?.object?.sha !== head) throw error;
  }
}

export async function publishProductApply(api, repository, owner, dispatch, result, beforeWrite, applyRequest) {
  const approvalInfo = dispatch.request.productApproval;
  if (dispatch.request.worker !== 'apply-product-change' || !approvalInfo || !result || result.head !== approvalInfo.head) throw Error('Product apply result does not match its authenticated dispatch');
  const files = validateProductApplyFiles(result.files, approvalInfo.changeName, result.modelRoot);
  const fresh = await loadProductApproval(api, { eventName: dispatch.request.eventName, event: dispatch.request.event, owner, repository, root: process.cwd() });
  if (!fresh || fresh.head !== approvalInfo.head || fresh.pullRequest !== approvalInfo.pullRequest || fresh.approval.reviewKey !== approvalInfo.reviewKey || fresh.checkpoint.changeId !== result.receipt?.changeId) throw Error('Product approval or reviewed branch changed before publication');
  const approvalFields = value => { const { observedAt, ...rest } = value ?? {}; return rest; };
  if (!applyRequest || applyRequest.repository !== repository || applyRequest.owner !== owner || applyRequest.issue !== fresh.issue || applyRequest.pullRequest !== fresh.pullRequest || applyRequest.head !== fresh.head || applyRequest.changeName !== fresh.changeName || !isDeepStrictEqual(applyRequest.checkpoint, fresh.checkpoint) || !isDeepStrictEqual(applyRequest.binding, fresh.binding) || !isDeepStrictEqual(approvalFields(applyRequest.approval), approvalFields(fresh.approval))) throw Error('Product apply request no longer matches authenticated approval');
  const intent = authorizeProductApply({ checkpoint: applyRequest.checkpoint, approval: applyRequest.approval, currentBinding: applyRequest.binding, currentIdentity: applyRequest.checkpoint.identity });
  const expectedReceipt = createProductApplyReceipt({ intent, approval: applyRequest.approval, checkpoint: applyRequest.checkpoint, headAfter: fresh.head, resultingModelDigest: result.resultingModelDigest, validated: true, appliedAt: result.receipt?.appliedAt });
  if (result.providerOutcome !== 'applied' || !isDeepStrictEqual(result.receipt, expectedReceipt)) throw Error('Product apply receipt does not match authenticated provider output');
  if (result.receipt.resultingModelDigest !== result.resultingModelDigest || result.receipt.baselineDigest !== fresh.checkpoint.baselineDigest || result.receipt.proposalDigest !== fresh.checkpoint.proposalDigest) throw Error('Product apply receipt does not match the approved candidate');
  const projected = await productModelDigestFromApi(api, fresh.head, files);
  if (projected.modelRoot !== result.modelRoot || projected.digest !== result.resultingModelDigest) throw Error('Published files do not reproduce the provider-validated product model');
  const pr = await api(`pulls/${fresh.pullRequest}`);
  if (pr.head.sha !== fresh.head || pr.state !== 'open' || pr.merged || pr.head.repo?.full_name !== repository) throw Error('Product PR head changed before apply publication');
  const commit = await api(`git/commits/${fresh.head}`);
  const tree = await api('git/trees', 'POST', { base_tree: commit.tree.sha, tree: files.map(file => file.deleted ? { path: file.path, mode: '100644', type: 'blob', sha: null } : { path: file.path, mode: '100644', type: 'blob', content: file.content }) });
  const created = await api('git/commits', 'POST', { message: `docs: apply product change ${fresh.checkpoint.changeId}`, tree: tree.sha, parents: [fresh.head] });
  if (!/^[a-f0-9]{40}$/.test(created?.sha ?? '')) throw Error('Created product commit has no valid identity');
  await beforeWrite(fresh);
  await advanceProductRef(api, pr.head.ref, created.sha);
  const updated = await observeUpdatedProductPull(api, fresh.pullRequest, created.sha);
  const receipt = { ...result.receipt, headAfter: updated.head.sha };
  let prBody = updated.body ?? '';
  const checkpoint = { ...fresh.checkpoint, state: 'applied', identity: { ...fresh.checkpoint.identity, head: updated.head.sha }, effectIds: [...new Set([...fresh.checkpoint.effectIds, `apply:${receipt.intentId}:${updated.head.sha}`])].slice(0, 32) };
  const checkpointErrors = validateProductCheckpoint(checkpoint);
  if (checkpointErrors.length) throw Error(checkpointErrors.join('; '));
  prBody = prBody.replace(/<!-- lighthouse-product-change(?:-checkpoint|:checkpoint):\{[^\n]*\} -->/g, `${marker}checkpoint:${JSON.stringify(checkpoint)} -->`);
  await api(`pulls/${fresh.pullRequest}`, 'PATCH', { body: prBody });
  const issueBody = productApplyHandoff({ stage: dispatch.request.stage, receipt, pullRequest: fresh.pullRequest, url: updated.html_url, affectedCitations: result.affectedCitations, parent: checkpoint.parent });
  if (checkpoint.parent && (await api(`issues/${fresh.issue}`)).labels?.some(label => label.name === 'waiting-review')) await api(`issues/${fresh.issue}/labels/waiting-review`, 'DELETE');
  const comments = await api(`issues/${fresh.issue}/comments?per_page=100`);
  const prior = comments.find(comment => comment.user?.login === 'github-actions[bot]' && [...(comment.body ?? '').matchAll(/<!-- lighthouse-product-apply:(\{[^\n]*\}) -->/g)].some(match => JSON.parse(match[1]).intentId === receipt.intentId));
  if (!prior) await api(`issues/${fresh.issue}/comments`, 'POST', { body: issueBody });
  return { pullRequest: updated, receipt, checkpoint };
}

export function productApprovalFromGitHub({ eventName, event, owner, repository, currentBinding }) {
  let source, actor, actorType, body, decisionId, submitted = true;
  if (eventName === 'issue_comment' && event.action === 'created' && event.issue?.pull_request) {
    source = 'pull-request-comment'; actor = event.comment?.user?.login; actorType = event.comment?.user?.type; body = event.comment?.body; decisionId = String(event.comment?.id);
  } else if (eventName === 'pull_request_review' && event.action === 'submitted') {
    source = 'pull-request-review'; actor = event.review?.user?.login; actorType = event.review?.user?.type; body = event.review?.body; decisionId = String(event.review?.id);
  } else if (eventName === 'issue_comment' && event.action === 'created') {
    source = 'issue-comment'; actor = event.comment?.user?.login; actorType = event.comment?.user?.type; body = event.comment?.body; decisionId = String(event.comment?.id);
  } else submitted = false;
  const decision = parseProductDecision(body);
  if (!decision || decision.action !== 'approve') return null;
  const pr = event.pull_request?.number ?? event.issue?.number;
  if (currentBinding.repository !== repository || currentBinding.pullRequest !== pr) throw Error('Product approval targets another PR');
  return verifyProductDecision({ decision, actor, actorType, owner, source, submitted, currentBinding, observedBinding: currentBinding, decisionId });
}

export function checkCurrentProductDecision({ eventName, event, current, repository, number }) {
  const original = eventName === 'issue_comment' ? event.comment : event.review;
  if (!original || !current || !/^[1-9][0-9]*$/.test(String(original.id ?? '')) || String(current.id) !== String(original.id) || current.body !== original.body || current.user?.login !== original.user?.login || current.user?.type !== original.user?.type) throw Error('Product decision was edited, deleted or replaced');
  if (eventName === 'issue_comment') {
    if (current.issue_url !== `https://api.github.com/repos/${repository}/issues/${number}` || !original.updated_at || current.updated_at !== original.updated_at) throw Error('Product decision comment changed or belongs to another PR');
  } else if (current.pull_request_url !== `https://api.github.com/repos/${repository}/pulls/${number}` || !original.submitted_at || current.submitted_at !== original.submitted_at || typeof current.state !== 'string' || typeof original.state !== 'string' || current.state.toUpperCase() !== original.state.toUpperCase() || current.state.toUpperCase() === 'DISMISSED') throw Error('Product decision review changed or was dismissed');
}

export async function checkNoLaterProductObjection(api, number, owner, decision, originalTime) {
  const started = Date.parse(originalTime ?? '');
  if (!Number.isFinite(started)) throw Error('Product decision time is unavailable');
  const comments = await (await import('./stage-dispatch.mjs')).issueComments(api, number);
  const reviews = [];
  for (let page = 1; page <= 10; page++) {
    const rows = await api(`pulls/${number}/reviews?per_page=100&page=${page}`);
    if (!Array.isArray(rows)) throw Error('Product review history is unavailable');
    reviews.push(...rows);
    if (rows.length < 100) break;
    if (page === 10) throw Error('Product review history exceeds bounds');
  }
  for (const entry of [...comments, ...reviews]) {
    if (entry.user?.login !== owner || entry.user?.type !== 'User') continue;
    const next = parseProductDecision(entry.body);
    if (!next || next.changeName !== decision.changeName || next.reviewKey !== decision.reviewKey || !['request-changes', 'answer'].includes(next.action)) continue;
    const at = Date.parse(entry.submitted_at ?? entry.created_at ?? '');
    if (!Number.isFinite(at) || at >= started) throw Error('A later owner decision requires product review before apply');
  }
}

export async function loadProductApproval(api, { eventName, event, owner, repository, root }) {
  let body, actor, actorType, source, decisionId;
  if (eventName === 'issue_comment' && event.action === 'created' && event.issue?.pull_request) {
    body = event.comment?.body; actor = event.comment?.user?.login; actorType = event.comment?.user?.type; source = 'pull-request-comment'; decisionId = String(event.comment?.id);
  } else if (eventName === 'pull_request_review' && event.action === 'submitted') {
    body = event.review?.body; actor = event.review?.user?.login; actorType = event.review?.user?.type; source = 'pull-request-review'; decisionId = String(event.review?.id);
  } else return null;
  const decision = parseProductDecision(body);
  if (!decision || !['approve', 'request-changes', 'answer'].includes(decision.action)) return null;
  const number = event.pull_request?.number ?? event.issue?.number;
  if (!Number.isSafeInteger(number) || number < 1 || !/^[1-9][0-9]*$/.test(decisionId)) throw Error('Product decision identity is invalid');
  const decisionPath = eventName === 'issue_comment' ? `issues/comments/${decisionId}` : `pulls/${number}/reviews/${decisionId}`;
  checkCurrentProductDecision({ eventName, event, current: await api(decisionPath), repository, number });
  if (decision.action === 'approve') await checkNoLaterProductObjection(api, number, owner, decision, eventName === 'issue_comment' ? event.comment.created_at : event.review.submitted_at);
  const pr = await api(`pulls/${number}`);
  if (pr.user?.login !== 'github-actions[bot]' || pr.user?.type !== 'Bot' || pr.state !== 'open' || pr.merged || pr.head?.repo?.full_name !== repository || pr.base?.repo?.full_name !== repository) throw Error('Product approval target is not a current Lighthouse PR');
  const markers = [...(pr.body ?? '').matchAll(/<!-- lighthouse-product-change(?:-review|:review):(\{[^\n]*\}) -->/g)];
  if (markers.length !== 1) throw Error('PR has no unique Product Change review binding');
  const raw = JSON.parse(markers[0][1]);
  const { key, ...fields } = raw;
  const bound = productReviewBinding(fields);
  if (bound.key !== key || bound.head !== pr.head.sha || bound.pullRequest !== pr.number || bound.repository !== repository) throw Error('Product Change review binding is stale or belongs to another PR');
  const checkpoints = [...(pr.body ?? '').matchAll(/<!-- lighthouse-product-change(?:-checkpoint|:checkpoint):(\{[^\n]*\}) -->/g)];
  if (checkpoints.length !== 1) throw Error('PR has no unique Product Change checkpoint');
  const checkpoint = JSON.parse(checkpoints[0][1]);
  const checkpointErrors = validateProductCheckpoint(checkpoint);
  if (checkpointErrors.length || (checkpoint.parent ? digest(JSON.stringify(checkpoint.parent)) !== bound.parentDigest : bound.parentDigest !== undefined) || checkpoint.state !== 'waiting-product-decision' || checkpoint.changeName !== bound.changeName || checkpoint.changeId !== bound.changeId || checkpoint.proposalDigest !== bound.proposalDigest || checkpoint.baselineDigest !== bound.baselineDigest || checkpoint.identity.head !== pr.head.sha || checkpoint.identity.issue !== bound.issue || checkpoint.identity.repository !== repository || checkpoint.effectIds.length !== 1 || checkpoint.effectIds[0] !== `pr:${pr.number}:${pr.head.sha}`) throw Error('Product Change checkpoint is stale or invalid');
  if (decision.changeName !== bound.changeName || decision.reviewKey !== bound.key) throw Error('Product approval action does not identify the current Product Change');
  const candidate = await loadProductCandidateFromPullRequest(api, repository, pr, bound.changeName);
  const repositoryInfo = await api('');
  const defaultHead = (await api(`commits/${repositoryInfo.default_branch}`)).sha;
  const accepted = await productModelDigestFromApi(api, defaultHead);
  if (candidate.changeId !== bound.changeId || candidate.digest !== bound.proposalDigest || accepted.digest !== bound.baselineDigest) throw Error('Product Change proposal or accepted baseline changed after review');
  const verified = verifyProductDecision({ decision, actor, actorType, owner, source, submitted: true, currentBinding: bound, observedBinding: bound, decisionId });
  const issue = await api(`issues/${bound.issue}`);
  if (issue.state !== 'open' || issue.labels?.some(label => ['future', 'human-working', 'agent-working'].includes(label.name))) throw Error('Product apply is blocked by the current issue state or reservation');
  if (checkpoint.parent) {
    const comments = await (await import('./stage-dispatch.mjs')).issueComments(api, bound.issue);
    await (await import('./stage-transition.mjs')).verifyProductParent(api, repository, owner, checkpoint.parent, issue, comments, defaultHead);
  }
  const feedback = decision.action === 'approve' ? null : { action: decision.action, changeName: decision.changeName, reviewKey: decision.reviewKey, text: decision.detail, sourceCommentId: decisionId, source: 'pull-request' };
  return { ...(decision.action === 'approve' ? { approval: verified } : { feedback }), binding: bound, checkpoint, issue: bound.issue, pullRequest: pr.number, head: pr.head.sha, changeName: bound.changeName, candidate, modelRoot: accepted.modelRoot };
}
