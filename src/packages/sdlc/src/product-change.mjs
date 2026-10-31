import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { cp, lstat, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve, sep } from 'node:path';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

export const PRODUCT_CHANGE_SCHEMA_VERSION = 1;
export const PRODUCT_CHANGE_WORKER = 'product-change';
export const PRODUCT_FILE_LIMITS = Object.freeze({ files: 64, fileBytes: 65536, totalBytes: 524288 });
const namePattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const hashPattern = /^[a-f0-9]{64}$/;
const revisionPattern = /^[a-f0-9]{40}$/;
const require = createRequire(import.meta.url);
const openspec = (cwd, args) => execFileSync('npx', ['--yes', '--package', '@fission-ai/openspec@1.15.0', 'openspec', ...args], { cwd, encoding: 'utf8', timeout: 120000, maxBuffer: 1024 * 1024, env: { ...process.env, OPENSPEC_TELEMETRY: '0', CI: 'true' } });

const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const exact = (value, fields) => record(value) && Object.keys(value).every(key => fields.includes(key)) && fields.every(key => Object.hasOwn(value, key));
const sha = value => createHash('sha256').update(value).digest('hex');
const digest = sha;
const safePath = value => typeof value === 'string' && !value.includes('\\') && !value.startsWith('/') && !/^[A-Za-z]:/.test(value) && value.split('/').every(part => part && part !== '.' && part !== '..');

export function validateProductRequest(value) {
  const errors = [];
  if (!exact(value, ['schemaVersion', 'kind', 'identity', 'entry', 'idea', 'scope', 'createdAt', ...(['changeName'].filter(k => Object.hasOwn(value ?? {}, k))), ...(['feedback'].filter(k => Object.hasOwn(value ?? {}, k))) ])) return ['Product Change request has unsupported or missing fields'];
  if (value.schemaVersion !== 1 || value.kind !== 'request') errors.push('Product Change request identity is unsupported');
  if (!['idea', 'parent-handoff', 'feedback'].includes(value.entry)) errors.push('Product Change request entry is unsupported');
  if (typeof value.idea !== 'string' || !value.idea.trim() || value.idea.length > 12000) errors.push('Product Change request idea must contain 1-12000 characters');
  if (typeof value.scope !== 'string' || !value.scope.trim() || value.scope.length > 12000) errors.push('Product Change request scope must contain 1-12000 characters');
  if (!Number.isFinite(Date.parse(value.createdAt))) errors.push('Product Change request createdAt must be a timestamp');
  if (value.changeName !== undefined && !namePattern.test(value.changeName)) errors.push('Product Change request changeName must be a kebab-case OpenSpec name');
  if (value.feedback !== undefined && (typeof value.feedback !== 'string' || value.feedback.length > 12000)) errors.push('Product Change request feedback exceeds its bound');
  errors.push(...validateProductIdentity(value.identity));
  if (value.entry === 'feedback' && (!value.changeName || !value.feedback?.trim())) errors.push('Product feedback must identify the existing change and contain feedback');
  return errors;
}

