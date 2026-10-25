import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, join } from 'node:path';
const [target, revision, apply] = process.argv.slice(2);
if (!target || !/^[a-f0-9]{40}$/.test(revision ?? '') || ![undefined, '--apply'].includes(apply)) throw Error('Usage: install-issue-workflows <repository> <immutable-lighthouse-commit> [--apply]');
for (const name of ['lighthouse-issue-router.yml', 'lighthouse-issue-refine.yml']) {
  const content = (await readFile(new URL(`../workflows/${name}`, import.meta.url), 'utf8')).replaceAll('__LIGHTHOUSE_REF__', revision);
  const path = join(resolve(target), '.github/workflows', name);
  if (apply) { await mkdir(join(resolve(target), '.github/workflows'), { recursive: true }); await writeFile(path, content); }
  console.log(`${apply ? 'Wrote' : 'Would write'} ${path}`);
}
