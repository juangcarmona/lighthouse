import { readFile, writeFile, mkdir, access } from 'node:fs/promises';
import { resolve, join, dirname } from 'node:path';
import { execFileSync } from 'node:child_process';

const [target, revision, ...flags] = process.argv.slice(2);
if (!target || !/^[a-f0-9]{40}$/.test(revision ?? '') || flags.some(x => !['--apply', '--replace-reviewed', '--with-propose', '--with-implement', '--with-completion', '--with-maintenance'].includes(x))) throw Error('Usage: install-workflows <repository> <immutable-lighthouse-commit> [--apply] [--replace-reviewed] [--with-propose] [--with-implement] [--with-completion] [--with-maintenance]');
const apply = flags.includes('--apply'), replace = flags.includes('--replace-reviewed');
const completion = flags.includes('--with-completion');
const implement = flags.includes('--with-implement') || completion;
const propose = flags.includes('--with-propose') || implement;
const files = [...(flags.includes('--with-maintenance') ? ['lighthouse-worker-maintenance.yml'] : []), 'lighthouse-sdlc-router.yml', 'lighthouse-sdlc-refine.md', 'shared/lighthouse-opencode.md', ...(propose ? ['lighthouse-sdlc-propose.md', 'lighthouse-sdlc-apply-review.md'] : []), ...(implement ? ['lighthouse-sdlc-implement.md'] : []), ...(completion ? ['lighthouse-sdlc-integrate.md', 'lighthouse-sdlc-review.md'] : [])];
const root = resolve(target), planned = [];
for (const name of files) {
  let content = (await readFile(new URL(`../workflows/${name}`, import.meta.url), 'utf8')).replaceAll('__LIGHTHOUSE_REF__', revision);
  if (name === 'lighthouse-sdlc-router.yml') {
    const enabled = ['refine', ...(propose ? ['propose'] : []), ...(implement ? ['implement'] : []), ...(completion ? ['integrate', 'review'] : [])];
    content = content.replace('LIGHTHOUSE_ENABLED_STAGES: refine,propose,implement,integrate,review', `LIGHTHOUSE_ENABLED_STAGES: ${enabled.join(',')}`).replace('options: [refine, propose, implement, integrate, review]', `options: [${enabled.join(', ')}]`);
    if (!implement) content = content.replace('LIGHTHOUSE_AUTO_IMPLEMENT: true', 'LIGHTHOUSE_AUTO_IMPLEMENT: false');
    if (!completion) content = content.replaceAll('LIGHTHOUSE_COMPLETION_ENABLED: true', 'LIGHTHOUSE_COMPLETION_ENABLED: false');
  }
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
  for (const stage of completion ? ['refine', 'propose', 'implement', 'integrate', 'review', 'apply-review'] : implement ? ['refine', 'propose', 'implement', 'apply-review'] : propose ? ['refine', 'propose', 'apply-review'] : ['refine']) execFileSync('gh', ['aw', 'compile', `lighthouse-sdlc-${stage}`], { cwd: root, stdio: 'inherit' });
}
console.log(`Enabled workers: ${completion ? 'refine, propose, implement, integrate, review, apply-review' : implement ? 'refine, propose, implement, apply-review' : propose ? 'refine, propose, apply-review' : 'refine'}. Enable LIGHTHOUSE_AUTOMATION_ENABLED only after provisioning and reviewing the runner. Unselected workflows are never installed or deleted implicitly.`);