export function validateProductChangeOutput(value) {
  const fields = ['schemaVersion', 'outcome', 'entry', 'affectedAreas', 'decisions', ...(['changeName', 'changeId', 'files', 'question', 'blocker', 'recovery', 'proposalDigest', 'baselineDigest', 'providerValidation'].filter(key => Object.hasOwn(value ?? {}, key)))];
  if (!exact(value, fields)) return ['result.output.productChange has unsupported or missing fields'];
  const errors = [];
  if (value.schemaVersion !== 1 || !['aligned', 'candidate', 'blocked'].includes(value.outcome) || !['idea', 'parent-handoff', 'feedback'].includes(value.entry)) errors.push('result.output.productChange identity is unsupported');
  if (!Array.isArray(value.affectedAreas) || value.affectedAreas.length > 32 || value.affectedAreas.some(item => typeof item !== 'string' || !item.trim() || item.length > 256)) errors.push('result.output.productChange affectedAreas is invalid');
  if (!Array.isArray(value.decisions) || value.decisions.length > 32 || value.decisions.some(item => typeof item !== 'string' || !item.trim() || item.length > 1000)) errors.push('result.output.productChange decisions is invalid');
  if (value.question !== undefined && (typeof value.question !== 'string' || !value.question.trim() || value.question.length > 4000 || /<!--\s*lighthouse-/i.test(value.question))) errors.push('result.output.productChange question is invalid');
  if (value.blocker !== undefined && (typeof value.blocker !== 'string' || !value.blocker.trim() || value.blocker.length > 4000 || /<!--\s*lighthouse-/i.test(value.blocker))) errors.push('result.output.productChange blocker is invalid');
  if (value.recovery !== undefined && (typeof value.recovery !== 'string' || !value.recovery.trim() || value.recovery.length > 4000 || /<!--\s*lighthouse-/i.test(value.recovery))) errors.push('result.output.productChange recovery is invalid');
  if (value.changeName !== undefined && !namePattern.test(value.changeName)) errors.push('result.output.productChange changeName is invalid');
  if (value.changeId !== undefined && !/^CHG-[A-Z0-9-]+$/.test(value.changeId)) errors.push('result.output.productChange changeId is invalid');
  if (value.proposalDigest !== undefined && !hashPattern.test(value.proposalDigest)) errors.push('result.output.productChange proposalDigest is invalid');
  if (value.baselineDigest !== undefined && !hashPattern.test(value.baselineDigest)) errors.push('result.output.productChange baselineDigest is invalid');
  if (value.outcome === 'candidate') {
    if (!value.changeName || !value.changeId || !value.baselineDigest || !Array.isArray(value.files)) errors.push('candidate Product Change output needs its change identity, baseline digest, and files');
    else try {
      const checked = validateProductChangeFiles(value.files, { changeName: value.changeName });
      if (checked.changeId !== value.changeId || value.proposalDigest !== undefined && checked.digest !== value.proposalDigest) errors.push('candidate Product Change identity or digest does not match its files');
    } catch (error) { errors.push(error.message); }
    if (!exact(value.providerValidation, ['status', 'diagnosticCount']) || !['pending', 'passed'].includes(value.providerValidation.status) || !Number.isSafeInteger(value.providerValidation.diagnosticCount) || value.providerValidation.diagnosticCount < 0 || value.providerValidation.status === 'pending' && value.providerValidation.diagnosticCount !== 0 || value.providerValidation.status === 'passed' && !value.proposalDigest) errors.push('candidate Product Change needs pending host validation or a bound successful provider validation');
  }
  if (value.outcome === 'aligned' && (value.files !== undefined || value.changeName !== undefined || value.changeId !== undefined)) errors.push('aligned Product Change output cannot include a delta');
  const hasQuestion = typeof value.question === 'string' && !!value.question.trim();
  const hasBlocker = typeof value.blocker === 'string' && !!value.blocker.trim();
  const hasRecovery = typeof value.recovery === 'string' && !!value.recovery.trim();
  if (value.outcome === 'blocked' && ((!hasQuestion && !hasBlocker) || (value.question !== undefined && (value.blocker !== undefined || value.recovery !== undefined)) || (hasBlocker && !hasRecovery) || value.files !== undefined)) errors.push('blocked Product Change output needs either one decision question or one technical blocker with recovery and no candidate files');
  if (value.outcome !== 'blocked' && (value.blocker !== undefined || value.recovery !== undefined)) errors.push('only a blocked Product Change can include a technical blocker or recovery');
  if (value.files !== undefined && value.outcome !== 'candidate') errors.push('only a candidate Product Change can include files');
  return errors;
}

export async function productModelDigest(root) {
  const modelRoot = await productModelDirectory(root);
  const base = resolve(root, modelRoot);
  const files = [];
  async function collect(directory, relative = '') {
    for (const entry of await (await import('node:fs/promises')).readdir(directory, { withFileTypes: true })) {
      const path = relative ? `${relative}/${entry.name}` : entry.name;
      const target = join(directory, entry.name), stat = await lstat(target);
      if (stat.isSymbolicLink() || !stat.isDirectory() && !stat.isFile()) throw Error(`Unsafe accepted product model path: ${path}`);
      if (stat.isDirectory()) await collect(target, path);
      else {
        if (files.length >= 512 || stat.size > 65536) throw Error('Accepted product model exceeds fingerprint bounds');
        files.push({ path, content: await readFile(target) });
      }
    }
  }
  await collect(base);
  return digest(files.sort((a, b) => a.path.localeCompare(b.path)).map(file => `${file.path}\0${sha(file.content)}\n`).join(''));
}

