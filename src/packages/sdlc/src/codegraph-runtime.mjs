import { chmod, copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { isAbsolute, join } from 'node:path';
import { execFileSync } from 'node:child_process';

export function codegraphSelection(config, implementing) {
  if (!config.codegraph || config.codegraph.enabled === false) return { status: 'disabled' };
  if (implementing) return { status: 'unavailable', reason: 'editable implementation snapshot' };
  if (config.codegraph.enabled !== true || !isAbsolute(config.codegraph.binary ?? '')) return { status: 'unavailable', reason: 'operator binary is not configured' };
  return { status: 'pending' };
}

export function configureCodegraphWorker(workerConfig) {
  if (!Array.isArray(workerConfig.policies) || !Array.isArray(workerConfig.permissions)) throw Error('OpenCode image has no policy or permissions');
  workerConfig.mcp = { servers: { codegraph: { type: 'local', command: ['node', '/codegraph/codegraph-client.mjs'], codemode: false } } };
  workerConfig.policies.push({ action: 'integration.use', resource: 'mcp:codegraph', effect: 'allow' });
  for (const tool of ['codegraph_symbol_search', 'codegraph_get_ai_context']) {
    workerConfig.policies.push({ action: 'tool.use', resource: `codegraph_${tool}:*`, effect: 'allow' });
    workerConfig.permissions.push({ action: `codegraph_${tool}`, resource: '*', effect: 'allow' });
  }
  return workerConfig;
}

export async function startCodegraph({ config, source, harness, dir, name, docker }) {
  const state = join(dir, 'codegraph');
  await mkdir(state); await chmod(state, 0o777);
  const script = join(dir, 'codegraph-sidecar.mjs');
  await copyFile(join(harness, 'src/codegraph-sidecar.mjs'), script); await chmod(script, 0o444);
  const policy = join(dir, 'codegraph-mcp.mjs');
  await copyFile(join(harness, 'src/codegraph-mcp.mjs'), policy); await chmod(policy, 0o444);
  const client = join(state, 'codegraph-client.mjs');
  await copyFile(join(harness, 'src/codegraph-client.mjs'), client); await chmod(client, 0o444);
  const sidecar = `${name}-codegraph`;
  const args = ['run', '-d', '--rm', '--init', '--name', sidecar, '--network', 'none', '--user', `${config.uid}:${config.uid}`,
    '--cpus', '2', '--memory', '1g', '--pids-limit', '128', '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges', '--read-only',
    '--tmpfs', `/tmp:rw,exec,size=256m,uid=${config.uid},gid=${config.uid}`,
    '--mount', `type=bind,src=${source},dst=/workspace,readonly`,
    '--mount', `type=bind,src=${config.codegraph.binary},dst=/codegraph-server,readonly`,
    '--mount', `type=bind,src=${script},dst=/sidecar.mjs,readonly`,
    '--mount', `type=bind,src=${policy},dst=/codegraph-mcp.mjs,readonly`,
    '--mount', `type=bind,src=${state},dst=/codegraph`, '--entrypoint', 'node', config.image, '/sidecar.mjs'];
  try {
    const workerConfig = JSON.parse(execFileSync('docker', ['run', '--rm', '--network', 'none', '--entrypoint', 'cat', config.image, '/etc/opencode/opencode.json'], { encoding: 'utf8', timeout: 30000 }));
    configureCodegraphWorker(workerConfig);
    const workerConfigPath = join(state, 'worker-opencode.json');
    await writeFile(workerConfigPath, JSON.stringify(workerConfig)); await chmod(workerConfigPath, 0o444);
    docker(args);
    for (let attempt = 0; attempt < 100; attempt++) {
      try {
        const receipt = JSON.parse(await readFile(join(state, 'ready.json'), 'utf8'));
        if (receipt.status === 'available') {
          const probe = execFileSync('docker', ['run', '--rm', '--network', 'none', '--read-only', '--user', `${config.uid}:${config.uid}`,
            '--tmpfs', '/tmp:rw,size=64m', '--tmpfs', `/home/engine/.config:rw,size=16m,uid=${config.uid},gid=${config.uid}`,
            '--tmpfs', `/home/engine/.cache:rw,size=64m,uid=${config.uid},gid=${config.uid}`,
            '--tmpfs', `/home/engine/.local/share/opencode:rw,size=64m,uid=${config.uid},gid=${config.uid}`,
            '--tmpfs', `/home/engine/.local/state:rw,size=64m,uid=${config.uid},gid=${config.uid}`,
            '--mount', `type=bind,src=${source},dst=/workspace,readonly`, '--mount', `type=bind,src=${state},dst=/codegraph,readonly`,
            '--mount', `type=bind,src=${workerConfigPath},dst=/etc/opencode/opencode.json,readonly`,
            '--mount', `type=bind,src=${harness},dst=/harness,readonly`, '--workdir', '/workspace', '--entrypoint', 'sh', config.image,
            '-c', 'opencode mcp list; sleep 3; opencode mcp list'],
          { encoding: 'utf8', timeout: 30000 });
          if (!/codegraph\s+connected/.test(probe)) return { status: 'unavailable', reason: 'OpenCode did not connect to CodeGraph', sidecar };
          return { status: 'available', state, sidecar, tools: receipt.tools, workerConfigPath };
        }
      } catch (error) { if (error.code !== 'ENOENT') throw error; }
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    return { status: 'unavailable', reason: 'CodeGraph index did not become ready', sidecar };
  } catch {
    return { status: 'unavailable', reason: 'CodeGraph sidecar could not start', sidecar };
  }
}

export function stopCodegraph(sidecar) {
  if (!sidecar) return;
  try { execFileSync('docker', ['rm', '-f', sidecar], { stdio: 'ignore', timeout: 30000 }); } catch {}
}
