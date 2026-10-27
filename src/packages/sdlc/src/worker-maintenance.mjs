import { readFile, writeFile, mkdir, appendFile } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { dispatchArtifact, sendDispatch } from './stage-dispatch.mjs';
import { maintenancePath, prepareRecovery } from './worker-recovery.mjs';

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

async function main(command) {
  const env = process.env, repository = env.GITHUB_REPOSITORY, owner = env.GITHUB_REPOSITORY_OWNER;
  if (!/^[\w.-]+\/[\w.-]+$/.test(repository ?? '')) throw Error('Invalid repository');
  const api = async (path, method = 'GET', body) => {
    const response = await fetch(`https://api.github.com/repos/${repository}${path ? '/' + path : ''}`, { method, headers: { authorization: `Bearer ${env.GH_TOKEN}`, accept: 'application/vnd.github+json', 'content-type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(30000) });
    if (!response.ok) throw Error(`GitHub ${method} ${path}: ${response.status}`);
    return response.status === 204 ? null : response.json();
  };
  const output = async (name, value) => { if (env.GITHUB_OUTPUT) await appendFile(env.GITHUB_OUTPUT, `${name}=${value}\n`); };
  const parent = await api(`actions/runs/${env.GITHUB_RUN_ID}/attempts/${env.GITHUB_RUN_ATTEMPT}`);
  if (parent.path !== maintenancePath || parent.repository?.full_name !== repository || !['schedule', 'workflow_dispatch'].includes(parent.event) || parent.actor?.login !== owner || parent.triggering_actor?.login !== owner) throw Error('Maintenance is not an authorized execution');
  if (env.LIGHTHOUSE_MAINTENANCE_ENABLED !== 'true') throw Error('Maintenance is not enabled');
  if (command === 'scan') {
    const event = JSON.parse(await readFile(env.GITHUB_EVENT_PATH, 'utf8'));
    const requested = event.inputs?.issue;
    if (requested && !/^[1-9][0-9]*$/.test(requested)) throw Error('Issue must be a canonical positive integer');
    const issues = requested ? [Number(requested)] : await ownerIssues(api, owner);
    await output('issues', JSON.stringify(issues)); return;
  }
  const issue = Number(env.LIGHTHOUSE_ISSUE);
  if (!Number.isSafeInteger(issue) || issue < 1) throw Error('Invalid issue');
  const dir = join(env.RUNNER_TEMP, `lighthouse-maintenance-${env.GITHUB_RUN_ID}-${issue}`);
  if (command === 'send') {
    if (env.LIGHTHOUSE_RECOVERY_ENABLED !== 'true') throw Error('Automatic recovery is disabled');
    await sendDispatch(api, repository, JSON.parse(await readFile(join(dir, 'dispatch.json'), 'utf8')), env.LIGHTHOUSE_DISPATCH_COMMENT); return;
  }
  if (command !== 'prepare') throw Error('Unknown maintenance command');
  await mkdir(dir, { recursive: true });
  try {
    const result = await prepareRecovery(api, repository, owner, issue, parent, env.LIGHTHOUSE_RECOVERY_ENABLED === 'true');
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
