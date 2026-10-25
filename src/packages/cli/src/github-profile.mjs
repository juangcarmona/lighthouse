import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { createHash } from 'node:crypto';

const option = (args, name) => args.includes(name) ? args[args.indexOf(name) + 1] : args.find((arg) => arg.startsWith(`${name}=`))?.slice(name.length + 1);

async function writeJson(path, value) {
  await mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.${process.pid}.tmp`;
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
  await rename(temporary, path);
}

export async function githubProfileCommand(args, { root, catalog }) {
  const adapter = await import('@juangcarmona/lighthouse-sdlc/github-profile');
  const action = args[0];
  const format = option(args, '--format') ?? 'text';
  const configPath = resolve(root, option(args, '--input') ?? '.lighthouse/github.json');
  const planPath = option(args, '--plan-file');
  const repo = option(args, '--repo');
  const output = (value) => {
    if (format === 'json') console.log(JSON.stringify(value, null, 2));
    else {
      console.log(`GitHub profile: ${value.status} (${value.repository.repo})`);
      for (const control of value.controls ?? []) console.log(`  ${control.status} ${control.id}${control.reason ? `: ${control.reason}` : ''}`);
      if (value.authorization) console.log(`Plan hash: ${value.authorization.planHash}\nRemote writes: none`);
      if (value.status === 'drift' && !value.canApply) console.log('Apply requires repository administration permission.');
      for (const item of value.manualRecommendations ?? []) console.log(`  manual: ${item}`);
    }
  };
  if (['plan', 'verify'].includes(action)) {
    if (action === 'plan' && !planPath) throw new Error('GitHub profile planning requires --plan-file <path>.');
    const config = JSON.parse(await readFile(configPath, 'utf8'));
    if (repo && repo.toLowerCase() !== config.repository?.toLowerCase()) throw new Error('--repo does not match the repository declared in the GitHub profile.');
    const plan = adapter.buildGithubProfilePlan(config, await adapter.readGithubProfile(config));
    if (action === 'plan') await writeJson(resolve(root, planPath), plan);
    output({ ...plan, checkedAt: new Date().toISOString(), manualRecommendations: adapter.githubProfileManualRecommendations });
    if ((action === 'verify' && plan.status !== 'passed') || (action === 'plan' && !plan.canApply)) process.exitCode = 1;
    return;
  }
  if (action !== 'apply' || !planPath || !option(args, '--authorize')) throw new Error('Use capabilities plan|verify --id github-profile, or capabilities apply --plan-file <path> --authorize <hash>.');
  const plan = JSON.parse(await readFile(resolve(root, planPath), 'utf8'));
  if (repo && repo.toLowerCase() !== plan.configuration?.repository?.toLowerCase()) throw new Error('--repo does not match the authorized plan.');
  // A content hash binds the approval to one plan; separate files preserve failed attempts.
  const receiptPath = resolve(root, '.lighthouse/reconciliation/github-profile', `${Date.now()}-${process.pid}.json`);
  const result = await adapter.applyGithubProfile(plan, option(args, '--authorize'), { recordReceipt: (receipt) => writeJson(receiptPath, receipt) });
  const upgradePath = resolve(root, '.lighthouse/upgrade.json');
  let state;
  try { state = JSON.parse(await readFile(upgradePath, 'utf8')); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  if (state) {
    const capability = catalog.capabilities.find((item) => item.id === 'github-profile');
    state.adoption ??= {};
    state.adoption['github-profile'] = { id: capability.id, status: 'adopted', selection: capability.selection, provider: capability.provider, version: capability.version, catalogVersion: catalog.package.version, nextAction: null, recordPath: '.lighthouse/reconciliation/github-profile.json' };
    await writeJson(upgradePath, state);
  }
  await writeJson(resolve(root, '.lighthouse/reconciliation/github-profile.json'), result);
  output({ ...result, receiptPath, applied: true, manualRecommendations: adapter.githubProfileManualRecommendations });
}

export async function localGithubProfileStatus(root) {
  const result = { id: 'foundation.github-profile', owner: '@juangcarmona/lighthouse-sdlc', level: 'recommended', kind: 'hard', verification: 'deterministic', status: 'not-applicable', evidence: [], problems: [], nextAction: null };
  let config;
  try { config = JSON.parse(await readFile(resolve(root, '.lighthouse/github.json'), 'utf8')); }
  catch (error) {
    if (error.code === 'ENOENT') return result;
    return { ...result, status: 'failed', problems: ['Cannot parse .lighthouse/github.json.'] };
  }
  try {
    const adapter = await import('@juangcarmona/lighthouse-sdlc/github-profile');
    const errors = adapter.validateGithubProfile(config);
    result.status = errors.length ? 'failed' : 'unconfigured';
    result.problems = errors;
    result.nextAction = 'lighthouse capabilities verify --id github-profile --format json';
    // Local verification must not turn an old receipt into a claim about live GitHub.
    result.evidence = [{ path: '.lighthouse/github.json', scope: 'local-configuration', sha256: createHash('sha256').update(JSON.stringify(config)).digest('hex') }];
  } catch { result.status = 'unavailable'; result.problems = ['Install the SDLC GitHub profile adapter to validate this configuration.']; }
  return result;
}
