import { execFileSync } from 'node:child_process';
import { mkdtemp, mkdir, readFile, writeFile, rm, lstat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isDeepStrictEqual } from 'node:util';
import { createHash } from 'node:crypto';
import { loadProductCore, productModelDirectoryFromConfig, productModelDigest } from './product-change.mjs';
import { epicCorrelation, epicJournalKey } from './epic-github.mjs';
import { issueComments } from './stage-dispatch.mjs';
import { readEpicResourceReceipt, checkEpicProductReceipt } from './epic-journal.mjs';
import { readActionsJson } from './actions-artifact.mjs';
import { isIssuePublicationBranch } from './publication-branch.mjs';

const sha = value => /^[a-f0-9]{40}$/.test(value ?? '');
const hash = value => createHash('sha256').update(value).digest('hex');
const positive = value => Number.isSafeInteger(value) && value > 0;
const safe = value => typeof value === 'string' && !value.includes('\\') && !value.startsWith('/') && value.split('/').every(part => part && part !== '.' && part !== '..');

// Provider verification receives source data, never the publisher's credentials.
export async function replayEpicProduct(input) {
  const directory = await mkdtemp(join(tmpdir(), 'lighthouse-product-verifier-'));
  try {
    const path = join(directory, 'input.json');
    await writeFile(path, JSON.stringify(input), { mode: 0o600 });
    return JSON.parse(execFileSync(process.execPath, [fileURLToPath(import.meta.url), '--replay', path], {
      encoding: 'utf8', timeout: 120000, maxBuffer: 131072,
      env: { PATH: process.env.PATH, LANG: 'C.UTF-8', TMPDIR: directory, CI: 'true', GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: '/dev/null' },
    }));
  } finally { await rm(directory, { recursive: true, force: true }); }
}

