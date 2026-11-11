import { lstat, readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { archivedPlanRoot, validateArchivedPlan } from './implementation-plan.mjs';
import { proposalRoot, changeName } from './proposal-files.mjs';
import { openSpec } from './openspec-provider.mjs';

// Read only applicable planning evidence, not the application or unrelated archives.
// The caller's independent runtime supplies the immutable candidate and harness.
async function planSource(directory, issue) {
  const source = new Map();
  let bytes = 0, members = 0;
  async function visit(path) {
    if (++members > 5000) throw Error('Implementation plan evidence exceeds 5000 members');
    let stat;
    try { stat = await lstat(join(directory, path)); }
    catch (error) { if (error.code === 'ENOENT') return; throw error; }
    if (stat.isSymbolicLink() || !stat.isDirectory() && !stat.isFile()) throw Error(`Invalid OpenSpec evidence member: ${path}; restore regular provider-owned files`);
    if (stat.isDirectory()) {
      for (const name of await readdir(join(directory, path))) await visit(`${path}/${name}`);
    } else {
      bytes += stat.size;
      if (bytes > 64 * 1024 * 1024) throw Error('Implementation plan evidence exceeds 64 MiB');
      source.set(path, { mode: stat.mode & 0o111 ? '100755' : '100644', content: await readFile(join(directory, path)) });
    }
  }
  const active = proposalRoot(issue), prefix = 'openspec/changes/archive/';
  await visit(active);
  // Preserve empty directory identity as well, so conflicts cannot be hidden.
  try {
    const stat = await lstat(join(directory, active));
    if (stat.isDirectory()) source.set(`${active}/`, { content: Buffer.alloc(0), mode: '100644' });
  } catch (error) { if (error.code !== 'ENOENT') throw error; }
  let entries;
  try {
    const stat = await lstat(join(directory, prefix));
    if (!stat.isDirectory() || stat.isSymbolicLink()) throw Error('Invalid OpenSpec archive directory; restore provider-owned evidence');
    entries = await readdir(join(directory, prefix));
  } catch (error) { if (error.code !== 'ENOENT') throw error; entries = []; }
  if (entries.length > 5000) throw Error('Implementation plan archive inventory exceeds 5000 members');
  const identities = new Map([...source, ...entries.map(name => [`${prefix}${name}/`, null])]);
  const archived = archivedPlanRoot(identities, issue);
  if (archived) {
    await visit(archived);
    for (const path of ['openspec/config.yaml', 'openspec/specs', 'openspec/schemas']) await visit(path);
  }
  return { source, archived };
}

export async function checkImplementationPlan(directory, issue, provider = openSpec, signal) {
  if (!Number.isSafeInteger(issue) || issue < 1) throw Error('Implementation plan check requires a positive issue number');
  const { source, archived } = await planSource(directory, issue);
  if (archived) await validateArchivedPlan(source, archived, issue, provider, signal);
  else {
    if (![...source.keys()].some(path => path.startsWith(`${proposalRoot(issue)}/`) && !path.endsWith('/'))) throw Error(`No implementation plan for issue #${issue}; materialize the provider-owned active plan before independent verification`);
    await provider(directory, ['validate', changeName(issue), '--strict', '--no-interactive'], { signal });
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const [issue, ...flags] = process.argv.slice(2);
    if (!/^[1-9]\d*$/.test(issue ?? '') || flags.join(' ') !== '--strict --no-interactive') throw Error('Usage: implementation-plan-check.mjs <issue> --strict --no-interactive');
    await checkImplementationPlan(process.cwd(), Number(issue));
    console.log(`Strict implementation plan validation passed for issue #${issue}`);
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
