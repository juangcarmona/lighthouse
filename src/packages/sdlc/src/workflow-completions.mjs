import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

export function workflowDisplayName(source, path) {
  const raw = source.match(/^name:\s*(.+)$/m)?.[1]?.trim();
  if (!raw) return path;
  let name;
  if (raw.startsWith('"')) name = JSON.parse(raw);
  else if (raw.startsWith("'")) {
    if (!raw.endsWith("'")) throw Error(`Use a single-line static workflow name in ${path}`);
    name = raw.slice(1, -1).replaceAll("''", "'");
  } else {
    if (/^[>|&*!{[]/.test(raw)) throw Error(`Use a single-line static workflow name in ${path}`);
    name = raw.replace(/\s+#.*$/, '').trim();
  }
  if (typeof name !== 'string' || !name || name.includes('${{')) throw Error(`Use a single-line static workflow name in ${path}`);
  return name;
}

export async function completionSubscriptions(root, { implement, propose, productChange }) {
  const names = ['refine', ...(productChange ? ['triage', ...(propose ? ['propose', 'apply review'] : []), ...(implement ? ['implement'] : []), 'product-change', 'apply-product-change'] : [])];
  const optional = async path => {
    try { return await readFile(path, 'utf8'); } catch (error) { if (error.code !== 'ENOENT') throw error; return null; }
  };
  const config = await optional(join(root, '.lighthouse/github.json'));
  const checks = config ? JSON.parse(config).completion?.postMergeWorkflows ?? [] : [];
  if (!Array.isArray(checks) || checks.length > 8 || checks.some(name => !/^[\w.-]+\.ya?ml$/.test(name))) throw Error('Invalid adopted completion workflow filenames');
  for (const filename of checks) {
    const path = `.github/workflows/${filename}`;
    names.push(workflowDisplayName(await readFile(join(root, path), 'utf8'), path));
  }
  const epicPath = '.github/workflows/lighthouse-sdlc-epic.yml';
  const epic = await optional(join(root, epicPath));
  if (epic) names.push(workflowDisplayName(epic, epicPath));
  return [...new Set(names)].map(name => name.replace(/[\\*?+\[\]!]/g, '\\$&'));
}
