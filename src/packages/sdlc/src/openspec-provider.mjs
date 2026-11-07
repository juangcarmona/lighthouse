import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execute = promisify(execFile);
export async function openSpec(cwd, args, { signal } = {}) {
  const result = await execute('npx', ['--yes', '--package', '@fission-ai/openspec@1.15.0', 'openspec', ...args], { cwd, signal, encoding: 'utf8', timeout: 120000, maxBuffer: 1024 * 1024, env: { ...process.env, OPENSPEC_TELEMETRY: '0', CI: 'true' } });
  return result.stdout;
}