export async function productModelDirectory(root) {
  let productRoot = 'docs/product';
  try {
    const config = await readFile(resolve(root, '.product/config.yaml'), 'utf8');
    const declared = config.match(/^product-root:\s*(.*?)\s*$/m)?.[1]?.replace(/^(?:"(.*)"|'(.*)')$/, (_match, doubleQuoted, singleQuoted) => doubleQuoted ?? singleQuoted);
    if (declared) productRoot = declared;
  } catch (error) { if (error.code !== 'ENOENT') throw error; }
  if (!safePath(productRoot) || productRoot.includes('\\') || productRoot.split('/').some(part => part.startsWith('.'))) throw Error('ProductShape product-root is unsafe');
  return `${productRoot}/model`;
}

export function validateProductIdentity(value) {
  if (!exact(value, ['repository', 'issue', 'parentRunId', 'authorizationDigest', 'policyDigest', 'workflowRevision', 'head'])) return ['Product Change identity has unsupported or missing fields'];
  const errors = [];
  if (typeof value.repository !== 'string' || !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(value.repository)) errors.push('Product Change repository identity is invalid');
  if (!Number.isSafeInteger(value.issue) || value.issue < 1) errors.push('Product Change issue identity is invalid');
  if (typeof value.parentRunId !== 'string' || !value.parentRunId.trim() || value.parentRunId.length > 128) errors.push('Product Change parent run identity is invalid');
  if (!hashPattern.test(value.authorizationDigest ?? '') || !hashPattern.test(value.policyDigest ?? '')) errors.push('Product Change authority and policy digests must be SHA-256');
  if (!revisionPattern.test(value.workflowRevision ?? '') || !revisionPattern.test(value.head ?? '')) errors.push('Product Change revisions must be full commit SHAs');
  return errors;
}

export function validateProductCheckpoint(value) {
  const fields = ['schemaVersion', 'kind', 'identity', 'requestDigest', 'changeName', 'changeId', 'proposalDigest', 'baselineDigest', 'state', 'effectIds'];
  const optional = ['pendingQuestion', 'parent'];
  if (!exact(value, [...fields, ...optional.filter(key => Object.hasOwn(value ?? {}, key))])) return ['Product Change checkpoint has unsupported or missing fields'];
  const errors = [...validateProductIdentity(value.identity)];
  if (value.schemaVersion !== 1 || value.kind !== 'checkpoint') errors.push('Product Change checkpoint identity is unsupported');
  if (!namePattern.test(value.changeName ?? '') || !/^CHG-[A-Z0-9-]{1,156}$/.test(value.changeId ?? '')) errors.push('Product Change checkpoint identity is invalid');
  for (const field of ['requestDigest', 'proposalDigest', 'baselineDigest']) if (!hashPattern.test(value[field] ?? '')) errors.push(`${field} must be SHA-256`);
  if (!['preparing', 'waiting-product-decision', 'approved', 'applying', 'applied', 'blocked'].includes(value.state)) errors.push('Product Change checkpoint state is unsupported');
  if (!Array.isArray(value.effectIds) || value.effectIds.length > 32 || value.effectIds.some(item => typeof item !== 'string' || !item.trim() || item.length > 256) || new Set(value.effectIds).size !== value.effectIds.length) errors.push('Product Change checkpoint effectIds are invalid');
  if (value.parent !== undefined) {
    const parent = value.parent;
    if (!exact(parent, ['issue', 'stage', 'predecessor', 'gap', 'sourceRevision', 'baseRevision', 'taskDigest', 'autoImplement', ...(['feedback', 'pullRequest', 'review'].filter(key => Object.hasOwn(parent ?? {}, key)))]) || parent.issue !== value.identity?.issue || !['triage', 'refine', 'propose', 'implement'].includes(parent.stage) || !exact(parent.predecessor, ['runId', 'attempt']) || !/^[1-9][0-9]*$/.test(parent.predecessor.runId ?? '') || !Number.isSafeInteger(parent.predecessor.attempt) || parent.predecessor.attempt < 1 || !exact(parent.gap, ['summary', 'scope']) || !['summary', 'scope'].every(key => typeof parent.gap[key] === 'string' && parent.gap[key].trim() && parent.gap[key].length <= 4000 && !/<!--\s*lighthouse-/i.test(parent.gap[key])) || !revisionPattern.test(parent.sourceRevision ?? '') || !revisionPattern.test(parent.baseRevision ?? '') || !hashPattern.test(parent.taskDigest ?? '') || typeof parent.autoImplement !== 'boolean') errors.push('Product Change parent checkpoint is invalid');
  }
  if (value.parent?.pullRequest !== undefined) {
    const pr = value.parent.pullRequest;
    if (!exact(pr, ['number', 'head', 'branch']) || !Number.isSafeInteger(pr.number) || pr.number < 1 || !revisionPattern.test(pr.head ?? '') || typeof pr.branch !== 'string' || !new RegExp(`^lighthouse/(?:implement|propose)-${value.identity?.issue}-[a-f0-9]{12}$`).test(pr.branch)) errors.push('Product Change parent PR evidence is invalid');
  }
  if (value.parent?.review !== undefined) {
    const review = value.parent.review;
    if (!exact(review, ['number', 'path', 'feedbackDigest', 'threadDigest']) || !Number.isSafeInteger(review.number) || review.number < 1 || review.number !== value.parent.pullRequest?.number || typeof review.path !== 'string' || !/^(?:issues\/comments|pulls\/comments|pulls\/[1-9][0-9]*\/reviews)\/[1-9][0-9]*$/.test(review.path) || !hashPattern.test(review.feedbackDigest ?? '') || !hashPattern.test(review.threadDigest ?? '')) errors.push('Product Change parent review evidence is invalid');
  }
  if (value.parent?.feedback !== undefined) {
    const feedback = value.parent.feedback;
    if (!exact(feedback, ['runId', 'attempt', 'taskDigest', 'replyTo', 'commentId']) || !/^[1-9][0-9]*$/.test(feedback.runId ?? '') || !Number.isSafeInteger(feedback.attempt) || feedback.attempt < 1 || !hashPattern.test(feedback.taskDigest ?? '') || !hashPattern.test(feedback.replyTo ?? '') || !Number.isSafeInteger(feedback.commentId) || feedback.commentId < 1) errors.push('Product Change parent answer evidence is invalid');
  }
  if (value.pendingQuestion !== undefined && (typeof value.pendingQuestion !== 'string' || value.pendingQuestion.length > 4000)) errors.push('Product Change checkpoint pendingQuestion exceeds its bound');
  return errors;
}

