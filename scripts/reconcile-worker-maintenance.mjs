import { execFileSync } from 'node:child_process';
import { appendFile, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { dirname } from 'node:path';
import { pathToFileURL } from 'node:url';

const repository = 'juangcarmona/lighthouse', repositoryId = 1427668548;
const workflow = 'lighthouse-worker-maintenance.yml';
const active = new Set(['queued', 'in_progress', 'waiting', 'pending', 'requested']);

export async function reconcileMaintenance(api, { now = Date.now(), apply = false, pending = null, checkpoint } = {}) {
  const target = await api('');
  if (target.full_name !== repository || target.id !== repositoryId || !target.default_branch) throw Error('Maintenance repository identity mismatch');
  const result = { schemaVersion: 1, repository, repositoryId, observedAt: new Date(now).toISOString(), action: 'none' };
  const inventory = await api(`actions/workflows/${workflow}/runs?per_page=100`);
  if (!Array.isArray(inventory.workflow_runs)) throw Error('Maintenance run inventory unavailable');
  const runs = inventory.workflow_runs;
  if (runs.some(run => run.path !== `.github/workflows/${workflow}` || run.repository?.id !== repositoryId)) throw Error('Maintenance run identity mismatch');
  // Query active runs separately: an old queued execution may be outside the recent page.
  for (const status of ['queued', 'in_progress', 'waiting', 'pending', 'requested']) {
    const current = await api(`actions/workflows/${workflow}/runs?status=${status}&per_page=1`);
    if (!Number.isSafeInteger(current.total_count) || current.total_count < 0) throw Error('Active maintenance inventory unavailable');
    if (current.total_count > 0) return { ...result, reason: 'active-execution', status };
  }
  if (runs.some(run => active.has(run.status))) return { ...result, reason: 'active-execution' };
  const success = runs.filter(run => run.status === 'completed' && run.conclusion === 'success').sort((a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at))[0];
  const lastSuccess = success?.html_url ?? null;
  const ageMinutes = success ? (now - Date.parse(success.updated_at)) / 60000 : null;
  if (success && (!Number.isFinite(ageMinutes) || ageMinutes < 0)) throw Error('Maintenance completion time is invalid');
  const observation = { ...result, lastSuccess, ageMinutes, coverage: 'latest-100-runs' };
  if (pending) {
    if (pending.repositoryId !== repositoryId || !Number.isFinite(Date.parse(pending.requestedAt))) throw Error('Invalid retained maintenance intent');
    if (success && Date.parse(success.updated_at) >= Date.parse(pending.requestedAt)) {
      if (apply) await checkpoint(null);
    } else return { ...observation, reason: 'dispatch-unconfirmed', pending };
  }
  if (ageMinutes !== null && ageMinutes < 45) return { ...observation, reason: 'healthy' };
  if (!apply) return { ...observation, action: 'would-dispatch', reason: 'maintenance-overdue' };
  if (!checkpoint) throw Error('Maintenance dispatch requires a durable intent checkpoint');
  const current = await api('');
  if (current.id !== repositoryId || current.full_name !== repository || current.default_branch !== target.default_branch) throw Error('Maintenance target changed before dispatch');
  await checkpoint({ repositoryId, repository, workflow, ref: current.default_branch, requestedAt: result.observedAt });
  await api(`actions/workflows/${workflow}/dispatches`, 'POST', { ref: current.default_branch });
  return { ...observation, action: 'dispatched', reason: 'maintenance-overdue', submission: 'accepted-not-yet-verified' };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const args = process.argv.slice(2), journalIndex = args.indexOf('--journal');
    const journal = journalIndex < 0 ? null : args[journalIndex + 1];
    if (args.some((arg, i) => arg !== '--apply' && arg !== '--journal' && !(journalIndex >= 0 && i === journalIndex + 1)) || journalIndex >= 0 && (!journal || journal.startsWith('--')) || args.includes('--apply') && !journal) throw Error('Usage: reconcile-worker-maintenance.mjs [--apply --journal <operator-owned-file>]');
    const api = async (path, method = 'GET', data) => {
      const output = execFileSync('gh', ['api', `repos/${repository}${path ? '/' + path : ''}`, ...(method === 'GET' ? [] : ['--method', method, '--input', '-'])], { encoding: 'utf8', timeout: 30000, maxBuffer: 4 * 1024 * 1024, input: data ? JSON.stringify(data) : undefined });
      return output.trim() ? JSON.parse(output) : null;
    };
    let pending = null;
    if (journal) {
      await mkdir(dirname(journal), { recursive: true });
      try { pending = JSON.parse(await readFile(journal + '.pending', 'utf8')); } catch (error) { if (error.code !== 'ENOENT') throw error; }
    }
    const checkpoint = async value => value === null ? rm(journal + '.pending') : writeFile(journal + '.pending', JSON.stringify(value) + '\n', { mode: 0o600, flag: 'wx' });
    const observation = await reconcileMaintenance(api, { apply: args.includes('--apply'), pending, checkpoint });
    if (journal) { await mkdir(dirname(journal), { recursive: true }); await appendFile(journal, JSON.stringify(observation) + '\n', { mode: 0o600 }); }
    console.log(JSON.stringify(observation));
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
