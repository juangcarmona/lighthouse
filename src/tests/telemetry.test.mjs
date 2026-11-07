import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { createTelemetry, telemetryContext, readTelemetry, telemetryHealth, exportTelemetry } from '../packages/sdlc/src/telemetry.mjs';
import { openCodeObserver, observeCli, usageSummary, nativeEventFile, collectNativeFile } from '../packages/sdlc/src/telemetry-opencode.mjs';
import { installTelemetry, jobHook, runRunner } from '../packages/sdlc/src/telemetry-runner.mjs';
import { workflowTelemetry } from '../packages/sdlc/src/telemetry-workflow.mjs';
const fixture = () => mkdtempSync(join(tmpdir(), 'lh-telemetry-'));
const tokens = { input: 100, output: 5, reasoning: 2, cache: { read: 50, write: 0 } };

test('first installation, independent cursor replay and upgrades preserve settings', () => {
  const directory = fixture();
  try {
    const config = installTelemetry(directory, {}), telemetry = createTelemetry({ ...config, env: {} });
    telemetry.emit('installation.ready'); telemetry.emit('runner.started'); telemetry.close();
    const events = readTelemetry(directory);
    assert.equal(events.length, 3); assert.equal(events[0].producer.packageVersion, JSON.parse(readFileSync(new URL('../packages/sdlc/package.json', import.meta.url))).version);
    assert.deepEqual(readTelemetry(directory, { stream: telemetry.stream, after: events[0].sequence }), events.slice(1));
    assert.equal(new Set([...events, ...readTelemetry(directory)].map(e => e.id)).size, events.length);
    const settings = JSON.parse(readFileSync(join(directory, 'settings.json'))); settings.retentionDays = 3;
    writeFileSync(join(directory, 'settings.json'), JSON.stringify(settings)); installTelemetry(directory, {});
    assert.equal(JSON.parse(readFileSync(join(directory, 'settings.json'))).retentionDays, 3);
    settings.enabled = false; writeFileSync(join(directory, 'settings.json'), JSON.stringify(settings));
    const disabled = createTelemetry({ directory, component: 'engine-adapter', env: {} });
    assert.equal(disabled.health().status, 'disabled'); disabled.close();
    settings.enabled = true; settings.maxBytes = 16384; writeFileSync(join(directory, 'settings.json'), JSON.stringify(settings));
    const bounded = createTelemetry({ directory, component: 'job-hook', env: {} });
    for (let i = 0; i < 40; i++) bounded.emit('resource.sample');
    assert.ok(bounded.health().bytes <= settings.maxBytes); assert.ok(bounded.health().dropped > 0); bounded.close();
    writeFileSync(join(directory, 'settings.json'), '{}');
    const invalid = createTelemetry({ directory, env: {} });
    assert.equal(invalid.health().status, 'degraded'); assert.equal(invalid.health().errorCode, 'INVALID_SETTINGS'); invalid.close();
    assert.throws(() => readTelemetry(directory, { stream: '../../secret' }), /cursor/);
    assert.throws(() => readTelemetry(directory, { stream: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', after: 5 }), /expired/);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

test('credential and payload fields cannot enter telemetry; identities remain correlated', () => {
  const directory = fixture();
  try {
    const context = telemetryContext({ GITHUB_RUN_ID: '123', GITHUB_RUN_ATTEMPT: '2', GITHUB_JOB: 'agent', RUNNER_NAME: 'test-runner' }, { repository: 'owner/repo', issue: 521, runId: 'b'.repeat(64), stage: 'refine', dispatch: { requestId: 'c'.repeat(64), routerRunId: '122' } });
    const telemetry = createTelemetry({ directory, context });
    telemetry.emit('tool.finished', { tool: 'read', input: 'private source', output: 'secret', prompt: 'private prompt', token: 'password', model: 'sk-secretvalue', durationMs: 25 }); telemetry.close();
    const events = readTelemetry(directory), text = JSON.stringify(events);
    for (const secret of ['private source', 'private prompt', 'password', 'sk-secretvalue', '"output"']) assert.ok(!text.includes(secret));
    assert.equal(events[0].correlation.issue, '521'); assert.equal(events[0].correlation.routerRunId, '122');
    assert.equal(events[0].correlation.sessionId, 'ses_' + 'b'.repeat(64)); assert.equal(events[0].attributes.durationMs, 25);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

test('disabled, capacity, unsafe paths and truncated journals report explicit limitations', () => {
  const directory = fixture();
  try {
    const disabled = createTelemetry({ directory, env: { LIGHTHOUSE_TELEMETRY_DISABLED: 'true' } });
    assert.equal(disabled.health().status, 'disabled'); disabled.close(); assert.equal(readTelemetry(directory).length, 0);
    const bounded = createTelemetry({ directory, maxBytes: 100 }); bounded.emit('runner.started'); bounded.close();
    assert.equal(bounded.health().status, 'degraded'); assert.ok(bounded.health().dropped > 0);
    const writer = createTelemetry({ directory }); const first = writer.emit('runner.started');
    writeFileSync(join(directory, writer.stream + '.jsonl'), JSON.stringify(first) + '\n{"unfinished":');
    assert.equal(readTelemetry(directory).length, 1); writer.close();
    const link = directory + '-link'; symlinkSync(directory, link);
    try { assert.equal(createTelemetry({ directory: link }).health().status, 'degraded'); } finally { rmSync(link); }
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

test('native activity strips payloads, preserves timing, deduplicates and reconciles usage', () => {
  const directory = fixture();
  try {
    const telemetry = createTelemetry({ directory }), sink = nativeEventFile(join(directory, 'native.jsonl'));
    const observer = openCodeObserver(sink.write), sessionID = 'ses_test';
    const event = (id, type, data, created) => ({ id, type, data: { sessionID, ...data }, created, durable: { seq: Number(id.slice(4)) } });
    observer(event('evt_1', 'session.step.started', { assistantMessageID: 'msg_1', model: { providerID: 'openai', modelID: 'example' } }, 1000));
    observer(event('evt_2', 'session.tool.input.started', { id: 'tool_1', name: 'read' }, 1100));
    observer(event('evt_3', 'session.tool.called', { id: 'tool_1', input: { secret: 'source-body' } }, 1200));
    const done = event('evt_4', 'session.tool.success', { id: 'tool_1', content: ['source-body'] }, 1400); observer(done); observer(done);
    observer(event('evt_5', 'session.step.ended', { assistantMessageID: 'msg_1', tokens }, 1500));
    sink.close(); collectNativeFile(join(directory, 'native.jsonl'), telemetry)();
    observeCli(telemetry, { type: 'step_finish', part: { id: 'compat', tokens } });
    telemetry.close(); const events = readTelemetry(directory, { stream: telemetry.stream });
    const schema = JSON.parse(readFileSync(new URL('../packages/sdlc/schemas/telemetry-event.schema.json', import.meta.url)));
    for (const event of events) {
      assert.match(event.type, new RegExp(schema.properties.type.pattern));
      for (const key of Object.keys(event.attributes)) assert.ok(key in schema.properties.attributes.properties);
    }
    const result = usageSummary(events);
    assert.equal(result.coverage, 'observed'); assert.equal(result.tokens.inputTokens, 100); assert.equal(result.toolCalls, 1);
    assert.equal(events.find(e => e.type === 'session.tool.success').attributes.durationMs, 200);
    assert.ok(!JSON.stringify(events).includes('source-body')); assert.equal(result.actualBilledCost, null);
    assert.equal(usageSummary(events.filter(e => e.type !== 'session.step.ended')).coverage, 'incomplete');
    assert.equal(usageSummary(events, { health: [{ stream: telemetry.stream, dropped: 1 }] }).coverage, 'incomplete');
    assert.equal(usageSummary([]).tokens.inputTokens, null);
    const capped = nativeEventFile(join(directory, 'capped.jsonl'), { maxBytes: 2048 });
    for (let i = 0; i < 100; i++) capped.write('session.step.started', { status: 'running' });
    capped.close();
    const terminal = JSON.parse(readFileSync(join(directory, 'capped.jsonl'), 'utf8').trim().split('\n').at(-1));
    assert.equal(terminal.type, 'collection.native-stopped'); assert.ok(terminal.attributes.omittedEvents > 0);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

test('OTLP receiver outage retains replay checkpoint; recovery and rerun do not inflate acknowledged events', async () => {
  const directory = fixture(), received = []; let fail = true;
  const server = createServer(async (req, res) => { let body = ''; for await (const chunk of req) body += chunk; if (fail) { res.writeHead(503); res.end(); return; } received.push(JSON.parse(body)); res.end('{}'); });
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  const endpoint = `http://127.0.0.1:${server.address().port}/v1/logs`;
  try {
    const telemetry = createTelemetry({ directory }); telemetry.emit('runner.started'); telemetry.close();
    const failed = await exportTelemetry(directory, { endpoint }); assert.equal(failed.status, 'degraded'); assert.equal(failed.backlog, 2);
    fail = false;
    assert.equal((await exportTelemetry(directory, { endpoint })).exported, 2);
    assert.equal((await exportTelemetry(directory, { endpoint })).exported, 0);
    const logs = received.flatMap(b => b.resourceLogs.flatMap(r => r.scopeLogs.flatMap(s => s.logRecords)));
    assert.equal(logs.length, 2); assert.match(logs[0].traceId, /^[a-f0-9]{32}$/);
    assert.equal(JSON.parse(logs[0].body.stringValue).type, 'runner.started');
    await assert.rejects(exportTelemetry(directory, { endpoint: 'http://user:password@localhost/v1/logs' }));
  } finally { server.closeAllConnections(); await new Promise(r => server.close(r)); rmSync(directory, { recursive: true, force: true }); }
});

test('runner starts collecting before a command and preserves failing hook behavior', async () => {
  const directory = fixture();
  try {
    const env = { ...process.env, LIGHTHOUSE_TELEMETRY_DIR: directory, RUNNER_NAME: 'test-runner', GITHUB_RUN_ID: '10', GITHUB_RUN_ATTEMPT: '1' };
    const code = await runRunner([process.execPath, '-e', 'process.exit(0)'], env); assert.equal(code, 0);
    const events = readTelemetry(directory); assert.equal(events[0].type, 'runner.started'); assert.ok(events.some(e => e.type === 'runner.stopped'));
    assert.equal(jobHook('started', { ...env, LIGHTHOUSE_TELEMETRY_START_HOOK: '/bin/false' }), 1);
    assert.ok(readTelemetry(directory).some(e => e.type === 'job.host-wait.ended' && e.attributes.exitCode === 1));
    assert.ok(telemetryHealth(directory).every(h => h.active === false));
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

test('retention expires completed cursors while preserving active producers and bounded error state', () => {
  const directory = fixture();
  try {
    const first = createTelemetry({ directory, maxStreams: 1 }); first.emit('runner.started'); first.close();
    const second = createTelemetry({ directory, maxStreams: 1 }); assert.equal(second.health().retiredStreams, 1);
    assert.throws(() => readTelemetry(directory, { stream: first.stream, after: 1 }), /expired/);
    const denied = createTelemetry({ directory, maxStreams: 1 }); denied.emit('runner.started'); denied.close();
    assert.equal(denied.health().errorCode, 'RETENTION_CAPACITY'); assert.ok(telemetryHealth(directory).some(h => h.errorCode === 'RETENTION_CAPACITY'));
    second.close();
    for (let i = 0; i < 4; i++) {
      const disabled = createTelemetry({ directory, maxStreams: 1, env: { LIGHTHOUSE_TELEMETRY_DISABLED: 'true' } });
      assert.equal(disabled.health().status, 'disabled'); disabled.close();
    }
    assert.equal(telemetryHealth(directory).filter(h => h.status === 'disabled').length, 1);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

test('forge observation retains source signals and skipped jobs without inventing a worker', async () => {
  const directory = fixture();
  try {
    const event = join(directory, 'event.json'); writeFileSync(event, JSON.stringify({ action: 'labeled', label: { name: 'refine' }, issue: { number: 521, body: 'private prose' } }));
    const env = { LIGHTHOUSE_TELEMETRY_DIR: directory, GITHUB_EVENT_PATH: event, GITHUB_EVENT_NAME: 'issues', GITHUB_REPOSITORY: 'owner/repo', GITHUB_RUN_ID: '42', GITHUB_RUN_ATTEMPT: '1', GH_TOKEN: 'private-token' };
    await workflowTelemetry(env, async () => new Response(JSON.stringify({ total_count: 2, jobs: [{ id: 56, conclusion: 'success', status: 'completed', created_at: '2026-11-07T06:00:00Z', started_at: '2026-11-07T06:00:05Z', completed_at: '2026-11-07T06:00:10Z', runner_name: 'test-runner' }, { id: 55, conclusion: 'skipped', status: 'completed', started_at: null, completed_at: null, runner_name: null }] })));
    const events = readTelemetry(directory); assert.ok(events.some(e => e.type === 'signal.received' && e.attributes.label === 'refine'));
    const job = events.find(e => e.type === 'workflow.job.observed' && e.correlation.job === '55'); assert.equal(job.attributes.status, 'skipped'); assert.equal(job.attributes.queueDurationMs, null);
    const completed = events.find(e => e.correlation.job === '56'); assert.equal(completed.attributes.queueDurationMs, 5000); assert.equal(completed.attributes.durationMs, 5000); assert.equal(job.correlation.runner, null);
    assert.ok(!events.some(e => e.type === 'execution.admitted')); assert.ok(!JSON.stringify(events).includes('private'));
  } finally { rmSync(directory, { recursive: true, force: true }); }
});
