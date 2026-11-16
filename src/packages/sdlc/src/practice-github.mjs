import { execFile } from 'node:child_process';
import { githubRequest } from './github-profile.mjs';
import { practiceCatalog } from './practice-catalog.mjs';
import { observationPayload, practiceDigest, validatePracticeContext } from './practice-observation.mjs';

export function githubPracticeLog(path) {
  return new Promise((resolve, reject) => execFile('gh', ['api', '--hostname', 'github.com', path], { timeout: 30000, maxBuffer: 16 * 1024 * 1024 }, (error, stdout) => error ? reject(Error('Native test logs unavailable; check Actions read permission and retention')) : resolve(stdout)));
}

export function measurementsFromTap(log) {
  if (typeof log !== 'string' || log.length > 16 * 1024 * 1024) throw Error('Bounded TAP execution output required');
  const read = name => {
    const values = [...log.matchAll(new RegExp('(?:^|\\n)(?:\\d{4}-[^ ]+ )?(?:#|ℹ) ' + name + ' (\\d+)\\s*(?=\\n|$)', 'g'))];
    if (values.length !== 1) throw Error('TAP must contain one unambiguous ' + name + ' summary');
    const value = Number(values[0][1]); if (!Number.isSafeInteger(value)) throw Error('Invalid TAP count'); return value;
  };
  const total = read('tests'), passed = read('pass'), failed = read('fail'), skipped = read('skipped'), todo = read('todo'), cancelled = read('cancelled');
  if (total < 1 || passed + failed + skipped + todo + cancelled !== total) throw Error('TAP summary does not reconcile');
  return { declared: total, executed: passed + failed, passed, failed, skipped, todo, cancelled };
}

async function mergeEnforcement(repository, branch, check, appId, request) {
  const base = `repos/${repository}`, sources = [];
  let known = false, required = false;
  try {
    const protection = await request(`${base}/branches/${encodeURIComponent(branch)}/protection`);
    known = true; sources.push(`https://api.github.com/${base}/branches/${encodeURIComponent(branch)}/protection`);
    required = protection.enforce_admins?.enabled === true && protection.required_status_checks?.checks?.some(c => c.context === check && c.app_id === appId) === true;
  } catch { /* Effective rules may provide the mandatory check instead. */ }
  try {
    const rules = await request(`${base}/rules/branches/${encodeURIComponent(branch)}?per_page=100`);
    if (!Array.isArray(rules) || rules.length >= 100) throw Error('Incomplete effective rule inventory');
    known = true;
    for (const rule of rules.filter(r => r.type === 'required_status_checks' && r.parameters?.required_status_checks?.some(c => c.context === check && c.integration_id === appId))) {
      const endpoint = rule.ruleset_source_type === 'Repository' ? `repos/${rule.ruleset_source}/rulesets/${rule.ruleset_id}` : rule.ruleset_source_type === 'Organization' ? `orgs/${rule.ruleset_source}/rulesets/${rule.ruleset_id}` : null;
      if (!endpoint) continue;
      const policy = await request(endpoint); sources.push(`https://api.github.com/${endpoint}`);
      if (policy.enforcement === 'active' && Array.isArray(policy.bypass_actors) && policy.bypass_actors.length === 0) required = true;
    }
  } catch { /* Missing authority remains unavailable unless another verified rule enforces this check. */ }
  return { status: known ? 'verified' : 'unavailable', merge: required, sources };
}

