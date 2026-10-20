import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = fileURLToPath(new URL('../', import.meta.url));
const parent = await mkdtemp(join(tmpdir(), 'lighthouse-adoption-'));
const target = join(parent, 'Workshop');
try {
  for (const [command, args, cwd] of [
    [process.execPath, [resolve(root, 'src/packages/cli/internal/create-dotnet.mjs'), target, '--name', 'Workshop'], root],
    ['dotnet', ['restore', 'Workshop.slnx'], target],
    ['npm', ['run', 'verify'], target]
  ]) {
    const result = spawnSync(command, args, { cwd, stdio: 'inherit' });
    if (result.error) throw result.error;
    if (result.status !== 0) throw new Error(`Standalone adoption failed during ${command} ${args.join(' ')}`);
  }
  process.stdout.write('Independent .NET adoption passed from an empty directory.\n');
} finally { await rm(parent, { recursive: true, force: true }); }
