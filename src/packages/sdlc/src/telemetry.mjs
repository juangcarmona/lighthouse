import { appendFileSync, closeSync, constants, existsSync, lstatSync, mkdirSync, openSync, readFileSync, readdirSync, renameSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import { createHash, randomUUID } from 'node:crypto';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';

export const telemetryVersion = 1;
export function routingReason(text = '') {
  for (const [pattern, code] of [[/unauthor|not authorized/i, 'unauthorized'], [/reserv|occupied/i, 'reserved'], [/future|paused/i, 'paused'], [/duplicate|already|existing request/i, 'duplicate'], [/not installed|disabled/i, 'disabled'], [/unrelated|no eligible|unsupported workflow/i, 'unrelated-event'], [/stale|changed/i, 'stale-input'], [/missing|requires|prerequisite/i, 'missing-prerequisite'], [/requested|dispatch sent/i, 'requested'], [/resum|continu/i, 'continuation'], [/publish|publication/i, 'publication'], [/failed|failure/i, 'technical-failure']]) if (pattern.test(text)) return code;
  return 'other-observation';
}
const version = JSON.parse(readFileSync(new URL('../package.json', import.meta.url))).version;
const hash = value => createHash('sha256').update(value).digest('hex');
const identifier = value => typeof value === 'string' && /^[\w./:@#-]{1,256}$/.test(value) && !/(?:Bearer|sk-|ghp_|github_pat_|eyJ)/i.test(value) ? value : null;
const numeric = value => typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
const attributes = new Set(['phase', 'status', 'reasonCode', 'reasonDigest', 'eventName', 'action', 'label', 'actorClass', 'authorization', 'decision', 'tool', 'callId', 'messageId', 'model', 'provider', 'modelSource', 'finishReason', 'requestKind', 'adapter', 'capability', 'image', 'signal', 'exitCode', 'durationMs', 'inputTokens', 'outputTokens', 'reasoningTokens', 'cacheReadTokens', 'cacheWriteTokens', 'stepStarts', 'stepFinishes', 'toolCalls', 'sourceEvents', 'omittedEvents', 'cpuUsageUsec', 'memoryBytes', 'memoryPeakBytes', 'pids', 'pidsPeak', 'pidsDenied', 'oomKills', 'readBytes', 'writeBytes', 'networkRxBytes', 'networkTxBytes', 'cpuLimit', 'memoryLimitBytes', 'pidsLimit', 'httpStatus', 'attempt', 'delayMs', 'streamConnected']);
const correlationKeys = ['repository', 'issue', 'pullRequest', 'revision', 'worker', 'stage', 'runId', 'workflowRunId', 'workflowAttempt', 'job', 'runner', 'sessionId', 'parentSessionId', 'requestId', 'routerRunId', 'routerAttempt', 'signalId'];
export function metadata(values = {}) {
  return Object.fromEntries(Object.entries(values).filter(([key]) => attributes.has(key)).map(([key, value]) => [key, typeof value === 'boolean' ? value : typeof value === 'number' ? numeric(value) : identifier(value)]));
}
export function telemetryContext(env = process.env, request = {}) {
  const context = {
    repository: request.repository ?? env.GITHUB_REPOSITORY, issue: request.issue, pullRequest: request.pullRequest,
    revision: request.sourceRevision ?? env.GITHUB_SHA, worker: request.worker ?? env.LIGHTHOUSE_WORKER ?? request.stage,
    stage: request.stage, runId: request.runId, workflowRunId: request.workflowRunId ?? env.GITHUB_RUN_ID,
    workflowAttempt: request.attempt ?? env.GITHUB_RUN_ATTEMPT, job: env.GITHUB_JOB, runner: env.RUNNER_NAME,
    sessionId: request.runId ? `ses_${request.runId}` : undefined, parentSessionId: request.parentSessionId,
    requestId: request.dispatch?.requestId ?? request.id, routerRunId: request.dispatch?.routerRunId ?? request.routerRunId,
    routerAttempt: request.dispatch?.routerAttempt ?? request.routerAttempt, signalId: request.signalId,
  };
  return Object.fromEntries(correlationKeys.map(key => [key, identifier(String(context[key] ?? ''))]));
}
export function telemetryDirectory(env = process.env) {
  return resolve(env.LIGHTHOUSE_TELEMETRY_DIR ?? (env.GITHUB_ACTIONS === 'true' && env.RUNNER_TEMP ? join(env.RUNNER_TEMP, 'gh-aw/telemetry') : join(env.XDG_STATE_HOME ?? join(env.HOME ?? homedir(), '.local/state'), 'lighthouse/telemetry')));
}
const atomic = (path, value) => { writeFileSync(path + '.tmp', JSON.stringify(value) + '\n', { mode: 0o600 }); renameSync(path + '.tmp', path); };
export const telemetryCapabilities = {
  lifecycle: 'host-observed', opencode: 'native-2.1-plugin-with-cli-fallback', usage: 'observed-with-coverage',
  resources: 'linux-cgroup-v2-and-proc', billing: 'unavailable', payloads: 'disabled', transport: 'ndjson-and-otlp-http-json-logs',
};

// A process owns one journal. Consumers merge streams; no workload shares an append lock.
export function createTelemetry({ directory, component = 'adapter', context = {}, env = process.env, maxBytes = 16 * 1024 * 1024, maxStreams = 128, retentionMs = 7 * 86400000 } = {}) {
  directory ??= telemetryDirectory(env);
  const stream = randomUUID(), path = join(directory, stream + '.jsonl');
  let healthPath = join(directory, stream + '.json');
  const correlation = Object.fromEntries(correlationKeys.map(key => [key, identifier(String(context[key] ?? ''))]));
  const traceId = /^[a-f0-9]{32}$/.test(env.GITHUB_AW_OTEL_TRACE_ID ?? '') ? env.GITHUB_AW_OTEL_TRACE_ID : hash(correlation.requestId ?? correlation.runId ?? stream).slice(0, 32);
  const spanId = hash(stream).slice(0, 16);
  const state = { schemaVersion: 1, stream, component, packageVersion: version, status: env.LIGHTHOUSE_TELEMETRY_DISABLED === 'true' ? 'disabled' : 'local-only', active: true, written: 0, dropped: 0, bytes: 0, lastSequence: 0, lastObservedAt: null, retiredStreams: 0, errorCode: null, capabilities: telemetryCapabilities };
  let fd, closed = false, safeDirectory = false;
  try {
    mkdirSync(directory, { recursive: true, mode: 0o700 });
    if (lstatSync(directory).isSymbolicLink()) throw Object.assign(Error(), { code: 'UNSAFE_DIRECTORY' });
    safeDirectory = true;
    const files = readdirSync(directory).filter(name => /^[a-f0-9-]{36}\.json$/.test(name));
    for (const name of files.sort((a, b) => statSync(join(directory, a)).mtimeMs - statSync(join(directory, b)).mtimeMs)) {
      const file = join(directory, name), age = Date.now() - statSync(file).mtimeMs;
      if ((age > retentionMs || readdirSync(directory).filter(n => n.endsWith('.jsonl')).length >= maxStreams) && !JSON.parse(readFileSync(file)).active) { unlinkSync(file); try { unlinkSync(file.replace(/\.json$/, '.jsonl')); } catch {} state.retiredStreams++; }
    }
    if (readdirSync(directory).filter(name => name.endsWith('.jsonl')).length >= maxStreams) throw Object.assign(Error(), { code: 'RETENTION_CAPACITY' });
    if (state.status !== 'disabled') fd = openSync(path, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW, 0o600);
    atomic(healthPath, state);
  } catch (error) { state.status = 'degraded'; state.errorCode = identifier(error.code) ?? 'IO_ERROR'; healthPath = join(directory, 'collection-error.json'); }
  const save = () => { if (!safeDirectory) return; try { atomic(healthPath, state); } catch { state.status = 'degraded'; state.errorCode = 'HEALTH_WRITE_FAILED'; } };
  const emit = (type, values = {}, source = {}) => {
    if (closed || state.status === 'disabled') return null;
    if (fd === undefined) { state.dropped++; save(); return null; }
    const now = new Date().toISOString(), sequence = state.lastSequence + 1;
    const event = {
      schemaVersion: 1, id: hash(`${stream}:${sequence}`), stream, sequence, type: identifier(type) ?? 'collection.invalid-event',
      time: typeof source.time === 'number' && Number.isFinite(source.time) && source.time >= 0 && source.time < 8640000000000000 ? new Date(source.time).toISOString() : now, observedAt: now,
      producer: { component, packageVersion: version, environment: env.GITHUB_ACTIONS === 'true' ? 'github-actions' : 'local', installationId: hash(env.LIGHTHOUSE_TELEMETRY_INSTALLATION ?? env.RUNNER_NAME ?? directory).slice(0, 32) },
      correlation: { ...correlation }, traceId, spanId,
      source: { kind: identifier(source.kind) ?? 'host', id: identifier(source.id), sequence: numeric(source.sequence), artifact: source.kind === 'opencode' ? 'native-events.jsonl' : source.kind === 'opencode-cli' ? 'engine-events.jsonl' : null },
      attributes: metadata(values),
    };
    const line = JSON.stringify(event) + '\n';
    if (state.bytes + Buffer.byteLength(line) > maxBytes || Buffer.byteLength(line) > 16384) { state.dropped++; state.status = 'degraded'; state.errorCode = 'BUFFER_CAPACITY'; save(); return null; }
    try {
      appendFileSync(fd, line); state.bytes += Buffer.byteLength(line); state.written++; state.lastSequence = sequence; state.lastObservedAt = now; save(); return event;
    } catch (error) { state.dropped++; state.status = 'degraded'; state.errorCode = identifier(error.code) ?? 'IO_ERROR'; save(); return null; }
  };
  return {
    stream, directory, context: correlation, emit, health: () => ({ ...state }),
    bind(values) { for (const key of correlationKeys) if (values[key] !== undefined) correlation[key] = values[key] === null ? null : identifier(String(values[key])); },
    close(status = 'completed') { if (closed) return; emit('collection.stopped', { status }); closed = true; state.active = false; if (fd !== undefined) { try { closeSync(fd); } catch {} } save(); },
  };
}

export function readTelemetry(directory, { stream, after = 0 } = {}) {
  if (!Number.isSafeInteger(after) || after < 0 || stream && !/^[a-f0-9-]{36}$/.test(stream)) throw Error('Invalid telemetry cursor');
  const files = existsSync(directory) ? readdirSync(directory).filter(n => /^[a-f0-9-]{36}\.jsonl$/.test(n) && (!stream || n === stream + '.jsonl')).sort() : [];
  const records = [];
  for (const name of files) {
    const file = join(directory, name); if (lstatSync(file).isSymbolicLink() || statSync(file).size > 17 * 1024 * 1024) throw Error('Unsafe telemetry journal');
    const lines = readFileSync(file, 'utf8').split('\n'); lines.pop();
    for (const line of lines) { const event = JSON.parse(line); if (event.schemaVersion !== 1 || event.stream !== name.slice(0, -6) || !Number.isSafeInteger(event.sequence) || event.sequence < 1 || event.id !== hash(`${event.stream}:${event.sequence}`)) throw Error('Unsupported or invalid telemetry record'); if (event.sequence > after) records.push(event); }
  }
  if (stream && !files.length && after > 0) throw Error('Telemetry cursor expired or stream unavailable');
  return records;
}

export function telemetryHealth(directory) {
  return (existsSync(directory) ? readdirSync(directory) : []).filter(n => /^[a-f0-9-]{36}\.json$/.test(n) || n === 'collection-error.json').map(n => JSON.parse(readFileSync(join(directory, n))));
}

export function otlpLogs(events) {
  const value = input => ({ stringValue: typeof input === 'string' ? input : JSON.stringify(input) });
  return { resourceLogs: [{ resource: { attributes: [{ key: 'service.name', value: value('lighthouse') }, { key: 'service.version', value: value(version) }] }, scopeLogs: [{ scope: { name: 'lighthouse.telemetry', version: '1' }, logRecords: events.map(event => ({ timeUnixNano: String(BigInt(Date.parse(event.time)) * 1000000n), observedTimeUnixNano: String(BigInt(Date.parse(event.observedAt)) * 1000000n), severityNumber: 9, body: value(event), traceId: event.traceId, spanId: event.spanId, attributes: [{ key: 'event.name', value: value(event.type) }, { key: 'lighthouse.event.id', value: value(event.id) }] })) }] }] };
}

export async function exportTelemetry(directory, { endpoint, headers = {}, checkpoint = join(directory, 'export-checkpoint.json'), timeoutMs = 3000 } = {}) {
  const url = new URL(endpoint);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw Error('Use an explicit HTTP(S) OTLP logs endpoint without URL credentials');
  let cursors = {}; if (existsSync(checkpoint)) cursors = JSON.parse(readFileSync(checkpoint)).cursors ?? {};
  const all = readTelemetry(directory), pending = all.filter(e => e.sequence > (cursors[e.stream] ?? 0)), started = Date.now();
  const state = { schemaVersion: 1, status: 'exporting', backlog: pending.length, exported: 0, errorCode: null, lagMs: pending.length ? Date.now() - Date.parse(pending[0].observedAt) : 0, cursors };
  for (let i = 0; i < pending.length; i += 100) {
    const batch = pending.slice(i, i + 100);
    try {
      const response = await fetch(url, { method: 'POST', headers: { ...headers, 'content-type': 'application/json' }, body: JSON.stringify(otlpLogs(batch)), redirect: 'error', signal: AbortSignal.timeout(timeoutMs) });
      if (!response.ok) throw Error('HTTP_' + response.status);
      const text = await response.text(); if (text && JSON.parse(text).partialSuccess?.rejectedLogRecords > 0) throw Error('PARTIAL_REJECTION');
      for (const event of batch) cursors[event.stream] = event.sequence;
      state.exported += batch.length; state.backlog -= batch.length; atomic(checkpoint, { cursors });
    } catch (error) { state.status = 'degraded'; state.errorCode = /^HTTP_\d+$/.test(error.message) ? error.message : error.message === 'PARTIAL_REJECTION' ? error.message : 'EXPORT_FAILED'; break; }
  }
  state.durationMs = Date.now() - started; atomic(join(directory, 'export-health.json'), state); return state;
}
