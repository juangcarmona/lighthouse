import { execFileSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';

const imageId = value => /^sha256:[a-f0-9]{64}$/.test(value ?? '');
export function validateEnvironment(value) {
  if (!value || Object.keys(value).some(k => !['schemaVersion', 'profile', 'services'].includes(k)) || value.schemaVersion !== 1 || !['base', 'dotnet'].includes(value.profile) || !Array.isArray(value.services) || value.services.length > 1 || value.services.some(s => s !== 'postgresql')) {
    throw Error('Invalid .lighthouse/environment.json: use schemaVersion 1, profile base or dotnet, and services [] or ["postgresql"]');
  }
  return value;
}
export function selectEnvironment(config, declaration) {
  if (declaration === null || declaration === undefined) return null;
  validateEnvironment(declaration);
  const selected = config.environments?.[declaration.profile];
  if (!imageId(selected?.image)) throw Error(`Operator must provision environments.${declaration.profile}.image as a pinned local sha256 image ID`);
  if (declaration.services.includes('postgresql') && !imageId(selected.postgresImage)) throw Error(`Operator must pin environments.${declaration.profile}.postgresImage (PostgreSQL 17)`);
  return { profile: declaration.profile, image: selected.image, ...(declaration.services.includes('postgresql') ? { postgresImage: selected.postgresImage } : {}) };
}

// This module runs on the trusted host only. Never mount Docker access in a workload.
const docker = args => execFileSync('docker', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 30000 });
export const environmentReceipt = selected => selected ? { profile: selected.profile, image: selected.image, services: selected.postgresImage ? [{ type: 'postgresql', image: selected.postgresImage }] : [] } : null;
export const environmentArgs = runtime => runtime ? [...(runtime.network ? ['--network', runtime.network] : []), ...runtime.env.flatMap(value => ['--env', value])] : [];
export function redactEnvironmentLog(runtime, text) {
  for (const value of runtime.env.filter(v => v.startsWith('SOFA_TEST_DATABASE='))) {
    const connection = value.slice('SOFA_TEST_DATABASE='.length);
    text = text.replaceAll(connection, '[TEST DATABASE]').replaceAll(connection.split('Password=')[1], '[REDACTED]');
  }
  return text;
}

export async function startEnvironment({ selected, name, uid, run = docker, sleep = ms => new Promise(resolve => setTimeout(resolve, ms)), warn = message => console.error(message) }) {
  if (!selected) return { env: [], cleanup() {} };
  if (!/^lighthouse-[a-z0-9-]{1,180}$/.test(name)) throw Error('Invalid environment run name');
  const network = selected.postgresImage ? `${name}-network` : null;
  const database = `${name}-postgres`;
  let networkAttempted = false, databaseAttempted = false;
  const cleanup = () => {
    const failures = [];
    if (databaseAttempted) { try { run(['rm', '-f', '-v', database]); databaseAttempted = false; } catch { failures.push('PostgreSQL container'); } }
    if (networkAttempted) { try { run(['network', 'rm', network]); networkAttempted = false; } catch { failures.push('test network'); } }
    if (failures.length) { warn(`Environment cleanup failed for ${name}: ${failures.join(', ')}; operator cleanup required`); return false; }
    return true;
  };
  const runtime = { network, env: ['PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium', 'CHROMIUM_PATH=/usr/bin/chromium', 'DOTNET_CLI_HOME=/tmp/dotnet', 'NUGET_PACKAGES=/tmp/nuget-packages', 'DOTNET_SKIP_FIRST_TIME_EXPERIENCE=1', 'DOTNET_NOLOGO=1', 'DOTNET_CLI_TELEMETRY_OPTOUT=1'], cleanup };
  const probe = (label, command) => {
    try {
      return run(['run', '--rm', '--network', 'none', '--user', `${uid}:${uid}`, '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges', '--read-only', '--tmpfs', '/tmp:rw,exec,size=128m', '--env', 'HOME=/tmp', '--env', 'DOTNET_CLI_HOME=/tmp/dotnet', '--env', 'DOTNET_SKIP_FIRST_TIME_EXPERIENCE=1', '--entrypoint', command[0], selected.image, ...command.slice(1)]).trim();
    } catch { throw Error(`Environment ${selected.profile} prerequisite failed: ${label}; rebuild and repin the selected image`); }
  };
  try {
    if (!/^v24\./.test(probe('Node.js 24', ['node', '--version']))) throw Error('Environment requires Node.js 24');
    probe('npm', ['npm', '--version']); probe('Git', ['git', '--version']); probe('Chromium', ['chromium', '--version']);
    if (probe('OpenCode 2.1.0', ['opencode', '--version']) !== 'opencode v2.1.0') throw Error('Environment requires OpenCode 2.1.0');
    if (selected.profile === 'dotnet' && probe('.NET SDK 10.0.100', ['dotnet', '--version']) !== '10.0.100') throw Error('Environment requires .NET SDK 10.0.100');
    if (network) {
      networkAttempted = true; run(['network', 'create', network]);
      const password = randomBytes(24).toString('hex');
      databaseAttempted = true;
      run(['run', '-d', '--name', database, '--network', network, '--network-alias', 'postgres', '--user', '999:999', '--read-only', '--memory', '512m', '--cpus', '1', '--pids-limit', '128', '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges', '--tmpfs', '/var/lib/postgresql/data:rw,size=512m,uid=999,gid=999', '--tmpfs', '/var/run/postgresql:rw,size=16m,uid=999,gid=999', '--tmpfs', '/tmp:rw,size=16m', '--env', 'POSTGRES_DB=sofa', '--env', 'POSTGRES_USER=sofa', '--env', `POSTGRES_PASSWORD=${password}`, selected.postgresImage]);
      let ready = false;
      const readinessDeadline = Date.now() + 30000;
      for (let attempt = 0; attempt < 30 && Date.now() < readinessDeadline; attempt++) {
        try { run(['exec', database, 'pg_isready', '-h', '127.0.0.1', '-t', '1', '-U', 'sofa', '-d', 'sofa']); ready = true; break; } catch { await sleep(1000); }
      }
      if (!ready) throw Error('PostgreSQL 17 readiness timed out before agent/check execution');
      const version = run(['exec', database, 'postgres', '--version']);
      if (!/PostgreSQL\) 17\./.test(version)) throw Error('Environment requires PostgreSQL 17');
      runtime.env.push(`SOFA_TEST_DATABASE=Host=postgres;Port=5432;Database=sofa;Username=sofa;Password=${password}`);
    }
    return runtime;
  } catch (error) {
    cleanup();
    // Docker diagnostics can include connection credentials; expose only fixed messages.
    if (/^(Environment |PostgreSQL )/.test(error.message)) throw error;
    throw Error(`Environment ${selected.profile} provisioning failed before execution; inspect host service availability`);
  }
}