function parseStatus(path, content) {
  if (!path.endsWith('/product-change/change.md')) return null;
  const frontmatter = content.match(/^---\s*\n([\s\S]*?)\n---(?:\n|$)/);
  if (!frontmatter) throw Error('Product Change manifest needs YAML frontmatter');
  const status = frontmatter[1].match(/^status:\s*([A-Za-z-]+)\s*$/m)?.[1];
  if (!status) throw Error('Product Change manifest needs a status');
  if (!['draft', 'in-review', 'rejected', 'superseded'].includes(status)) throw Error(`Worker output cannot set Product Change status '${status}'`);
  const changeId = frontmatter[1].match(/^id:\s*([A-Z0-9-]+)\s*$/m)?.[1];
  if (!/^CHG-[A-Z0-9-]+$/.test(changeId ?? '')) throw Error('Product Change manifest needs a valid CHG ID');
  return { status, changeId };
}

export function validateProductChangeFiles(files, { changeName, root = 'openspec/changes' } = {}) {
  if (!namePattern.test(changeName ?? '')) throw Error('Product Change name must be lowercase kebab-case');
  if (!Array.isArray(files) || !files.length || files.length > PRODUCT_FILE_LIMITS.files) throw Error('Product Change candidate must contain a bounded non-empty file list');
  const seen = new Set();
  let total = 0, manifest;
  const base = `${root}/${changeName}/`;
  for (const file of files) {
    if (!exact(file, ['path', 'content', ...(['mode'].filter(key => Object.hasOwn(file ?? {}, key))) ])) throw Error('Product Change candidate file has unsupported or missing fields');
    if (!safePath(file.path) || !file.path.startsWith(base)) throw Error(`Product Change file is outside its hosted change: ${file.path}`);
    if (seen.has(file.path)) throw Error(`Duplicate Product Change path: ${file.path}`);
    seen.add(file.path);
    if (file.mode !== undefined && file.mode !== '100644' && file.mode !== '100755') throw Error(`Product Change file mode is not regular: ${file.path}`);
    const relative = file.path.slice(base.length);
    const allowed = relative === '.openspec.yaml' || relative === 'proposal.md' || relative === 'product-change/change.md' || relative === 'product-change/impact.json' || /^product-change\/proposed\/[A-Za-z0-9._/-]+\.(?:md|json|ya?ml)$/.test(relative);
    if (!allowed || relative !== '.openspec.yaml' && relative.split('/').some(part => part.startsWith('.'))) throw Error(`Unsupported Product Change file: ${file.path}`);
    if (file.path.startsWith('docs/product/model/')) throw Error('Product Change candidates cannot write accepted model artifacts');
    if (typeof file.content !== 'string') throw Error(`Product Change file content must be text: ${file.path}`);
    const bytes = Buffer.byteLength(file.content, 'utf8');
    if (bytes > PRODUCT_FILE_LIMITS.fileBytes) throw Error(`Product Change file exceeds its size bound: ${file.path}`);
    total += bytes;
    if (total > PRODUCT_FILE_LIMITS.totalBytes) throw Error('Product Change candidate exceeds its total size bound');
    const parsed = parseStatus(file.path, file.content);
    if (parsed) manifest = parsed;
  }
  if (!seen.has(`${base}.openspec.yaml`) || !manifest) throw Error('Product Change candidate needs its OpenSpec schema pin and provider manifest');
  const spec = files.find(file => file.path === `${base}.openspec.yaml`)?.content;
  if (!/^schema:\s*product-change\s*$/m.test(spec ?? '')) throw Error('Product Change must use the installed product-change schema');
  if (!files.some(file => file.path.startsWith(`${base}product-change/proposed/`))) throw Error('Product Change candidate must include proposed provider artifacts');
  const digestValue = sha([...files].sort((a, b) => a.path.localeCompare(b.path)).map(file => `${file.path}\0${sha(file.content)}\n`).join(''));
  return { files: files.length, bytes: total, ...manifest, digest: digestValue };
}

