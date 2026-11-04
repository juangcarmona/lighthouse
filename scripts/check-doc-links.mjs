import { checkMarkdownLinks } from '../src/packages/sdlc/src/publication-checks.mjs';
import { readdir, readFile } from 'node:fs/promises';
import { resolve, relative } from 'node:path';

const root = process.cwd();
const excluded = new Set(['.git', 'node_modules', 'bin', 'obj', 'dist', 'playwright-report', 'test-results']);
const files = [];
async function collect(folder) {
  for (const entry of await readdir(folder, { withFileTypes: true })) {
    if (excluded.has(entry.name)) continue;
    const path = resolve(folder, entry.name);
    if (entry.isDirectory()) await collect(path);
    else if (entry.isFile() && entry.name.endsWith('.md')) files.push(path);
  }
}
await collect(root);
await checkMarkdownLinks(root, await Promise.all(files.map(async file => ({ path: relative(root, file), content: await readFile(file, 'utf8') }))));
process.stdout.write(`Local Markdown links checked in ${files.length} documents.\n`);
