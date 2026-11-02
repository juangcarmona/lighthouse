import { execFileSync } from 'node:child_process';
import { readZipJson } from './zip-json.mjs';

export async function readActionsJson(api, repository, runId, name, file, optional = false) {
  const artifacts = await api(`actions/runs/${runId}/artifacts?per_page=100`);
  if (artifacts.total_count > 100) throw Error('Artifact collection exceeds its bound');
  if (!Array.isArray(artifacts.artifacts) || artifacts.total_count !== artifacts.artifacts.length) throw Error('Incomplete artifact inventory');
  const matches = artifacts.artifacts.filter(a => a.name === name && !a.expired);
  if (optional && !artifacts.artifacts.some(a => a.name === name)) return null;
  if (matches.length !== 1 || matches[0].size_in_bytes > 2 * 1024 * 1024) throw Error('Required artifact unavailable, ambiguous or too large');
  const bytes = execFileSync('gh', ['api', `repos/${repository}/actions/artifacts/${matches[0].id}/zip`], { maxBuffer: 2 * 1024 * 1024, timeout: 30000 });
  return readZipJson(bytes, file, optional);
}
