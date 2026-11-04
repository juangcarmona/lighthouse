import { mkdtemp, mkdir, readFile, writeFile, cp, rm, stat } from 'node:fs/promises';
import { dirname, join, resolve, relative } from 'node:path';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';

export async function checkMarkdownLinks(root, files) {
  const overlay = new Map(files.map(file => [resolve(root, file.path), file.content]));
  const failures = [];
  for (const file of files.filter(file => file.path.endsWith('.md') && file.content !== null)) {
    for (const match of file.content.matchAll(/!?\[[^\]]*\]\(([^)]+)\)/g)) {
      const href = match[1].trim().replace(/^<|>$/g, '');
      if (/^(?:https?:|mailto:|#)/.test(href)) continue;
      const target = resolve(root, dirname(file.path), decodeURIComponent(href.split('#')[0]));
      if (overlay.has(target)) { if (overlay.get(target) === null) failures.push(`${file.path}: missing ${href}`); continue; }
      try { await stat(target); } catch { failures.push(`${file.path}: missing ${href}`); }
    }
  }
  if (failures.length) throw Error(failures.join('\n'));
}

// Validate only proposed Markdown, using the adopted style configuration and pinned CLI.
export async function validatePublicationFiles(root, files) {
  if (files.some(file => !file.path || relative(root, resolve(root, file.path)).startsWith('..') || typeof file.content !== 'string' && file.content !== null)) throw Error('Invalid publication files');
  await checkMarkdownLinks(root, files);
  const markdown = files.filter(file => file.path.endsWith('.md') && file.content !== null);
  if (!markdown.length) return;
  const temp = await mkdtemp(join(tmpdir(), 'lighthouse-publication-'));
  try {
    for (const name of ['.markdownlint-cli2.jsonc', '.markdownlint.json', '.markdownlint.jsonc', '.markdownlint.yaml', '.markdownlint.yml', '.markdownlint-rules.cjs']) {
      try { await cp(join(root, name), join(temp, name)); } catch (error) { if (error.code !== 'ENOENT') throw error; }
    }
    for (const file of markdown) { const destination = join(temp, file.path); await mkdir(dirname(destination), { recursive: true }); await writeFile(destination, file.content); }
    let command;
    try { command = JSON.parse(await readFile(join(root, 'package.json'), 'utf8')).scripts?.markdownlint; } catch (error) { if (error.code !== 'ENOENT') throw error; }
    const version = command?.match(/^npx (?:-y|--yes) markdownlint-cli2@(\d+\.\d+\.\d+)$/)?.[1];
    if (command && !version) throw Error('Publication Markdown validator must declare a pinned markdownlint-cli2 command');
    execFileSync('npx', ['--yes', `markdownlint-cli2@${version ?? '0.23.3'}`, ...markdown.map(file => file.path)], { cwd: temp, timeout: 120000, maxBuffer: 1024 * 1024, encoding: 'utf8', env: { PATH: process.env.PATH, HOME: temp, NPM_CONFIG_CACHE: join(tmpdir(), 'lighthouse-publication-npm'), CI: 'true' }, stdio: ['ignore', 'pipe', 'pipe'] });
  } finally { await rm(temp, { recursive: true, force: true }); }
}