export async function validateProductWorkspace(root, changeName, bridge) {
  if (!bridge || typeof bridge.validateOpenSpecProductChange !== 'function') throw Error('Pinned ProductShape OpenSpec bridge is unavailable');
  const result = await bridge.validateOpenSpecProductChange(resolve(root), changeName);
  const blocking = result.blocking ?? [];
  if (blocking.length) throw Error(`Product Change overlay validation failed: ${blocking.map(item => item.message ?? item.code).join('; ')}`);
  return result;
}

export async function prepareProductChange(root, changeName, files, bridge) {
  if (!namePattern.test(changeName ?? '')) throw Error('Product Change name must be lowercase kebab-case');
  const temp = await mkdtemp(join(tmpdir(), 'lighthouse-product-workflow-'));
  try {
    const productRoot = dirname(await productModelDirectory(root));
    for (const relative of [productRoot, '.product/config.yaml', 'openspec/config.yaml', 'openspec/schemas/product-change']) {
      const source = join(root, relative), target = join(temp, relative);
      await mkdir(dirname(target), { recursive: true });
      await cp(source, target, { recursive: true, errorOnExist: true, force: false });
    }
    openspec(temp, ['new', 'change', changeName, '--schema', 'product-change', '--json']);
    const rootPath = `openspec/changes/${changeName}`;
    if (!files) {
      const schemaPin = await readFile(join(temp, rootPath, '.openspec.yaml'), 'utf8');
      if ((schemaPin.match(/^skip_specs:\s*true\s*$/gm) ?? []).length !== 1) throw Error('OpenSpec scaffold must declare skip_specs exactly once');
      const instructions = {};
      for (const artifact of ['intent', 'delta']) {
        const value = JSON.parse(openspec(temp, ['instructions', artifact, '--change', changeName, '--json']));
        instructions[artifact] = { outputPath: value.outputPath, instruction: value.instruction, template: value.template };
      }
      return { provider: '@fission-ai/openspec@1.15.0', schema: 'product-change', root: rootPath, changeName, schemaPin, instructions };
    }
    const summary = validateProductChangeFiles(files, { changeName });
    const schemaPin = files.find(file => file.path === `${rootPath}/.openspec.yaml`).content;
    for (const file of files) {
      const target = join(temp, file.path);
      await mkdir(dirname(target), { recursive: true });
      await writeFile(target, file.content);
    }
    openspec(temp, ['validate', changeName, '--strict', '--no-interactive']);
    const validation = bridge ? await validateProductWorkspace(temp, changeName, bridge) : null;
    const instructions = {};
    for (const artifact of ['intent', 'delta']) {
      const value = JSON.parse(openspec(temp, ['instructions', artifact, '--change', changeName, '--json']));
      instructions[artifact] = { outputPath: value.outputPath, instruction: value.instruction, template: value.template };
    }
    if (bridge && validation) return { ...summary, provider: '@prodshape/integration-openspec', root: rootPath, openSpec: 'passed', diagnostics: validation.diagnostics, schemaPin, instructions, files };
    return { ...summary, root: rootPath, openSpec: 'passed', provider: 'unavailable', schemaPin, instructions, files };
  } finally { await rm(temp, { recursive: true, force: true }); }
}

