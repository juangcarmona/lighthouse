import { readFile, writeFile, copyFile, mkdir, mkdtemp, rm } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

export function validateBuildInputs(inputs) {
  for (const key of ['nodeImage', 'sdkImage', 'postgresImage']) {
    if (!/^[a-z0-9][a-z0-9./:_-]*@sha256:[a-f0-9]{64}$/.test(inputs?.[key] ?? '')) throw Error(`${key} must be a digest-qualified image reference`);
  }
  if (!/^[a-f0-9]{64}$/.test(inputs.opencodeSha256 ?? '')) throw Error('opencodeSha256 must pin the supplied OpenCode binary');
  return inputs;
}

async function main() {
  const [binary, lockFile, receiptFile] = process.argv.slice(2);
  if (!binary || !lockFile || !receiptFile) throw Error('Usage: node build-environments.mjs /path/to/opencode build-inputs.json image-receipt.json');
  const inputs = validateBuildInputs(JSON.parse(await readFile(lockFile, 'utf8')));
  if (createHash('sha256').update(await readFile(binary)).digest('hex') !== inputs.opencodeSha256) throw Error('OpenCode binary checksum mismatch');
  if (execFileSync(binary, ['--version'], { encoding: 'utf8' }).trim() !== 'opencode v2.1.0') throw Error('OpenCode 2.1.0 is required');
  const context = await mkdtemp(join(tmpdir(), 'lighthouse-image-'));
  const here = dirname(fileURLToPath(import.meta.url));
  const docker = args => execFileSync('docker', args, { stdio: 'inherit' });
  const inspect = image => execFileSync('docker', ['image', 'inspect', image, '--format', '{{.Id}}'], { encoding: 'utf8' }).trim();
  try {
    for (const file of ['Dockerfile.environments', 'entrypoint.sh', 'opencode-implement.json']) await copyFile(join(here, file), join(context, file));
    await copyFile(binary, join(context, 'opencode'));
    const build = ['build', '--platform', 'linux/amd64', '-f', join(context, 'Dockerfile.environments'), '--build-arg', `NODE_IMAGE=${inputs.nodeImage}`, '--build-arg', `SDK_IMAGE=${inputs.sdkImage}`, '--build-arg', `OPENCODE_SHA256=${inputs.opencodeSha256}`];
    docker([...build, '--target', 'base', '-t', 'lighthouse-environment:base', context]);
    const base = inspect('lighthouse-environment:base');
    docker([...build, '--target', 'dotnet', '-t', 'lighthouse-environment:dotnet', context]);
    docker(['pull', '--platform', 'linux/amd64', inputs.postgresImage]);
    const postgresImage = inspect(inputs.postgresImage);
    const receipt = { schemaVersion: 1, platform: 'linux/amd64', inputs, environments: { base: { image: base, postgresImage }, dotnet: { image: inspect('lighthouse-environment:dotnet'), postgresImage } } };
    await mkdir(dirname(resolve(receiptFile)), { recursive: true });
    await writeFile(receiptFile, JSON.stringify(receipt, null, 2) + '\n');
  } finally { await rm(context, { recursive: true, force: true }); }
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch(error => { console.error(error.message); process.exitCode = 1; });
