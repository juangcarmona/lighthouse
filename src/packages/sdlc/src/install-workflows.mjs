import { readFile, writeFile, mkdir, access } from 'node:fs/promises';
import { resolve, join, dirname } from 'node:path';
import { execFileSync } from 'node:child_process';

const [target, revision, ...flags] = process.argv.slice(2);
if (!target || !/^[a-f0-9]{40}$/.test(revision ?? '') || flags.some(x => !['--apply', '--replace-reviewed'].includes(x))) throw Error('Usage: install-workflows <repository> <immutable-lighthouse-commit> [--apply] [--replace-reviewed]');
const apply = flags.includes('--apply'), replace = flags.includes('--replace-reviewed');
const files = ['lighthouse-sdlc-router.yml', 'lighthouse-sdlc-refine.md', 'shared/lighthouse-opencode.md'];
const root = resolve(target), planned = [];
for (const name of files) {
  const content = (await readFile(new URL(`../workflows/${name}`, import.meta.url), 'utf8')).replaceAll('__LIGHTHOUSE_REF__', revision);
  const path = join(root, '.github/workflows', name);
  const exists = await access(path).then(() => true, () => false);
  if (exists && await readFile(path, 'utf8') !== content && !replace) throw Error(`Existing workflow differs: ${path}; review the diff before --replace-reviewed`);
  planned.push({ path, content });
  console.log(`${apply ? 'Write' : 'Would write'} ${path}`);
}
if (apply) {
  const compiler = execFileSync('gh', ['aw', '--version'], { encoding: 'utf8' }).trim();
  if (!/\bv?0\.93\.2\b/.test(compiler)) throw Error(`gh-aw v0.93.2 is required; found ${compiler}`);
  for (const { path, content } of planned) { await mkdir(dirname(path), { recursive: true }); await writeFile(path, content); }
  execFileSync('gh', ['aw', 'compile', 'lighthouse-sdlc-refine'], { cwd: root, stdio: 'inherit' });
}
console.log('Enabled worker: refine. Enable LIGHTHOUSE_AUTOMATION_ENABLED only after provisioning and reviewing the runner. Unselected workflows are never installed or deleted implicitly.');
