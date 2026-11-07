import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { proposalRoot, changeName } from './proposal-files.mjs';
import { openSpec } from './openspec-provider.mjs';

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
