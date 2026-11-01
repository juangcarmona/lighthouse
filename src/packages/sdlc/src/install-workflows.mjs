import { readFile, writeFile, mkdir, access } from 'node:fs/promises';
import { resolve, join, dirname } from 'node:path';
import { execFileSync } from 'node:child_process';

const [target, revision, ...flags] = process.argv.slice(2);
if (!target || !/^[a-f0-9]{40}$/.test(revision ?? '') || flags.some(x => !['--apply', '--replace-reviewed', '--with-propose', '--with-implement', '--with-completion', '--with-maintenance', '--with-product-change', '--with-unattended'].includes(x))) throw Error('Usage: install-workflows <repository> <immutable-lighthouse-commit> [--apply] [--replace-reviewed] [--with-propose] [--with-implement] [--with-completion] [--with-maintenance] [--with-product-change] [--with-unattended]');
const apply = flags.includes('--apply'), replace = flags.includes('--replace-reviewed');
const productChange = flags.includes('--with-product-change');
const unattended = flags.includes('--with-unattended');
const completion = flags.includes('--with-completion') || unattended;
const implement = flags.includes('--with-implement') || completion;
const propose = flags.includes('--with-propose') || implement;
const files = [...(flags.includes('--with-maintenance') ? ['lighthouse-worker-maintenance.yml'] : []), 'lighthouse-sdlc-router.yml', 'lighthouse-sdlc-triage.md', 'lighthouse-sdlc-refine.md', 'shared/lighthouse-opencode.md', ...(propose ? ['lighthouse-sdlc-propose.md', 'lighthouse-sdlc-apply-review.md'] : []), ...(implement ? ['lighthouse-sdlc-implement.md'] : []), ...(completion ? ['lighthouse-sdlc-integrate.md', 'lighthouse-sdlc-review.md'] : []), ...(productChange ? ['lighthouse-sdlc-product-change.md', 'lighthouse-sdlc-apply-product-change.md'] : [])];
const root = resolve(target), planned = [];
if (unattended) files.push('lighthouse-sdlc-unattended.yml');
for (const name of files) {
  let content = (await readFile(new URL(`../workflows/${name}`, import.meta.url), 'utf8')).replaceAll('__LIGHTHOUSE_REF__', revision);
  if (name === 'lighthouse-sdlc-router.yml') {
    const enabled = ['triage', 'refine', ...(propose ? ['propose'] : []), ...(implement ? ['implement'] : []), ...(completion ? ['integrate', 'review'] : [])];
    content = content.replace('LIGHTHOUSE_ENABLED_STAGES: triage,refine,propose,implement,integrate,review', `LIGHTHOUSE_ENABLED_STAGES: ${enabled.join(',')}`).replace('options: [triage, refine, propose, implement, integrate, review]', `options: [${enabled.join(', ')}]`);
    content = content.replace('options: [stage, product-change, resume-product, resume-aligned]', `options: [stage${productChange ? ', product-change, resume-product, resume-aligned' : ''}]`).replace('LIGHTHOUSE_PRODUCT_CHANGE_ENABLED: false', `LIGHTHOUSE_PRODUCT_CHANGE_ENABLED: ${productChange}`);
    if (!implement) content = content.replace('LIGHTHOUSE_AUTO_IMPLEMENT: true', 'LIGHTHOUSE_AUTO_IMPLEMENT: false');
    if (!completion) content = content.replaceAll('LIGHTHOUSE_COMPLETION_ENABLED: true', 'LIGHTHOUSE_COMPLETION_ENABLED: false');
  }
  const path = join(root, '.github/workflows', name);
  const exists = await access(path).then(() => true, () => false);
  if (exists && await readFile(path, 'utf8') !== content && !replace) throw Error(`Existing workflow differs: ${path}; review the diff before --replace-reviewed`);
  planned.push({ path, content });
  console.log(`${apply ? 'Write' : 'Would write'} ${path}`);
}
const formPath = join(root, '.github/ISSUE_TEMPLATE/change-request.yml');
if (unattended) {
  const policyPath = join(root, '.lighthouse/unattended.json');
  if (await access(policyPath).then(() => true, () => false)) console.log('Preserve existing unattended policy: ' + policyPath);
  else {
    planned.push({ path: policyPath, content: await readFile(new URL('../templates/unattended.json', import.meta.url), 'utf8') });
    console.log((apply ? 'Write disabled policy ' : 'Would write disabled policy ') + policyPath);
  }
}
if (await access(formPath).then(() => true, () => false)) console.log(`Preserve existing request form: ${formPath}`);
else {
  planned.push({ path: formPath, content: await readFile(new URL('../templates/change-request.yml', import.meta.url), 'utf8') });
  console.log(`${apply ? 'Write' : 'Would write'} ${formPath}`);
}
if (apply) {
  const compiler = execFileSync('gh', ['aw', '--version'], { encoding: 'utf8' }).trim();
  if (!/\bv?0\.93\.2\b/.test(compiler)) throw Error(`gh-aw v0.93.2 is required; found ${compiler}`);
  for (const { path, content } of planned) { await mkdir(dirname(path), { recursive: true }); await writeFile(path, content); }
  for (const stage of ['triage', ...(completion ? ['refine', 'propose', 'implement', 'integrate', 'review', 'apply-review'] : implement ? ['refine', 'propose', 'implement', 'apply-review'] : propose ? ['refine', 'propose', 'apply-review'] : ['refine']), ...(productChange ? ['product-change', 'apply-product-change'] : [])]) execFileSync('gh', ['aw', 'compile', `lighthouse-sdlc-${stage}`], { cwd: root, stdio: 'inherit' });
}
console.log(`Enabled workers: triage, ${completion ? 'refine, propose, implement, integrate, review, apply-review' : implement ? 'refine, propose, implement, apply-review' : propose ? 'refine, propose, apply-review' : 'refine'}${productChange ? ', product-change' : ''}. Enable LIGHTHOUSE_AUTOMATION_ENABLED only after provisioning and reviewing the runner. Unselected workflows are never installed or deleted implicitly.`);