// Reproduce the provider apply; an applied manifest alone is no execution evidence.
export async function verifyAppliedEpicProduct({ root, base, changeName, files, core }) {
  if (!sha(base) || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(changeName ?? '') || !Array.isArray(files) || !files.length || files.length > 64) throw Error('Invalid applied product source');
  if (execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim() !== base) throw Error('Product replay checkout differs from the epic base');
  if (execFileSync('git', ['status', '--porcelain'], { cwd: root, encoding: 'utf8' }).trim()) throw Error('Product replay requires a clean source checkout');
  core ??= await loadProductCore();
  for (const path of ['.product', '.product/config.yaml']) {
    const stat = await lstat(join(root, path));
    if (stat.isSymbolicLink() || (path === '.product' ? !stat.isDirectory() : !stat.isFile())) throw Error('Unsafe ProductShape configuration path');
  }
  const config = await readFile(join(root, '.product/config.yaml'), 'utf8');
  const model = productModelDirectoryFromConfig(config), product = model.slice(0, -'/model'.length);
  const parts = model.split('/');
  for (let i = 1; i <= parts.length; i++) {
    const stat = await lstat(join(root, ...parts.slice(0, i)));
    if (!stat.isDirectory() || stat.isSymbolicLink()) throw Error('Unsafe product baseline directory');
  }
  await productModelDigest(root);
  for (const path of [`${product}/changes`, `${product}/changes/active`, `${product}/changes/completed`]) {
    const stat = await lstat(join(root, path)).catch(error => { if (error.code === 'ENOENT') return null; throw error; });
    if (stat && (!stat.isDirectory() || stat.isSymbolicLink())) throw Error('Unsafe Product Change history directory');
  }
  const completed = `${product}/changes/completed/${changeName}/change.md`, active = `${product}/changes/active/${changeName}`;
  const seen = new Set(); let bytes = 0;
  for (const file of files) {
    if (!safe(file.path) || seen.has(file.path) || file.mode !== '100644' || file.path !== completed && !file.path.startsWith(`${model}/`) || !file.path.endsWith('.md') || file.content !== null && (typeof file.content !== 'string' || Buffer.from(file.content, 'base64').toString('base64') !== file.content)) throw Error('Product source contains a non-product or unsafe change');
    seen.add(file.path);
    if (file.content !== null && ((bytes += Buffer.byteLength(file.content, 'base64')) > 524288 || Buffer.byteLength(file.content, 'base64') > 65536)) throw Error('Product source exceeds content bounds');
  }
  const manifestFile = files.find(file => file.path === completed);
  if (!manifestFile?.content) throw Error('Product source needs its completed change manifest');
  const manifest = Buffer.from(manifestFile.content, 'base64').toString('utf8');
  const parsed = core.parseArtifactDocument(manifest, completed);
  const fm = parsed.artifact?.frontmatter;
  if (!fm || fm.type !== 'product-change' || fm.status !== 'applied' || fm['base-revision'] !== base || !/^CHG-[A-Z0-9-]+$/.test(fm.id ?? '')) throw Error('Applied Product Change identity or base is invalid');
  const directory = await mkdtemp(join(tmpdir(), 'lighthouse-epic-product-'));
  const replay = join(directory, 'replay');
  const git = args => execFileSync('git', args, { cwd: replay, encoding: 'utf8', maxBuffer: 1024 * 1024 });
  try {
    execFileSync('git', ['clone', '--quiet', '--shared', '--no-checkout', root, replay], { encoding: 'utf8' });
    git(['checkout', '--quiet', '--detach', base]);
    const existing = git(['ls-tree', '-r', '--name-only', base, `${product}/changes/completed/${changeName}`, active]);
    if (existing.trim()) throw Error('Product source would replace an existing change');
    await mkdir(join(replay, active, 'proposed'), { recursive: true });
    await writeFile(join(replay, active, 'change.md'), core.withStatus(manifest, 'approved'));
    for (const file of files.filter(file => file.path !== completed && file.content !== null)) {
      const target = join(replay, active, 'proposed', file.path.slice(model.length + 1));
      await mkdir(dirname(target), { recursive: true });
      await writeFile(target, Buffer.from(file.content, 'base64'));
    }
    const repository = await core.openRepository(replay);
    const baseline = await core.validateBaseline(repository);
    if ([...repository.configDiagnostics, ...baseline.diagnostics].some(item => item.severity === 'error')) throw Error('Product replay baseline is invalid');
    const change = await core.loadChange(join(replay, active), replay, repository.registry);
    const overlay = core.validateChange(change, baseline.artifacts, []);
    const plan = await core.planApply({ repoRoot: replay, modelRelative: model, changesRelative: `${product}/changes`, change, baseline: baseline.artifacts, overlayErrors: [...change.diagnostics, ...overlay.diagnostics].filter(item => item.severity === 'error') });
    if (plan.diagnostics.length) throw Error(`ProductShape refused prerequisite apply: ${plan.diagnostics.map(item => item.code).join(', ')}`);
    const citations = await core.scanLiveCitations(repository, baseline.artifacts, { excludeDocumentsUnder: [active] });
    if (citations.diagnostics.some(item => item.severity === 'error')) throw Error('Product prerequisite consumer citation scan is invalid');
    const affectedCitations = core.computeAffectedCitations(citations.records, [...plan.diff.added, ...plan.diff.modified, ...plan.diff.removed].map(item => item.id), core.appliedArtifacts(baseline.artifacts, change)).map(item => ({ id: item.citation.id, source: item.citation.source, line: item.citation.line, status: item.prospectiveStatus }));
    if (Buffer.byteLength(JSON.stringify(affectedCitations)) > 65536) throw Error('Product prerequisite citation report exceeds bounds');
    await core.executeApply(replay, plan);
    const applied = await core.validateBaseline(await core.openRepository(replay));
    if (applied.diagnostics.some(item => item.severity === 'error')) throw Error('Applied product prerequisite is invalid');
    await rm(join(replay, product, 'changes/completed', changeName, 'proposed'), { recursive: true, force: true });
    // Include untracked provider output when comparing the entire patch.
    git(['add', '--intent-to-add', product]);
    const actual = git(['diff', '--name-only', '-z', base]).split('\0').filter(Boolean).sort();
    if (!isDeepStrictEqual(actual, files.map(file => file.path).sort())) throw Error('Product source differs from provider apply paths');
    for (const file of files) {
      const value = await readFile(join(replay, file.path)).catch(error => { if (error.code === 'ENOENT') return null; throw error; });
      if (value?.toString('base64') !== (file.content ?? undefined)) throw Error(`Product source differs from provider apply: ${file.path}`);
      if (value !== null && ((await lstat(join(replay, file.path))).mode & 0o111)) throw Error('Product source differs from provider file mode');
    }
    return { changeId: fm.id, provider: '@prodshape/core', version: core.version, filesDigest: hash(JSON.stringify(files)), validated: true, affectedCitations };
  } finally { await rm(directory, { recursive: true, force: true }); }
}


