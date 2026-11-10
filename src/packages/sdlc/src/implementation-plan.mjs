import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { proposalRoot, changeName } from './proposal-files.mjs';
import { openSpec } from './openspec-provider.mjs';

function archivedPlanRoot(source, issue) {
  const name = changeName(issue), prefix = 'openspec/changes/archive/';
  const matches = new Set();
  for (const path of source.keys()) {
    if (!path.startsWith(prefix)) continue;
    const directory = path.slice(prefix.length).split('/')[0];
    if (directory === name || new RegExp(`^\\d{4}-\\d{2}-\\d{2}-${name}$`).test(directory)) matches.add(`${prefix}${directory}`);
  }
  if (matches.size > 1) throw Error(`Ambiguous archived implementation plan for issue #${issue}: ${[...matches].join(', ')}; reconcile the archives before requalification`);
  const archived = [...matches][0];
  if (archived && [...source.keys()].some(path => path.startsWith(`${proposalRoot(issue)}/`))) throw Error(`Conflicting active and archived implementation plans for issue #${issue}; reconcile them before requalification`);
  return archived;
}

async function validateArchivedPlan(source, archived, issue, provider, signal) {
  for (const name of ['.openspec.yaml', 'proposal.md', 'design.md', 'tasks.md']) {
    const file = source.get(`${archived}/${name}`);
    if (!file?.content?.toString('utf8').trim()) throw Error(`Archived implementation plan ${archived} is missing ${name}; restore the complete provider-owned plan before requalification`);
  }
  signal?.throwIfAborted();
  const directory = await mkdtemp(join(tmpdir(), 'lighthouse-archived-plan-'));
  try {
    // Resolve the archive under its original identity only in the disposable
    // provider workspace. Never scaffold or rewrite the admitted candidate.
    for (const [path, file] of source) {
      const plan = path.startsWith(`${archived}/`);
      if (!plan && path !== 'openspec/config.yaml' && !path.startsWith('openspec/specs/') && !path.startsWith('openspec/schemas/')) continue;
      if (path.includes('\\') || path.split('/').some(part => !part || part === '.' || part === '..') || !['100644', '100755'].includes(file.mode) || !Buffer.isBuffer(file.content)) throw Error(`Invalid archived OpenSpec source member: ${path}`);
      const target = join(directory, plan ? `${proposalRoot(issue)}/${path.slice(archived.length + 1)}` : path);
      await mkdir(dirname(target), { recursive: true }); await writeFile(target, file.content);
    }
    const name = changeName(issue), options = { signal };
    const validation = JSON.parse(await provider(directory, ['validate', name, '--strict', '--no-interactive', '--json'], options));
    if (validation.items?.length !== 1 || validation.items[0].id !== name || validation.items[0].type !== 'change' || validation.items[0].valid !== true || validation.summary?.totals?.failed !== 0) throw Error('strict provider validation did not pass for the issue-bound plan');
    const status = JSON.parse(await provider(directory, ['status', '--change', name, '--json'], options));
    if (status.changeName !== name || status.schemaName !== 'spec-driven' || status.isPlanningComplete !== true) throw Error('provider planning artifacts are incomplete or use an unexpected schema');
    const apply = JSON.parse(await provider(directory, ['instructions', 'apply', '--change', name, '--json'], options));
    if (apply.changeName !== name || apply.state !== 'all_done' || !Number.isSafeInteger(apply.progress?.total) || apply.progress.total < 1 || apply.progress.complete !== apply.progress.total || apply.progress.remaining !== 0) throw Error('provider reports incomplete or missing implementation tasks');
    signal?.throwIfAborted();
  } catch (error) {
    if (signal?.aborted) throw error;
    throw Error(`Archived implementation plan ${archived} cannot be requalified: ${error.message}; repair the archived evidence through its owning provider before retrying`, { cause: error });
  } finally { await rm(directory, { recursive: true, force: true }); }
}

async function scaffoldMetadata(issue, provider, signal) {
  const directory = await mkdtemp(join(tmpdir(), 'lighthouse-implementation-plan-'));
  try {
    await provider(directory, ['new', 'change', changeName(issue), '--schema', 'spec-driven', '--json'], { signal });
    return await readFile(join(directory, proposalRoot(issue), '.openspec.yaml'), 'utf8');
  } finally { await rm(directory, { recursive: true, force: true }); }
}

export async function prepareImplementationPlanMetadata(source, request, provider = openSpec, signal) {
  if (!request.implementation?.proposal) return null;
  const root = proposalRoot(request.issue);
  if (request.implementation.proposal.root !== root) throw Error('Invalid implementation proposal root');
  const archived = archivedPlanRoot(source, request.issue);
  if (archived) { await validateArchivedPlan(source, archived, request.issue, provider, signal); return null; }
  const path = `${root}/.openspec.yaml`, current = source.get(path);
  if (current && current.content.toString('utf8').trim() !== 'skip_specs: true') return null;
  signal?.throwIfAborted();
  let content = await scaffoldMetadata(request.issue, provider, signal);
  if (current) content = `${content.trimEnd()}\nskip_specs: true\n`;
  signal?.throwIfAborted();
  return { path, content: Buffer.from(content), mode: '100644', origin: 'provider-scaffold' };
}

export async function implementationPlanMetadata(candidate, baseline, request, provider = openSpec, signal) {
  if (!request.implementation?.proposal) return null;
  const root = proposalRoot(request.issue);
  if (request.implementation.proposal.root !== root) throw Error('Invalid implementation proposal root');
  const archived = archivedPlanRoot(baseline, request.issue), currentArchive = archivedPlanRoot(candidate, request.issue);
  if (archived || currentArchive) {
    if (archived !== currentArchive) throw Error('Implementation cannot replace or remove the source-bound archived plan');
    const paths = new Set([...baseline.keys(), ...candidate.keys()].filter(path => path.startsWith(`${archived}/`)));
    for (const path of paths) {
      const before = baseline.get(path), after = candidate.get(path);
      if (!before || !after || before.mode !== after.mode || !before.content.equals(after.content)) throw Error(`Implementation cannot rewrite provider-owned archived plan: ${path}`);
    }
    await validateArchivedPlan(candidate, archived, request.issue, provider, signal);
    return null;
  }
  if (!['proposal.md', 'design.md', 'tasks.md'].every(name => candidate.has(`${root}/${name}`))) return null;
  const path = `${root}/.openspec.yaml`, current = candidate.get(path), previous = baseline.get(path);
  const skip = file => file?.content.toString('utf8').trim() === 'skip_specs: true';
  if (current && previous && current.content.equals(previous.content) && current.mode === previous.mode && !skip(previous)) return null;
  const retained = previous && !skip(previous) ? previous : null;
  const appendSkip = retained && `${retained.content.toString('utf8').trimEnd()}\nskip_specs: true\n`;
  if (current && !skip(current) && current.content.toString('utf8') !== appendSkip) throw Error('Implementation cannot rewrite provider-owned OpenSpec metadata');
  const skipsSpecs = skip(current) || current?.content.toString('utf8') === appendSkip || !current && skip(previous);
  let content;
  signal?.throwIfAborted();
  if (retained) content = retained.content.toString('utf8');
  else {
    content = await scaffoldMetadata(request.issue, provider, signal);
  }
  if (skipsSpecs && !/^skip_specs: true\s*$/m.test(content)) content = `${content.trimEnd()}\nskip_specs: true\n`;
  signal?.throwIfAborted();
  return { path, content: Buffer.from(content), mode: retained?.mode ?? '100644', origin: retained?.origin ?? (retained ? 'baseline' : 'provider-scaffold') };
}