export async function loadProductBridge({ entry = process.env.PRODSHAPE_INTEGRATION_OPENSPEC_ENTRY } = {}) {
  const spec = entry ?? require.resolve('@prodshape/integration-openspec');
  const bridge = await import(spec.startsWith('/') ? pathToFileURL(spec).href : spec);
  for (const name of ['validateOpenSpecProductChange', 'applyOpenSpecProductChange']) if (typeof bridge[name] !== 'function') throw Error(`Pinned ProductShape bridge does not provide ${name}`);
  return bridge;
}

export async function loadProductCore() {
  const entry = require.resolve('@prodshape/core');
  const metadata = JSON.parse(await readFile(join(dirname(dirname(entry)), 'package.json'), 'utf8'));
  if (metadata.name !== '@prodshape/core' || metadata.version !== '0.25.0') throw Error('Pinned ProductShape core 0.25.0 is unavailable');
  const core = await import(pathToFileURL(entry).href);
  for (const name of ['openRepository', 'validateBaseline', 'inspectArtifact', 'analyzeImpact', 'emitCitation']) if (typeof core[name] !== 'function') throw Error(`Pinned ProductShape core does not provide ${name}`);
  return { ...core, version: metadata.version };
}

export async function prepareProductEvidence(root, destination, core, { baselineDigest } = {}) {
  if (baselineDigest && await productModelDigest(root) !== baselineDigest) throw Error('ProductShape baseline changed before evidence preparation');
  const repository = await core.openRepository(resolve(root));
  const baseline = await core.validateBaseline(repository);
  const errors = baseline.diagnostics.filter(item => item.severity === 'error');
  if (errors.length) throw Error(`ProductShape baseline has ${errors.length} blocking diagnostic(s); validate the adopter model before retrying`);
  const nodes = baseline.graph.nodes;
  if (!Array.isArray(nodes) || nodes.length > 512) throw Error('ProductShape evidence exceeds the artifact bound');
  await mkdir(destination, { recursive: true });
  const index = []; let bytes = 0;
  for (const node of nodes) {
    if (!/^[A-Z0-9][A-Z0-9-]{0,159}$/.test(node.id ?? '')) throw Error('ProductShape evidence has an unsafe artifact identity');
    const report = { inspect: core.inspectArtifact(baseline.graph, node.id), impact: core.analyzeImpact(baseline.graph, node.id), citation: core.emitCitation({ id: node.id, digest: node.digest, form: 'payload' }) };
    const content = JSON.stringify(report, null, 2) + '\n'; bytes += Buffer.byteLength(content);
    if (Buffer.byteLength(content) > 512 * 1024 || bytes > 16 * 1024 * 1024) throw Error('ProductShape evidence exceeds the byte bound');
    await writeFile(join(destination, `${node.id}.json`), content, { flag: 'wx' });
    index.push({ id: node.id, type: node.type, title: node.title, report: `${node.id}.json` });
  }
  if (baselineDigest && await productModelDigest(root) !== baselineDigest) throw Error('ProductShape baseline changed during evidence preparation');
  await writeFile(join(destination, 'index.json'), JSON.stringify({ schemaVersion: 1, source: '@prodshape/core', version: core.version, ...(baselineDigest ? { baselineDigest } : {}), artifacts: index }, null, 2) + '\n', { flag: 'wx' });
  return { artifacts: index.length, bytes };
}

