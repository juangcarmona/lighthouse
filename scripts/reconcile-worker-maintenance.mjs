import { execFileSync } from 'node:child_process';
import { appendFile, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { dirname } from 'node:path';
import { pathToFileURL } from 'node:url';

const repository = 'juangcarmona/lighthouse', repositoryId = 1427668548;
const workflow = 'lighthouse-worker-maintenance.yml';
const active = new Set(['queued', 'in_progress', 'waiting', 'pending', 'requested']);

function scanCompletion(value, now) {
  if (typeof value !== 'string' || !/^(?!0000)[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](\.[0-9]{3})?Z$/.test(value)) return null;
  const parsed = Date.parse(value);
  const canonical = value.length === 20 ? value.slice(0, -1) + '.000Z' : value;
  return Number.isFinite(parsed) && parsed <= now && new Date(parsed).toISOString() === canonical ? parsed : null;
}

async function observeScan(api, run, now) {
  if (![run.id, run.run_attempt].every(value => Number.isSafeInteger(value) && value > 0)) return { cause: 'invalid-run-binding' };
  let inventory;
  try { inventory = await api(`actions/runs/${run.id}/attempts/${run.run_attempt}/jobs?per_page=100`); }
  catch { return { cause: 'jobs-unavailable' }; }
  if (!inventory || !Array.isArray(inventory.jobs) || !Number.isSafeInteger(inventory.total_count) || inventory.total_count < 0 || inventory.total_count !== inventory.jobs.length || inventory.total_count > 100) return { cause: 'incomplete-jobs' };
  const ids = new Set();
  for (const job of inventory.jobs) {
    if (!job || !Number.isSafeInteger(job.id) || job.id <= 0 || ids.has(job.id) || job.run_id !== run.id || job.run_attempt !== run.run_attempt || typeof job.name !== 'string' || !job.name || typeof job.status !== 'string' || !(job.conclusion === null || typeof job.conclusion === 'string')) return { cause: 'invalid-job-binding' };
    ids.add(job.id);
  }
  const scans = inventory.jobs.filter(job => job.name === 'scan');
  if (scans.length !== 1 || scans[0].status !== 'completed' || scans[0].conclusion !== 'success') return { cause: 'scan-not-successful' };
  const completedAt = scanCompletion(scans[0].completed_at, now);
  return completedAt === null ? { cause: 'invalid-scan-completion' } : { completedAt };
}

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
  if (success && (!Number.isFinite(Date.parse(success.updated_at)) || Date.parse(success.updated_at) > now)) throw Error('Maintenance completion time is invalid');
  if (pending && (pending.repositoryId !== repositoryId || !Number.isFinite(Date.parse(pending.requestedAt)))) throw Error('Invalid retained maintenance intent');
  const scan = success ? await observeScan(api, success, now) : null;
  if (scan?.cause) return { ...result, lastSuccess: null, ageMinutes: null, coverage: 'latest-100-runs', reason: 'scan-unconfirmed', cause: scan.cause, ...(pending ? { pending } : {}) };
  const lastSuccess = success?.html_url ?? null;
  const ageMinutes = scan ? (now - scan.completedAt) / 60000 : null;
  const observation = { ...result, lastSuccess, ageMinutes, coverage: 'latest-100-runs' };
  if (pending) {
    if (scan && scan.completedAt >= Date.parse(pending.requestedAt)) {
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
