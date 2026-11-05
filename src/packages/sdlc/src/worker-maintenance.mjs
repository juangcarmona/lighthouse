import { readFile, writeFile, mkdir, appendFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { dispatchArtifact, sendDispatch, readDispatchReceipt } from './stage-dispatch.mjs';
import { maintenancePath, prepareRecovery, observeRecovery, recoveryIssues } from './worker-recovery.mjs';
import { githubAppCiTrigger } from './github-app-ci.mjs';
import { publishReports } from './worker-reports.mjs';

export async function ownerIssues(api, owner) {
  const issues = [];
  for (let page = 1; page <= 5; page++) {
    const rows = await api(`issues?state=open&per_page=100&page=${page}`);
    issues.push(...rows.filter(i => !i.pull_request && i.user?.login === owner).map(i => i.number));
    if (rows.length < 100) {
      if (issues.length > 100) throw Error('Maintenance exceeds 100 open owner issues');
      return issues;
    }
  }
  throw Error('Issue inventory exceeds maintenance bounds');
}

export async function maintenanceIssues(api, owner, repository) {
  const issues = new Set(await ownerIssues(api, owner));
  const recent = await api('actions/workflows/lighthouse-sdlc-review.lock.yml/runs?per_page=100', 'GET', undefined, true);
  if (recent === null) return [...issues];
  if (!Array.isArray(recent.workflow_runs) || recent.workflow_runs.length > 100) throw Error('Final review inventory exceeds maintenance bounds');
  const seen = new Set();
  for (const run of recent.workflow_runs.toSorted((a, b) => b.id - a.id)) {
    const match = /^review #([1-9][0-9]*) · request ([1-9][0-9]*)$/.exec(run.display_title ?? '');
    if (!match || run.path !== '.github/workflows/lighthouse-sdlc-review.lock.yml') continue;
    const number = Number(match[1]);
    if (seen.has(number) || issues.has(number)) continue;
    seen.add(number);
    if (run.status !== 'completed' || !['success', 'failure', 'timed_out'].includes(run.conclusion)) continue;
    const issue = await api(`issues/${number}`);
    if (issue.number !== number || issue.state !== 'closed' || issue.user?.login !== owner || issue.pull_request) continue;
    const receipt = readDispatchReceipt(await api(`issues/comments/${match[2]}`), repository, number);
    if (receipt.stage === 'review' && String(receipt.workerRunId) === String(run.id) && ['requested', 'running', 'unknown', 'failed'].includes(receipt.status)) issues.add(number);
  }
  if (issues.size > 100) throw Error('Maintenance exceeds 100 owner issues');
  return [...issues];
}

async function main(command) {
  const env = process.env, repository = env.GITHUB_REPOSITORY, owner = env.GITHUB_REPOSITORY_OWNER;
  if (!/^[\w.-]+\/[\w.-]+$/.test(repository ?? '')) throw Error('Invalid repository');
  const api = async (path, method = 'GET', body, optional = false) => {
    const response = await fetch(`https://api.github.com/repos/${repository}${path ? '/' + path : ''}`, { method, headers: { authorization: `Bearer ${env.GH_TOKEN}`, accept: 'application/vnd.github+json', 'content-type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(30000) });
    if (optional && response.status === 404) return null;
    if (!response.ok) throw Object.assign(Error(`GitHub ${method} ${path}: ${response.status}`), { status: response.status });
    if (/^actions\/jobs\/[1-9][0-9]*\/logs$/.test(path)) {
      const log = await response.text();
      if (Buffer.byteLength(log) > 4 * 1024 * 1024) throw Error('Job log exceeds recovery bounds');
      return log;
    }
    return response.status === 204 ? null : response.json();
  };
  const output = async (name, value) => { if (env.GITHUB_OUTPUT) await appendFile(env.GITHUB_OUTPUT, `${name}=${value}\n`); };
  const parent = await api(`actions/runs/${env.GITHUB_RUN_ID}/attempts/${env.GITHUB_RUN_ATTEMPT}`);
  if (parent.path !== maintenancePath || parent.repository?.full_name !== repository || !['schedule', 'workflow_dispatch'].includes(parent.event) || parent.actor?.login !== owner || parent.triggering_actor?.login !== owner) throw Error('Maintenance is not an authorized execution');
  if (env.LIGHTHOUSE_MAINTENANCE_ENABLED !== 'true') throw Error('Maintenance is not enabled');
  const scope = recoveryIssues(env.LIGHTHOUSE_MAINTENANCE_ISSUES);
  if (command === 'report') {
    const root = join(env.RUNNER_TEMP, 'worker-observations'), observations = [], seen = [];
    const directories = await readdir(root);
    if (directories.length > 100) throw Error('Observation inventory exceeds bounds');
    for (const directory of directories) {
      const match = directory.match(/^lighthouse-(?:maintenance|observation)-([1-9][0-9]*)$/);
      if (!match) throw Error('Unexpected observation artifact');
      const source = await readFile(join(root, directory, 'observations.json'), 'utf8');
      if (Buffer.byteLength(source) > 256000) throw Error('Observation artifact exceeds bounds');
      const rows = JSON.parse(source);
      if (!Array.isArray(rows) || rows.some(r => r.issue !== Number(match[1]))) throw Error('Observation issue differs from its artifact');
      observations.push(...rows); seen.push(Number(match[1]));
    }
    const expected = JSON.parse(env.LIGHTHOUSE_OBSERVED_ISSUES ?? '[]');
    if (JSON.stringify(seen.sort((a, b) => a - b)) !== JSON.stringify(expected.sort((a, b) => a - b))) throw Error('Incomplete maintenance observations');
    const reports = await publishReports(api, repository, owner, env.LIGHTHOUSE_REPORT_INDEX_ISSUE, observations);
    if (env.GITHUB_STEP_SUMMARY) await appendFile(env.GITHUB_STEP_SUMMARY, reports.map(r => `- [Report #${r.number}](https://github.com/${repository}/issues/${r.number}): ${r.count} distinct observation(s), ${r.state}.`).join('\n') + '\n');
    return;
  }
  if (command === 'scan') {
    const event = JSON.parse(await readFile(env.GITHUB_EVENT_PATH, 'utf8'));
    const requested = event.inputs?.issue;
    if (requested && !/^[1-9][0-9]*$/.test(requested)) throw Error('Issue must be a canonical positive integer');
    if (requested && scope && !scope.includes(Number(requested))) throw Error('Issue is outside the configured maintenance scope');
    const issues = requested ? [Number(requested)] : scope ?? await maintenanceIssues(api, owner, repository);
    await output('issues', JSON.stringify(issues)); return;
  }
  const issue = Number(env.LIGHTHOUSE_ISSUE);
  if (!Number.isSafeInteger(issue) || issue < 1) throw Error('Invalid issue');
  if (scope && !scope.includes(issue)) throw Error('Issue is outside the configured maintenance scope');
  const dir = join(env.RUNNER_TEMP, `lighthouse-maintenance-${env.GITHUB_RUN_ID}-${issue}`);
  if (command === 'observe') {
    await mkdir(dir, { recursive: true });
    try {
      const observations = await observeRecovery(api, repository, owner, issue);
      await writeFile(join(dir, 'observations.json'), JSON.stringify(observations));
    } catch (error) {
      await writeFile(join(dir, 'observations.json'), JSON.stringify([{ issue, state: 'uncertain', code: 'evidence-unavailable', nextAction: 'Inspect maintenance evidence before requesting another execution.' }]));
      throw error;
    }
    return;
  }
  if (command === 'signal-completion') {
    if (env.LIGHTHOUSE_RECOVERY_ENABLED !== 'true') return;
    let proof;
    try { proof = JSON.parse(await readFile(join(dir, 'completion-recovery.json'), 'utf8')); } catch (error) { if (error.code === 'ENOENT') return; throw error; }
    if (proof.schemaVersion !== 1 || proof.issue !== issue) throw Error('Recovered completion differs from this issue');
    if (proof.stage === 'review') return;
    await api('actions/workflows/lighthouse-sdlc-router.yml/dispatches', 'POST', { ref: parent.head_branch, inputs: { issue: String(issue), stage: 'review', workflow: 'stage', after_run: String(parent.id) } });
    return;
  }
  if (command === 'send') {
    if (env.LIGHTHOUSE_RECOVERY_ENABLED !== 'true') throw Error('Automatic recovery is disabled');
    await sendDispatch(api, repository, JSON.parse(await readFile(join(dir, 'dispatch.json'), 'utf8')), env.LIGHTHOUSE_DISPATCH_COMMENT); return;
  }
  if (command !== 'prepare') throw Error('Unknown maintenance command');
  await mkdir(dir, { recursive: true });
  try {
    const result = await prepareRecovery(api, repository, owner, issue, parent, env.LIGHTHOUSE_RECOVERY_ENABLED === 'true', Date.now(), undefined, { ciTrigger: githubAppCiTrigger(env), saveCiRecovery: value => writeFile(join(dir, 'ci-recovery.json'), JSON.stringify(value)), saveCompletionRecovery: value => writeFile(join(dir, 'completion-recovery.json'), JSON.stringify(value)) });
    await writeFile(join(dir, 'observations.json'), JSON.stringify(result.observations));
    if (env.GITHUB_STEP_SUMMARY) await appendFile(env.GITHUB_STEP_SUMMARY, result.observations.map(o => `- Issue #${o.issue}, ${o.worker}: ${o.state}. ${o.nextAction}`).join('\n') + '\n');
    await output('send', String(!!result.request));
    if (result.request) {
      await writeFile(join(dir, 'dispatch.json'), JSON.stringify(result.request));
      await output('artifact', dispatchArtifact(result.request)); await output('comment', result.commentId);
    }
  } catch (error) {
    await writeFile(join(dir, 'observations.json'), JSON.stringify([{ issue, state: 'uncertain', code: 'evidence-unavailable', nextAction: 'Inspect maintenance evidence before requesting another execution.' }]));
    throw error;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main(process.argv[2]).catch(error => { console.error(error.message); process.exitCode = 1; });