export async function checkEpicProductApproval(api, { repository, owner, pr, product }) {
  checkEpicProductReceipt(product);
  if (pr.state !== 'open' || pr.merged || pr.head?.repo?.full_name !== repository || pr.base?.repo?.full_name !== repository || pr.head?.sha !== product.head || !positive(pr.number)) throw Error('Approved product source PR changed');
  const comments = await issueComments(api, pr.number);
  const expected = `/epic-product approve ${product.child} ${product.changeName} ${product.head} ${product.base}`;
  const approval = comments.find(comment => comment.id === product.approval);
  if (!approval || approval.user?.login !== owner || approval.user.type !== 'User' || approval.created_at !== approval.updated_at || approval.body.trim() !== expected || approval.issue_url !== `https://api.github.com/repos/${repository}/issues/${pr.number}`) throw Error('Explicit current owner product source approval is missing or edited');
  if (comments.some(comment => comment.id > approval.id && comment.user?.login === owner && /^\/epic-product\s/.test(comment.body.trim()))) throw Error('Product source approval was superseded');
}

export async function loadEpicProductSource({ api, repository, owner, child, current, readArtifact = readActionsJson }) {
  const comments = await issueComments(api, current.parent);
  const correlation = epicCorrelation({ ...current, repository, dependencies: [], kind: 'product-source' });
  const key = epicJournalKey(correlation);
  const matches = comments.filter(comment => comment.user?.login === 'github-actions[bot]' && comment.user.type === 'Bot' && comment.body?.includes('<!-- lighthouse-epic-product-source:')).filter(comment => {
    const match = comment.body.match(/<!-- lighthouse-epic-product-source:(\{[^\n]*\}) -->/);
    try { return JSON.parse(match?.[1]).key === key; } catch { return false; }
  });
  if (!matches.length) return null;
  if (matches.length !== 1) throw Error('Epic product source journal is ambiguous');
  const repo = await api('');
  const receipt = await readEpicResourceReceipt({ api, repository, owner, correlation, sourceRevision: current.sourceRevision, defaultBranch: repo.default_branch, ...(readArtifact ? { readArtifact } : {}) });
  const product = checkEpicProductReceipt(receipt.product);
  const entry = JSON.parse(matches[0].body.match(/<!-- lighthouse-epic-product-source:(\{[^\n]*\}) -->/)[1]);
  const run = await api(`actions/runs/${entry.runId}/attempts/${entry.attempt}`);
  const record = await readArtifact(api, repository, entry.runId, `lighthouse-epic-action-${current.parent}-${entry.attempt}`, 'result.json');
  const { affectedCitations, ...binding } = record?.result ?? {};
  if (run.conclusion !== 'success' || record?.schemaVersion !== 1 || record.repository !== repository || record.parent !== current.parent || record.runId !== entry.runId || record.attempt !== entry.attempt || record.workflowRevision !== run.head_sha || record.workflowRef !== run.head_branch || record.action !== 'adopt-product' || !Array.isArray(affectedCitations) || Buffer.byteLength(JSON.stringify(affectedCitations)) > 65536 || !isDeepStrictEqual(binding, { status: 'linked', parent: current.parent, child, pullRequest: receipt.resource.number, head: product.head, base: product.base, productSource: true })) throw Error('Product source lacks a successful authenticated provider adoption');
  if (product.child !== child || (await api(`git/ref/heads/${current.base}`)).object?.sha !== product.base) throw Error('Epic product source child or base changed');
  const pr = await api(`pulls/${receipt.resource.number}`);
  if (pr.id !== receipt.resource.id || pr.base?.ref !== current.base) throw Error('Epic product source target changed');
  await checkEpicProductApproval(api, { repository, owner, pr, product });
  return { ...product, pullRequest: pr.number };
}