export function productReviewBinding(input) {
  const fields = ['repository', 'issue', 'pullRequest', 'changeName', 'changeId', 'proposalDigest', 'baselineDigest', 'policyDigest', 'authorityDigest', 'head', ...(Object.hasOwn(input ?? {}, 'parentDigest') ? ['parentDigest'] : [])];
  if (!exact(input, fields)) throw Error('Product review binding has unsupported or missing fields');
  if (typeof input.repository !== 'string' || !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(input.repository) || !Number.isSafeInteger(input.issue) || input.issue < 1 || !Number.isSafeInteger(input.pullRequest) || input.pullRequest < 1) throw Error('Product review target is invalid');
  if (!namePattern.test(input.changeName) || !/^CHG-[A-Z0-9-]+$/.test(input.changeId)) throw Error('Product review change identity is invalid');
  for (const field of ['proposalDigest', 'baselineDigest', 'policyDigest', 'authorityDigest']) if (!hashPattern.test(input[field] ?? '')) throw Error(`Product review ${field} is invalid`);
  if (input.parentDigest !== undefined && !hashPattern.test(input.parentDigest)) throw Error('Product review parent digest is invalid');
  if (!revisionPattern.test(input.head ?? '')) throw Error('Product review head must be a full commit SHA');
  const key = digest(JSON.stringify(input));
  return { ...input, key };
}

export function parseProductDecision(text) {
  const match = typeof text === 'string' && text.trim().match(/^\/product-change (approve|request-changes|answer) ([a-z0-9]+(?:-[a-z0-9]+)*) ([a-f0-9]{64})(?:\n([\s\S]{1,4000}))?$/);
  if (!match) return null;
  return { action: match[1], changeName: match[2], reviewKey: match[3], detail: match[4]?.trim() ?? '' };
}

export function verifyProductDecision({ decision, actor, owner, actorType = 'User', source, submitted = true, currentBinding, observedBinding, decisionId }) {
  const errors = [];
  if (!decision || !['approve', 'request-changes', 'answer'].includes(decision.action)) errors.push('Explicit Product Change action is required');
  if (actor !== owner || actorType !== 'User') errors.push('Product Change decision must come from the authenticated repository owner');
  if (!['pull-request-comment', 'pull-request-review', 'issue-comment'].includes(source) || submitted !== true) errors.push('Product Change decision must come from a newly submitted supported GitHub event');
  if (!currentBinding || !observedBinding || currentBinding.key !== observedBinding.key || currentBinding.key !== decision?.reviewKey || currentBinding.changeName !== decision?.changeName) errors.push('Product Change decision does not match the current reviewed binding');
  if (!decisionId || typeof decisionId !== 'string') errors.push('Product Change decision event identity is missing');
  if (errors.length) throw Error(errors.join('; '));
  return { schemaVersion: 1, kind: 'approval', actor, source, reviewKey: currentBinding.key, changeId: currentBinding.changeId, proposalDigest: currentBinding.proposalDigest, baselineDigest: currentBinding.baselineDigest, policyDigest: currentBinding.policyDigest, head: currentBinding.head, decisionId, observedAt: new Date().toISOString() };
}

export function authorizeProductApply({ checkpoint, approval, currentBinding, currentIdentity }) {
  const errors = [...validateProductCheckpoint(checkpoint)];
  if (!approval || approval.kind !== 'approval' || approval.schemaVersion !== 1) errors.push('Authenticated Product Change approval is required');
  if (!currentBinding || !currentIdentity) errors.push('Fresh product authority and review observations are required');
  else {
    const { key: currentKey, ...bindingFields } = currentBinding;
    const fresh = productReviewBinding(bindingFields);
    if (currentKey !== fresh.key) errors.push('Current Product Change review binding is malformed');
    if (fresh.key !== approval?.reviewKey) errors.push('Product Change approval is stale');
    if (currentIdentity.repository !== checkpoint.identity.repository || currentIdentity.issue !== checkpoint.identity.issue || currentIdentity.parentRunId !== checkpoint.identity.parentRunId || currentIdentity.authorizationDigest !== checkpoint.identity.authorizationDigest || currentIdentity.policyDigest !== checkpoint.identity.policyDigest || currentIdentity.workflowRevision !== checkpoint.identity.workflowRevision || currentIdentity.head !== checkpoint.identity.head) errors.push('Product Change parent authority or branch head changed');
  }
  if (checkpoint.changeId !== approval?.changeId || checkpoint.proposalDigest !== approval?.proposalDigest || checkpoint.baselineDigest !== approval?.baselineDigest || checkpoint.state !== 'waiting-product-decision') errors.push('Product Change checkpoint does not match the approved candidate');
  if (errors.length) throw Error(errors.join('; '));
  return { intentId: digest(`${checkpoint.identity.repository}:${checkpoint.identity.issue}:${checkpoint.changeId}:${approval.reviewKey}:apply`), approvalDigest: digest(JSON.stringify(approval)) };
}