export function commandBlocksTestFailure(command, scripts = {}, visiting = new Set()) {
  if (/^node --test(?: [\w./* -]+)?$/.test(command)) return true;
  const match = /^npm (?:test|(run) ([\w:-]+))$/.exec(command);
  if (!match) return false;
  const name = match[1] ? match[2] : 'test';
  if (visiting.has(name) || typeof scripts[name] !== 'string' || /[|;`$\n\r]/.test(scripts[name])) return false;
  const next = new Set(visiting); next.add(name);
  return scripts[name].split('&&').some(part => commandBlocksTestFailure(part.trim(), scripts, next));
}

export async function collectGithubTests({ context, runId, attempt, jobId, workflow, stepName, command }, { request = githubRequest, readLog = githubPracticeLog } = {}) {
  const errors = validatePracticeContext(context);
  if (errors.length) throw Error(errors.join('; '));
  if (![runId, attempt, jobId].every(n => Number.isSafeInteger(n) && n > 0) || !/^\.github\/workflows\/[\w.-]+\.ya?ml$/.test(workflow) || typeof stepName !== 'string' || !stepName.length || typeof command !== 'string' || !/^(?:node --test [\w./* -]+|npm (?:test|run [\w:-]+))$/.test(command)) throw Error('Exact run/attempt/job, workflow, test step and supported test command are required');
  const base = `repos/${context.repository.fullName}`;
  const [repo, run, job, contents] = await Promise.all([
    request(base), request(`${base}/actions/runs/${runId}/attempts/${attempt}`), request(`${base}/actions/jobs/${jobId}`), request(`${base}/contents/${workflow}?ref=${context.commit}`),
  ]);
  if (repo.id !== context.repository.id || repo.full_name !== context.repository.fullName || run.repository?.id !== repo.id || run.head_repository?.id !== repo.id || run.head_sha !== context.commit || run.head_branch !== context.ref.replace(/^refs\/heads\//, '') || run.path !== workflow || run.run_attempt !== attempt || run.status !== 'completed' || job.run_id !== runId || job.run_attempt !== attempt || job.head_sha !== context.commit || job.status !== 'completed' || !job.check_run_url?.startsWith(`https://api.github.com/${base}/check-runs/`)) throw Error('Native run/job/repository/revision/attempt binding failed');
  const check = await request(job.check_run_url.slice('https://api.github.com/'.length));
  if (check.head_sha !== context.commit || check.app?.slug !== 'github-actions' || !Number.isSafeInteger(check.app.id)) throw Error('Native check is not GitHub Actions at the assessed commit');
  if (contents.encoding !== 'base64' || typeof contents.content !== 'string' || contents.size > 1048576) throw Error('Pinned workflow source unavailable');
  const workflowSource = Buffer.from(contents.content, 'base64').toString('utf8');
  const commandLines = workflowSource.split('\n').filter(line => line.trim() === 'run: ' + command || line.trim() === '- run: ' + command);
  const lines = workflowSource.split('\n'), commandIndex = lines.indexOf(commandLines[0]);
  const namedStep = commandIndex > 0 && lines[commandIndex - 1].trim() === '- name: ' + stepName;
  const unnamedStep = commandLines[0]?.trim() === '- run: ' + command && stepName === 'Run ' + command;
  if (commandLines.length !== 1 || !(namedStep || unnamedStep)) throw Error('The expected test command is not unique in the pinned workflow');
  const steps = job.steps.filter(s => s.name === stepName);
  if (steps.length !== 1 || steps[0].status !== 'completed' || !steps[0].started_at || !steps[0].completed_at) throw Error('Native executed test step is unavailable or ambiguous');
  const step = steps[0], log = await readLog(`${base}/actions/jobs/${jobId}/logs`);
  const stepLog = log.split('\n').filter(line => { const time = Date.parse(line.split(' ')[0]); return Number.isFinite(time) && time >= Date.parse(step.started_at) && time <= Date.parse(step.completed_at) + 999; }).join('\n');
  const measurements = measurementsFromTap(stepLog);
  let scripts = {};
  if (command.startsWith('npm ')) {
    try {
      const manifest = await request(`${base}/contents/package.json?ref=${context.commit}`);
      if (manifest.encoding === 'base64' && manifest.size < 1048576) scripts = JSON.parse(Buffer.from(manifest.content, 'base64').toString('utf8')).scripts ?? {};
    } catch { /* Unknown script propagation cannot establish blocking CI. */ }
  }
  const ci = !/continue-on-error\s*:|shell\s*:/.test(workflowSource) && commandBlocksTestFailure(command, scripts);
  const enforcement = { ...await mergeEnforcement(repo.full_name, context.ref.replace(/^refs\/heads\//, ''), job.name, check.app.id, request), ci };
  const url = `https://github.com/${repo.full_name}/actions/runs/${runId}/attempts/${attempt}#job-${jobId}`;
  const observation = { schemaVersion: 1, catalogVersion: practiceCatalog.version, definitionVersion: practiceCatalog.version, practice: 'tests',
    repository: context.repository, ref: context.ref, commit: context.commit, scope: context.scope, mode: ci ? 'blocking' : 'report-only',
    applicability: { status: 'applicable', profile: context.profile, reason: `Declared tests in native step: ${stepName}`, source: `https://github.com/${repo.full_name}/blob/${context.commit}/${workflow}` },
    collection: { expected: 1, collected: 1, exclusions: [] }, measurements,
    source: { workflow, runId, attempt, jobId, url, result: step.conclusion === 'success' ? 'success' : step.conclusion === 'cancelled' ? 'cancelled' : 'failure', observedAt: step.completed_at, producer: { name: 'github-actions-tap', version: '1.0.0' }, reportDigest: '' } };
  observation.source.reportDigest = practiceDigest(observationPayload(observation));
  const observationDigest = practiceDigest(observation);
  return { observations: [observation], authority: { workflowDigest: practiceDigest(workflowSource), logDigest: practiceDigest(stepLog), enforcement },
    resolveSource: candidate => practiceDigest(candidate) === observationDigest ? { verified: true, observationDigest, enforcement } : undefined };
}
