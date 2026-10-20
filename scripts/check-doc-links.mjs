import { readdir, readFile, stat } from 'node:fs/promises';
import { dirname, resolve, relative } from 'node:path';

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
const failures = [];
for (const file of files) {
  const source = await readFile(file, 'utf8');
  for (const match of source.matchAll(/!?\[[^\]]*\]\(([^)]+)\)/g)) {
    const href = match[1].trim().replace(/^<|>$/g, '');
    if (/^(?:https?:|mailto:|#)/.test(href)) continue;
    const target = decodeURIComponent(href.split('#')[0]);
    try { await stat(resolve(dirname(file), target)); }
    catch { failures.push(`${relative(root, file)}: missing ${href}`); }
  }
}
if (failures.length) { process.stderr.write(failures.join('\n') + '\n'); process.exit(1); }
process.stdout.write(`Local Markdown links checked in ${files.length} documents.\n`);