export async function adoptEpicProductSource({ api, repository, owner, child, current, decision, root, journal, authorize, verify = replayEpicProduct }) {
  if (!positive(decision?.pr) || !positive(decision.approval) || !sha(decision.head) || !sha(decision.base) || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(decision.changeName ?? '')) throw Error('Product adoption needs the exact PR, approval comment, change, head and base');
  const correlation = epicCorrelation({ ...current, repository, dependencies: [], kind: 'product-source' }), key = epicJournalKey(correlation);
  const original = await journal.readReceipt(key);
  const observe = async () => {
    if (await authorize() !== true || (await api(`git/ref/heads/${current.base}`)).object?.sha !== decision.base) throw Error('Epic product adoption authority or base changed');
    const pr = await api(`pulls/${decision.pr}`);
    if (pr.base?.ref !== current.base || !positive(pr.id)) throw Error('Product source PR targets a different epic');
    return pr;
  };
  const pr = await observe();
  const pulls = await api('pulls?state=open&per_page=100');
  if (!Array.isArray(pulls) || pulls.length >= 100 || pulls.some(item => isIssuePublicationBranch(item.head?.ref, child, 'implement'))) throw Error('Product source adoption must precede child implementation publication');
  const compare = await api(`compare/${decision.base}...${decision.head}`);
  if (compare.status !== 'ahead' || compare.merge_base_commit?.sha !== decision.base || !Number.isSafeInteger(compare.total_commits) || compare.total_commits > 100) throw Error('Product source is unrelated to the epic base');
  const trees = await Promise.all([decision.base, decision.head].map(sha => api(`git/trees/${sha}?recursive=1`)));
  if (trees.some(tree => tree.truncated || !Array.isArray(tree.tree) || tree.tree.length > 10000)) throw Error('Product source tree exceeds bounds');
  const [before, after] = trees.map(tree => new Map(tree.tree.filter(item => item.type !== 'tree').map(item => [item.path, item])));
  const paths = [...new Set([...before.keys(), ...after.keys()])].filter(path => before.get(path)?.sha !== after.get(path)?.sha || before.get(path)?.mode !== after.get(path)?.mode || before.get(path)?.type !== after.get(path)?.type).sort((a, b) => a.localeCompare(b));
  if (!paths.length || paths.length > 64) throw Error('Product source patch exceeds bounds');
  const files = []; let bytes = 0;
  for (const path of paths) {
    const previous = before.get(path), entry = after.get(path);
    if (!safe(path) || [previous, entry].filter(Boolean).some(item => item.type !== 'blob' || item.mode !== '100644' || !sha(item.sha))) throw Error('Product source contains an unsafe path, link or executable');
    if (!entry) { files.push({ path, mode: '100644', content: null }); continue; }
    const blob = await api(`git/blobs/${entry.sha}`);
    if (blob.encoding !== 'base64' || typeof blob.content !== 'string' || blob.content.length > 90000 || !Number.isSafeInteger(blob.size) || blob.size > 65536 || (bytes += blob.size) > 524288) throw Error('Product source blob exceeds bounds');
    const content = blob.content.replaceAll('\n', '');
    if (Buffer.from(content, 'base64').length !== blob.size || Buffer.from(content, 'base64').toString('base64') !== content) throw Error('Product source blob encoding is invalid');
    if (createHash('sha1').update(`blob ${blob.size}\0`).update(Buffer.from(content, 'base64')).digest('hex') !== entry.sha) throw Error('Product source blob differs from its immutable tree');
    files.push({ path, mode: entry.mode, content });
  }
  const evidence = await verify({ root, base: decision.base, changeName: decision.changeName, files });
  if (evidence.validated !== true || evidence.filesDigest !== hash(JSON.stringify(files))) throw Error('Product replay evidence differs from its source');
  const product = { child, approval: decision.approval, base: decision.base, head: decision.head, changeName: decision.changeName, changeId: evidence.changeId, filesDigest: evidence.filesDigest, provider: evidence.provider, version: evidence.version };
  await checkEpicProductApproval(api, { repository, owner, pr, product });
  const recheck = async () => {
    const fresh = await observe();
    if (fresh.id !== pr.id) throw Error('Product source PR identity changed');
    await checkEpicProductApproval(api, { repository, owner, pr: fresh, product });
  };
  if (original && original.state !== 'intent' && (!isDeepStrictEqual(original.product, product) || !isDeepStrictEqual(original.resource, { id: pr.id, number: pr.number }))) throw Error('An earlier product adoption must be reconciled first');
  let receipt = original;
  if (!receipt) { await recheck(); receipt = { schemaVersion: 1, state: 'intent', correlation }; await journal.writeReceipt(key, receipt); }
  if (receipt.state === 'intent') { await recheck(); receipt = { ...receipt, state: 'created', resource: { id: pr.id, number: pr.number }, product }; await journal.writeReceipt(key, receipt); }
  if (receipt.state === 'created') { await recheck(); receipt = { ...receipt, state: 'linked' }; await journal.writeReceipt(key, receipt); }
  if (receipt.state !== 'linked') throw Error('Product source adoption is not linked');
  await recheck();
  return { status: 'linked', parent: current.parent, child, pullRequest: pr.number, head: product.head, base: product.base, productSource: true, affectedCitations: evidence.affectedCitations ?? [] };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  (async () => {
    if (process.argv[2] !== '--replay' || !process.argv[3] || Object.keys(process.env).some(key => !['PATH', 'LANG', 'TMPDIR', 'CI', 'GIT_CONFIG_NOSYSTEM', 'GIT_CONFIG_GLOBAL'].includes(key))) throw Error('Product replay requires the credential-free verifier environment');
    const result = await verifyAppliedEpicProduct(JSON.parse(await readFile(process.argv[3], 'utf8')));
    console.log(JSON.stringify(result));
  })().catch(error => { console.error(error.message); process.exitCode = 1; });
}