export function createProductApplyReceipt({ intent, approval, checkpoint, headAfter, resultingModelDigest, validated, appliedAt = new Date().toISOString() }) {
  if (!intent || intent.intentId !== digest(`${checkpoint.identity.repository}:${checkpoint.identity.issue}:${checkpoint.changeId}:${approval.reviewKey}:apply`) || intent.approvalDigest !== digest(JSON.stringify(approval))) throw Error('Product apply intent does not match its approval');
  if (!revisionPattern.test(headAfter ?? '') || !hashPattern.test(resultingModelDigest ?? '') || validated !== true || !Number.isFinite(Date.parse(appliedAt))) throw Error('Product apply result is not validated');
  return { schemaVersion: 1, kind: 'apply-receipt', intentId: intent.intentId, approvalDigest: intent.approvalDigest, changeId: checkpoint.changeId, headBefore: checkpoint.identity.head, headAfter, proposalDigest: checkpoint.proposalDigest, baselineDigest: checkpoint.baselineDigest, resultingModelDigest, validated: true, appliedAt };
}

export function verifyProductChangePath(root, relativePath) {
  if (!safePath(relativePath)) throw Error('Invalid Product Change path');
  const absolute = resolve(root, relativePath);
  const prefix = `${resolve(root)}${sep}`;
  if (!absolute.startsWith(prefix)) throw Error('Product Change path escapes its workspace');
  return lstat(absolute).then(stat => {
    if (!stat.isFile() || stat.isSymbolicLink()) throw Error(`Product Change path is not a regular file: ${relativePath}`);
    return absolute;
  });
}

export function checkProductResumePullRequest(pr, repository, resume) {
  if (!resume || pr?.number !== resume.pullRequest || pr.state !== 'open' || pr.merged || !pr.draft || pr.user?.login !== 'github-actions[bot]' || pr.user?.type !== 'Bot' || pr.head?.repo?.full_name !== repository || pr.base?.repo?.full_name !== repository || pr.head.sha !== resume.head || pr.head.ref !== resume.branch) throw Error('Applied product PR changed before parent continuation');
  const matches = [...(pr.body ?? '').matchAll(/<!-- lighthouse-product-change-checkpoint:(\{[^\n]*\}) -->/g)];
  if (matches.length !== 1) throw Error('Applied product checkpoint is unavailable');
  const checkpoint = JSON.parse(matches[0][1]);
  if (validateProductCheckpoint(checkpoint).length || checkpoint.state !== 'applied' || checkpoint.identity.issue !== resume.issue || checkpoint.identity.head !== resume.head || JSON.stringify(checkpoint.parent) !== JSON.stringify(resume.parent) || !checkpoint.effectIds.includes(`apply:${resume.receiptIntent}:${resume.head}`)) throw Error('Applied product checkpoint changed before parent continuation');
  return checkpoint;
}

function productDeliveryProof(pr, kind) {
  const expression = new RegExp(`<!-- lighthouse-product-${kind}:(\\{[^\\n]*\\}) -->`, 'g');
  const proofs = [...(pr?.body ?? '').matchAll(expression)];
  const checkpoints = [...(pr?.body ?? '').matchAll(/<!-- lighthouse-product-change-checkpoint:(\{[^\n]*\}) -->/g)];
  if (proofs.length !== 1 || checkpoints.length !== 1) return null;
  let proof, checkpoint;
  try { proof = JSON.parse(proofs[0][1]); checkpoint = JSON.parse(checkpoints[0][1]); } catch { return null; }
  if (!exact(proof, ['schemaVersion', 'issue', 'runId', 'applyIntent', 'head']) || proof.schemaVersion !== 1 || !Number.isSafeInteger(proof.issue) || proof.issue < 1 || !hashPattern.test(proof.runId ?? '') || !hashPattern.test(proof.applyIntent ?? '') || proof.head !== pr.head?.sha || validateProductCheckpoint(checkpoint).length || checkpoint.state !== 'applied' || checkpoint.identity.issue !== proof.issue || !checkpoint.parent || !checkpoint.effectIds.includes(`apply:${proof.applyIntent}:${checkpoint.identity.head}`)) return null;
  return proof;
}

export const productImplementationProof = pr => productDeliveryProof(pr, 'implementation');
export const productProposalProof = pr => productDeliveryProof(pr, 'proposal');
