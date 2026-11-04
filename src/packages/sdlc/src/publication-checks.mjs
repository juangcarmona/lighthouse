import { mkdtemp, mkdir, readFile, writeFile, rm, stat } from 'node:fs/promises';
import { dirname, join, resolve, relative } from 'node:path';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';

export async function checkMarkdownLinks(root, files, exists = null) {
  const overlay = new Map(files.map(file => [resolve(root, file.path), file.content]));
  const failures = [];
  for (const file of files.filter(file => file.path.endsWith('.md') && file.content !== null)) {
    for (const match of file.content.matchAll(/!?\[[^\]]*\]\(([^)]+)\)/g)) {
      const href = match[1].trim().replace(/^<|>$/g, '');
      if (/^(?:https?:|mailto:|#)/.test(href)) continue;
      const target = resolve(root, dirname(file.path), decodeURIComponent(href.split('#')[0]));
      if (overlay.has(target)) { if (overlay.get(target) === null) failures.push(`${file.path}: missing ${href}`); continue; }
      if (exists) { if (!await exists(target)) failures.push(`${file.path}: missing ${href}`); }
      else { try { await stat(target); } catch { failures.push(`${file.path}: missing ${href}`); } }
    }
  }
  if (failures.length) throw Error(failures.join('\n'));
}

// Validate only proposed Markdown, using the adopted style configuration and pinned CLI.
export async function validatePublicationFiles(root, files, source = null) {
  if (files.some(file => !file.path || /^\.\.(?:\/|$)/.test(relative(root, resolve(root, file.path))) || typeof file.content !== 'string' && file.content !== null)) throw Error('Invalid publication files');
  if (source && (!/^[a-f0-9]{40}$/.test(source.policyRevision ?? '') || !/^[a-f0-9]{40}$/.test(source.candidateRevision ?? ''))) throw Error('Publication validation needs immutable repository revisions');
  const seen = new Map();
  const candidateExists = source ? async target => {
    const name = relative(root, target);
    if (name === '..' || name.startsWith('../')) return false;
    if (!seen.has(name)) {
      if (seen.size >= 200) throw Error('Publication link inventory exceeds 200 targets');
      const value = await source.api(`contents/${name.split('/').map(encodeURIComponent).join('/')}?ref=${source.candidateRevision}`, 'GET', undefined, true);
      seen.set(name, value !== null);
    }
    return seen.get(name);
  } : null;
  await checkMarkdownLinks(root, files, candidateExists);
  const policyFile = async name => {
    if (source) {
      const value = await source.api(`contents/${name}?ref=${source.policyRevision}`, 'GET', undefined, true);
      if (!value) return null;
      if (value.type !== 'file' || value.encoding !== 'base64' || value.size > 96000) throw Error(`Publication policy is not a bounded regular file: ${name}`);
      return Buffer.from(value.content, 'base64').toString('utf8');
    }
    try { return await readFile(join(root, name), 'utf8'); } catch (error) { if (error.code !== 'ENOENT') throw error; return null; }
  };
  const markdown = files.filter(file => file.path.endsWith('.md') && file.content !== null);
  if (!markdown.length) return;
  const temp = await mkdtemp(join(tmpdir(), 'lighthouse-publication-'));
  try {
    for (const name of ['.markdownlint-cli2.jsonc', '.markdownlint.json', '.markdownlint.jsonc', '.markdownlint.yaml', '.markdownlint.yml', '.markdownlint-rules.cjs']) {
      const content = await policyFile(name);
      if (content !== null) await writeFile(join(temp, name), content);
    }
    for (const file of markdown) { const destination = join(temp, file.path); await mkdir(dirname(destination), { recursive: true }); await writeFile(destination, file.content); }
    const manifest = await policyFile('package.json');
    const command = manifest ? JSON.parse(manifest).scripts?.markdownlint : undefined;
    if (!command) return;
    const version = command.match(/^npx (?:-y|--yes) markdownlint-cli2@(\d+\.\d+\.\d+)$/)?.[1];
    if (command && !version) throw Error('Publication Markdown validator must declare a pinned markdownlint-cli2 command');
    execFileSync('npx', ['--yes', '--prefer-offline', `markdownlint-cli2@${version}`, ...markdown.map(file => file.path)], { cwd: temp, timeout: 120000, maxBuffer: 1024 * 1024, encoding: 'utf8', env: { PATH: process.env.PATH, HOME: temp, NPM_CONFIG_CACHE: join(tmpdir(), 'lighthouse-publication-npm'), CI: 'true' }, stdio: ['ignore', 'pipe', 'pipe'] });
  } finally { await rm(temp, { recursive: true, force: true }); }
}
