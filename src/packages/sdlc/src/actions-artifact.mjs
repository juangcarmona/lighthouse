import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';

export async function readActionsJson(api, repository, runId, name, file) {
  const artifacts = await api(`actions/runs/${runId}/artifacts?per_page=100`);
  if (artifacts.total_count > 100) throw Error('Artifact collection exceeds its bound');
  const matches = artifacts.artifacts.filter(a => a.name === name && !a.expired);
  if (matches.length !== 1 || matches[0].size_in_bytes > 2 * 1024 * 1024) throw Error('Required artifact unavailable, ambiguous or too large');
  const dir = await mkdtemp(join(tmpdir(), 'lighthouse-artifact-'));
  try {
    const archive = join(dir, 'artifact.zip');
    await writeFile(archive, execFileSync('gh', ['api', `repos/${repository}/actions/artifacts/${matches[0].id}/zip`], { maxBuffer: 2 * 1024 * 1024, timeout: 30000 }));
    return JSON.parse(execFileSync('python3', ['-c', 'import sys,zipfile; z=zipfile.ZipFile(sys.argv[1]); matches=[i for i in z.infolist() if i.filename==sys.argv[2]]; assert len(matches)==1 and matches[0].file_size<=128000, "Invalid artifact member"; data=z.open(matches[0]).read(128001); assert len(data)<=128000; sys.stdout.buffer.write(data)', archive, file], { encoding: 'utf8', maxBuffer: 128000, timeout: 10000 }));
  } finally { await rm(dir, { recursive: true, force: true }); }
}
