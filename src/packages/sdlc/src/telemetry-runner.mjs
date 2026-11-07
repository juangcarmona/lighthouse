#!/usr/bin/env node
import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn, spawnSync } from 'node:child_process';
import { createTelemetry, telemetryContext, telemetryDirectory, exportTelemetry } from './telemetry.mjs';

export function installTelemetry(directory, env = process.env) {
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  const settings = join(directory, 'settings.json');
  if (!existsSync(settings)) writeFileSync(settings, JSON.stringify({ schemaVersion: 1, enabled: true, maxBytes: 16777216, maxStreams: 128, retentionDays: 7, otlpEndpoint: null }, null, 2) + '\n', { mode: 0o600 });
  const selected = JSON.parse(readFileSync(settings));
  if (selected.schemaVersion !== 1 || typeof selected.enabled !== 'boolean' || !Number.isInteger(selected.maxBytes) || selected.maxBytes < 16384 || selected.maxBytes > 16777216 || !Number.isInteger(selected.maxStreams) || selected.maxStreams < 1 || selected.maxStreams > 128 || !Number.isInteger(selected.retentionDays) || selected.retentionDays < 1 || selected.retentionDays > 90) throw Error('Invalid operator telemetry settings');
  return { directory, env: { ...env, ...(selected.enabled ? {} : { LIGHTHOUSE_TELEMETRY_DISABLED: 'true' }) }, maxBytes: selected.maxBytes, maxStreams: selected.maxStreams, retentionMs: selected.retentionDays * 86400000, endpoint: env.LIGHTHOUSE_TELEMETRY_OTLP_ENDPOINT ?? selected.otlpEndpoint };
}

export async function runRunner(command, env = process.env) {
  if (!command.length) throw Error('A runner command is required');
  const directory = telemetryDirectory(env);
  let config;
  try { config = installTelemetry(directory, env); }
  catch { config = { directory, env, endpoint: null }; console.error(JSON.stringify({ type: 'collection.health', status: 'degraded', reasonCode: 'operator-state-unavailable' })); }
  let runner = env.RUNNER_NAME;
  if (!runner && existsSync('.runner')) runner = JSON.parse(readFileSync('.runner')).agentName;
  const childEnv = { ...config.env, LIGHTHOUSE_TELEMETRY_DIR: directory, RUNNER_NAME: runner ?? 'unregistered', LIGHTHOUSE_TELEMETRY_START_HOOK: env.ACTIONS_RUNNER_HOOK_JOB_STARTED ?? '', LIGHTHOUSE_TELEMETRY_END_HOOK: env.ACTIONS_RUNNER_HOOK_JOB_COMPLETED ?? '' };
  const module = fileURLToPath(import.meta.url);
  for (const [name, action] of [['STARTED', 'started'], ['COMPLETED', 'completed']]) {
    const path = join(directory, `job-${action}.sh`);
    try { writeFileSync(path, `#!/bin/sh\nexec node '${module.replaceAll("'", "'\\''")}' hook ${action}\n`, { mode: 0o700 }); chmodSync(path, 0o700); childEnv[`ACTIONS_RUNNER_HOOK_JOB_${name}`] = path; }
    catch { console.error(JSON.stringify({ type: 'collection.health', status: 'degraded', reasonCode: 'hook-installation-unavailable' })); }
  }
  const telemetry = createTelemetry({ ...config, component: 'runner', context: telemetryContext(childEnv), env: childEnv });
  telemetry.emit('runner.started', { status: 'idle' });
  let exporting = false;
  const forward = async () => {
    if (!config.endpoint || exporting || config.env.LIGHTHOUSE_TELEMETRY_DISABLED === 'true') return;
    exporting = true;
    try { await exportTelemetry(directory, { endpoint: config.endpoint, headers: env.LIGHTHOUSE_TELEMETRY_OTLP_HEADERS ? JSON.parse(env.LIGHTHOUSE_TELEMETRY_OTLP_HEADERS) : {} }); }
    catch { telemetry.emit('collection.gap', { reasonCode: 'export-configuration' }); }
    finally { exporting = false; }
  };
  const timer = setInterval(() => { telemetry.emit('runner.heartbeat', { status: 'alive' }); void forward(); }, 10000);
  const child = spawn(command[0], command.slice(1), { env: childEnv, stdio: 'inherit' });
  const stop = signal => child.kill(signal);
  const term = () => stop('SIGTERM'), interrupt = () => stop('SIGINT');
  process.on('SIGTERM', term); process.on('SIGINT', interrupt);
  const exit = await new Promise(resolveExit => { child.once('error', () => resolveExit(127)); child.once('close', code => resolveExit(code ?? 1)); });
  clearInterval(timer); process.removeListener('SIGTERM', term); process.removeListener('SIGINT', interrupt);
  telemetry.emit('runner.stopped', { exitCode: exit }); telemetry.close(); await forward(); return exit;
}

export function jobHook(action, env = process.env) {
  if (!['started', 'completed'].includes(action)) throw Error('Unknown job hook');
  const telemetry = createTelemetry({ directory: telemetryDirectory(env), env, component: 'job-hook', context: telemetryContext(env) });
  const started = Date.now(); telemetry.emit(`job.${action}`, { status: action });
  const original = env[action === 'started' ? 'LIGHTHOUSE_TELEMETRY_START_HOOK' : 'LIGHTHOUSE_TELEMETRY_END_HOOK'];
  let code = 0;
  if (original) {
    telemetry.emit('job.host-wait.started', { status: 'waiting' });
    const result = spawnSync(original, [], { env, stdio: 'inherit' }); code = result.status ?? 1;
    telemetry.emit('job.host-wait.ended', { durationMs: Date.now() - started, exitCode: code });
  }
  telemetry.close(code === 0 ? 'completed' : 'failed'); return code;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [action, ...args] = process.argv.slice(2);
  try { process.exitCode = action === 'hook' ? jobHook(args[0]) : action === 'run' && args[0] === '--' ? await runRunner(args.slice(1)) : 2; }
  catch { console.error('Runner telemetry startup failed; inspect operator settings and permissions.'); process.exitCode = 1; }
}
