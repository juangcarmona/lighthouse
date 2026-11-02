import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';

export async function readActionsJson(api, repository, runId, name, file, optional = false) {
  const artifacts = await api(`actions/runs/${runId}/artifacts?per_page=100`);
  if (artifacts.total_count > 100) throw Error('Artifact collection exceeds its bound');
  if (!Array.isArray(artifacts.artifacts) || artifacts.total_count !== artifacts.artifacts.length) throw Error('Incomplete artifact inventory');
  const matches = artifacts.artifacts.filter(a => a.name === name && !a.expired);
  if (optional && !artifacts.artifacts.some(a => a.name === name)) return null;
  if (matches.length !== 1 || matches[0].size_in_bytes > 2 * 1024 * 1024) throw Error('Required artifact unavailable, ambiguous or too large');
  const dir = await mkdtemp(join(tmpdir(), 'lighthouse-artifact-'));
  try {
    const archive = join(dir, 'artifact.zip');
    await writeFile(archive, execFileSync('gh', ['api', `repos/${repository}/actions/artifacts/${matches[0].id}/zip`], { maxBuffer: 2 * 1024 * 1024, timeout: 30000 }));
    const content = execFileSync('python3', ['-c', 'import sys,zipfile; z=zipfile.ZipFile(sys.argv[1]); matches=[i for i in z.infolist() if i.filename==sys.argv[2]]; if_missing = len(matches)==0 and sys.argv[3]=="optional"; sys.exit(0) if if_missing else None; assert len(matches)==1 and 0<matches[0].file_size<=128000, "Invalid artifact member"; data=z.open(matches[0]).read(128001); assert len(data)<=128000; sys.stdout.buffer.write(data)', archive, file, optional ? 'optional' : 'required'], { encoding: 'utf8', maxBuffer: 128000, timeout: 10000 });
    if (!content) return null;
    const value = JSON.parse(content);
    if (optional && value === null) throw Error('Artifact member contains no result object');
    return value;
  } finally { await rm(dir, { recursive: true, force: true }); }
}
