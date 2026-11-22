// Operator kill switch: turns automated admission off across repositories by
// setting the repository variables every Lighthouse workflow checks. It never
// cancels running Actions runs; those must be cancelled separately.
import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export const killSwitchVariables = Object.freeze(['LIGHTHOUSE_AUTOMATION_ENABLED', 'LIGHTHOUSE_MAINTENANCE_ENABLED']);
const repositoryPattern = /^[\w.-]+\/[\w.-]+$/;
const usage = 'Usage: lighthouse-sdlc kill-switch (--repos <owner/repo,...> | --repos-file <file>) [--apply] [--format <json|text>]';

export function parseRepositories(values) {
  const tokens = values.flatMap(value => value.split('\n')).map(line => line.replace(/#.*$/, '')).flatMap(line => line.split(/[\s,]+/));
  const repositories = [...new Set(tokens.filter(Boolean))];
  const invalid = repositories.filter(repository => !repositoryPattern.test(repository));
  if (invalid.length) throw Error(`Invalid repository names: ${invalid.join(', ')}`);
  if (!repositories.length) throw Error(usage);
  return repositories;
}

async function runGh(args) {
  const { stdout } = await execFileAsync('gh', args, { maxBuffer: 1024 * 1024 });
  return stdout;
}

async function readVariables(gh, repository) {
  const listed = JSON.parse(await gh(['variable', 'list', '--repo', repository, '--json', 'name,value']));
  return Object.fromEntries(listed.map(variable => [variable.name, variable.value]));
}

// Plans, and with apply writes, `false` for each switch variable. Each
// repository is handled independently so one failure does not stop the rest.
export async function killSwitch(repositories, { apply = false, gh = runGh } = {}) {
  const results = [];
  for (const repository of repositories) {
    try {
      const before = await readVariables(gh, repository);
      const changes = killSwitchVariables.filter(name => before[name] !== 'false');
      if (apply) for (const name of changes) await gh(['variable', 'set', name, '--repo', repository, '--body', 'false']);
      const after = apply ? await readVariables(gh, repository) : before;
      const verified = !apply || killSwitchVariables.every(name => after[name] === 'false');
      results.push({ repository, status: !apply ? 'planned' : verified ? 'stopped' : 'unverified',
        before: Object.fromEntries(killSwitchVariables.map(name => [name, before[name] ?? null])), changes });
    } catch (error) {
      results.push({ repository, status: 'error', error: error.message.split('\n')[0] });
    }
  }
  return { schemaVersion: 1, mode: apply ? 'apply' : 'dry-run', variables: killSwitchVariables, results,
    note: 'Running Actions runs are not cancelled; cancel them separately if needed.' };
}

function text(report) {
  const lines = [`Kill switch (${report.mode})`];
  for (const result of report.results) {
    if (result.status === 'error') { lines.push(`- ${result.repository}: error: ${result.error}`); continue; }
    const pending = result.changes.length ? result.changes.join(', ') : 'already off';
    lines.push(`- ${result.repository}: ${result.status} (${report.mode === 'apply' ? 'set' : 'would set'} false: ${pending})`);
  }
  lines.push(report.note);
  return lines.join('\n');
}

export async function killSwitchCli(args, { gh } = {}) {
  const option = name => { const index = args.indexOf(name); return index >= 0 ? args[index + 1] : undefined; };
  const format = option('--format') ?? 'text';
  const sources = [option('--repos') ?? ''];
  if (option('--repos-file')) sources.push(await readFile(option('--repos-file'), 'utf8'));
  if (!['json', 'text'].includes(format)) throw Error(usage);
  const report = await killSwitch(parseRepositories(sources), { apply: args.includes('--apply'), gh });
  console.log(format === 'json' ? JSON.stringify(report, null, 2) : text(report));
  return report;
}
