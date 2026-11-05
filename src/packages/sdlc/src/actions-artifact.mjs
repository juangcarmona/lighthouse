import { execFileSync } from 'node:child_process';
import { readZipJson } from './zip-json.mjs';

function transientDownload(error) {
  if (!Number.isInteger(error?.status) || error.status <= 0 || error.signal || error.killed || error.code) return false;
  const stderr = Buffer.isBuffer(error.stderr) ? error.stderr.toString('utf8') : error.stderr;
  return typeof stderr === 'string' && /^gh: (?:HTTP (?:502|503|504)|[^\r\n]+ \(HTTP (?:502|503|504)\))$/.test(stderr.trim())
    && (stderr.match(/\bHTTP\b/g) ?? []).length === 1;
}

async function readActionsArchive(api, repository, runId, name, optional = false) {
  const artifacts = await api(`actions/runs/${runId}/artifacts?per_page=100`);
  if (artifacts.total_count > 100) throw Error('Artifact collection exceeds its bound');
  if (!Array.isArray(artifacts.artifacts) || artifacts.total_count !== artifacts.artifacts.length) throw Error('Incomplete artifact inventory');
  const matches = artifacts.artifacts.filter(a => a.name === name && !a.expired);
  if (optional && !artifacts.artifacts.some(a => a.name === name)) return null;
  if (matches.length !== 1 || matches[0].size_in_bytes > 2 * 1024 * 1024) throw Error('Required artifact unavailable, ambiguous or too large');
  let bytes;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      bytes = execFileSync('gh', ['api', `repos/${repository}/actions/artifacts/${matches[0].id}/zip`], { maxBuffer: 2 * 1024 * 1024, timeout: 30000 });
      break;
    } catch (error) {
      if (attempt === 3 || !transientDownload(error)) throw error;
    }
  }
  return bytes;
}

export async function readActionsJson(api, repository, runId, name, file, optional = false) {
  const bytes = await readActionsArchive(api, repository, runId, name, optional);
  return bytes === null ? null : readZipJson(bytes, file, optional);
}

export async function createActionsJsonReader(api, repository, runId, name) {
  const bytes = await readActionsArchive(api, repository, runId, name);
  return (file, optional = false) => readZipJson(bytes, file, optional);
}
