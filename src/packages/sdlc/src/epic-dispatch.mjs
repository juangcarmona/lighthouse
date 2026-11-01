import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readActionsJson } from './actions-artifact.mjs';
import { issueComments, readDispatchReceipt } from './stage-dispatch.mjs';
import { epicJournalKey } from './epic-github.mjs';
import { authenticateEpicChild } from './epic-native.mjs';

const positive = value => /^[1-9][0-9]*$/.test(String(value));
export async function verifyEpicTriageOrigin(api, { repository, owner, child, parent, runId }, { readArtifact = readActionsJson, authenticate = authenticateEpicChild } = {}) {
  if (![child, parent, runId].every(positive)) throw Error('Invalid epic triage origin');
  const run = await api(`actions/runs/${runId}`), repo = await api('');
  if (String(run.id) !== String(runId) || run.path !== '.github/workflows/lighthouse-sdlc-epic.yml' || run.event !== 'workflow_dispatch' || run.status !== 'completed' || run.conclusion !== 'success' || run.run_attempt !== 1 || run.actor?.login !== owner || run.triggering_actor?.login !== owner || run.repository?.full_name !== repository || run.head_branch !== repo.default_branch || run.head_sha !== (await api(`commits/${encodeURIComponent(repo.default_branch)}`)).sha) throw Error('Epic triage origin is not an authenticated current owner execution');
  const journal = await readArtifact(api, repository, run.id, `lighthouse-epic-journal-${parent}-${run.run_attempt}`, 'journal.json');
  if (journal?.schemaVersion !== 1 || journal.repository !== repository || journal.parent !== Number(parent) || journal.revision !== run.head_sha || String(journal.runId) !== String(run.id) || journal.attempt !== run.run_attempt || !journal.entries || typeof journal.entries !== 'object') throw Error('Epic triage journal is invalid');
  const current = await authenticate({ api, repository, owner, child: Number(child), readArtifact });
  if (current.parent !== Number(parent)) throw Error('Epic triage parent changed');
  const matches = Object.values(journal.entries).filter(entry => entry?.receipt?.state === 'linked' && entry.receipt.correlation?.kind === 'child' && entry.receipt.correlation.parent === Number(parent) && entry.receipt.correlation.slice === current.slice && entry.receipt.correlation.planDigest === current.planDigest && entry.receipt.resource?.number === Number(child));
  if (matches.length !== 1 || journal.entries[epicJournalKey(matches[0].receipt.correlation)] !== matches[0]) throw Error('Epic triage is not in the retained parent execution');
  return { run, journal, current };
}

export async function dispatchEpicTriage(api, { repository, owner, runId }, { readArtifact = readActionsJson, authenticate = authenticateEpicChild } = {}) {
  if (!positive(runId)) throw Error('Invalid epic execution');
  const run = await api(`actions/runs/${runId}`), inventory = await api(`actions/runs/${runId}/artifacts?per_page=100`);
  if (!Array.isArray(inventory.artifacts) || inventory.total_count !== inventory.artifacts.length || inventory.total_count > 100) throw Error('Epic artifact inventory is incomplete');
  const names = inventory.artifacts.filter(item => !item.expired).map(item => item.name).filter(name => /^lighthouse-epic-journal-[1-9][0-9]*-1$/.test(name));
  if (names.length !== 1) throw Error('Epic execution journal is missing or ambiguous');
  const parent = Number(names[0].match(/^lighthouse-epic-journal-([1-9][0-9]*)-1$/)[1]);
  const journal = await readArtifact(api, repository, runId, names[0], 'journal.json');
  const entries = Object.values(journal?.entries ?? {}).filter(entry => entry?.receipt?.state === 'linked' && entry.receipt.correlation?.kind === 'child');
  const sent = [];
  for (const entry of entries) {
    const child = entry.receipt.resource?.number;
    const verified = await verifyEpicTriageOrigin(api, { repository, owner, child, parent, runId }, { readArtifact, authenticate });
    const issue = await api(`issues/${child}`);
    if (issue.state !== 'open' || issue.labels.some(label => ['future', 'human-working', 'agent-working', 'needs-info', 'waiting-review', 'triaged', 'ready'].includes(label.name))) continue;
    const comments = await issueComments(api, child);
    const prior = comments.filter(comment => comment.user?.login === 'github-actions[bot]' && comment.user.type === 'Bot' && comment.body?.includes('<!-- lighthouse-dispatch:')).map(comment => readDispatchReceipt(comment, repository, child));
    if (prior.some(receipt => receipt.stage === 'triage')) continue;
    await api('actions/workflows/lighthouse-sdlc-router.yml/dispatches', 'POST', { ref: verified.run.head_branch, inputs: { issue: String(child), stage: 'triage', workflow: 'stage', epic_parent: String(parent), epic_run: String(runId) } });
    sent.push(child);
  }
  return { status: 'dispatched', parent, children: sent };
}

async function main() {
  const env = process.env, repository = env.GITHUB_REPOSITORY, owner = env.GITHUB_REPOSITORY_OWNER;
  const event = JSON.parse(await readFile(env.GITHUB_EVENT_PATH, 'utf8'));
  if (env.GITHUB_EVENT_NAME !== 'workflow_run' || event.action !== 'completed' || !positive(event.workflow_run?.id)) throw Error('Epic triage requires a completed workflow event');
  const api = async (path, method = 'GET', body, optional = false) => {
    const response = await fetch(`https://api.github.com/repos/${repository}${path ? `/${path}` : ''}`, { method, headers: { authorization: `Bearer ${env.GH_TOKEN}`, accept: 'application/vnd.github+json', 'content-type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(30000) });
    if (optional && response.status === 404) return null;
    if (!response.ok) throw Error(`GitHub ${method} ${path}: ${response.status}`);
    return response.status === 204 ? null : response.json();
  };
  console.log(JSON.stringify(await dispatchEpicTriage(api, { repository, owner, runId: event.workflow_run.id })));
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch(error => { console.error(error.message); process.exitCode = 1; });
