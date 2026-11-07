// Observes forge-owned workflow facts, including jobs skipped before a runner starts.
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createTelemetry, telemetryContext } from './telemetry.mjs';

export async function workflowTelemetry(env = process.env, fetchRequest = fetch) {
  const event = env.GITHUB_EVENT_PATH ? JSON.parse(await readFile(env.GITHUB_EVENT_PATH, 'utf8')) : {};
  const context = telemetryContext(env, { issue: event.issue?.number, pullRequest: event.pull_request?.number, signalId: String(event.comment?.id ?? event.review?.id ?? event.workflow_run?.id ?? env.GITHUB_RUN_ID ?? '') });
  const telemetry = createTelemetry({ component: 'workflow-observer', context, env });
  telemetry.emit('signal.received', { eventName: env.GITHUB_EVENT_NAME, action: event.action, label: event.label?.name, actorClass: env.GITHUB_ACTOR === env.GITHUB_REPOSITORY_OWNER ? 'owner' : 'other', authorization: 'observation-only' });
  if (env.GH_TOKEN && /^[\w.-]+\/[\w.-]+$/.test(env.GITHUB_REPOSITORY ?? '') && /^\d+$/.test(env.GITHUB_RUN_ID ?? '')) {
    try {
      const response = await fetchRequest(`https://api.github.com/repos/${env.GITHUB_REPOSITORY}/actions/runs/${env.GITHUB_RUN_ID}/attempts/${env.GITHUB_RUN_ATTEMPT ?? '1'}/jobs?per_page=100`, { headers: { authorization: `Bearer ${env.GH_TOKEN}`, accept: 'application/vnd.github+json' }, signal: AbortSignal.timeout(5000) });
      if (!response.ok) throw Error('Forge metadata unavailable');
      const payload = await response.json();
      for (const job of payload.jobs ?? []) {
        telemetry.bind({ job: String(job.id), runner: job.runner_name ?? null });
        const duration = Date.parse(job.completed_at) - Date.parse(job.started_at);
        telemetry.emit('workflow.job.observed', { status: job.conclusion ?? job.status, reasonCode: job.conclusion === 'skipped' ? 'workflow-condition-or-dependency' : 'forge-observation', durationMs: duration >= 0 ? duration : null }, { kind: 'github', id: `job:${job.id}:${job.status}:${job.conclusion ?? 'pending'}` });
      }
      if (payload.total_count > (payload.jobs?.length ?? 0)) telemetry.emit('collection.gap', { reasonCode: 'workflow-job-page-bound' });
    } catch { telemetry.emit('collection.gap', { reasonCode: 'forge-metadata-unavailable' }); }
  } else telemetry.emit('collection.capability', { capability: 'forge-job-metadata', status: 'unavailable' });
  telemetry.close(); return telemetry.health();
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) workflowTelemetry().catch(() => { console.error('Workflow telemetry unavailable; delivery authority is unchanged.'); });
