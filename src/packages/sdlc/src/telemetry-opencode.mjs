import { appendFileSync, mkdirSync, readFileSync, statSync } from 'node:fs';
import { dirname } from 'node:path';
import { metadata } from './telemetry.mjs';

export function tokenMetadata(tokens) {
  return { inputTokens: tokens?.input ?? null, outputTokens: tokens?.output ?? null, reasoningTokens: tokens?.reasoning ?? null, cacheReadTokens: tokens?.cache?.read ?? null, cacheWriteTokens: tokens?.cache?.write ?? null };
}

export function openCodeObserver(emit) {
  const tools = new Map(), steps = new Map(), seen = new Set();
  return event => {
    if (!event || typeof event.type !== 'string' || seen.has(event.id)) return;
    if (event.id) { if (seen.size >= 20000) { emit('collection.gap', { reasonCode: 'observer-capacity' }); return; } seen.add(event.id); }
    const data = event.data ?? {}, time = event.created ?? Date.now(), tool = tools.get(data.id);
    const source = { kind: 'opencode', id: event.id, sequence: event.durable?.seq, time };
    let values = { sessionId: data.sessionID, parentSessionId: data.parentID };
    const send = (type, fields = {}) => emit(type, metadata(fields), source, values);
    if (event.type === 'session.tool.input.started') tools.set(data.id, { name: data.name, started: time });
    if (event.type === 'session.tool.called') {
      if (tool) tool.started = time;
      send(event.type, { tool: tool?.name, callId: data.id, messageId: data.assistantMessageID, status: 'running' });
    } else if (['session.tool.success', 'session.tool.failed'].includes(event.type)) {
      send(event.type, { tool: tool?.name, callId: data.id, messageId: data.assistantMessageID, status: event.type.endsWith('success') ? 'completed' : 'failed', durationMs: tool ? time - tool.started : null }); tools.delete(data.id);
    } else if (event.type === 'session.step.started') {
      steps.set(data.assistantMessageID, { started: data.started ?? time, model: data.model });
      send(event.type, { model: data.model?.modelID, provider: data.model?.providerID, messageId: data.assistantMessageID, modelSource: 'runtime-reported', status: 'running' });
    } else if (['session.step.ended', 'session.step.failed'].includes(event.type)) {
      const step = steps.get(data.assistantMessageID);
      send(event.type, { ...tokenMetadata(data.tokens), messageId: data.assistantMessageID, model: step?.model?.modelID, provider: step?.model?.providerID, durationMs: step ? time - step.started : null, finishReason: data.finish, status: event.type.endsWith('ended') ? 'completed' : 'failed' }); steps.delete(data.assistantMessageID);
    } else if (event.type === 'session.step.streamed') {
      const step = steps.get(data.assistantMessageID);
      send(event.type, { messageId: data.assistantMessageID, durationMs: step ? time - step.started : null });
    } else if (/^session\.(created|deleted|retry\.scheduled|compaction\.(started|ended|failed)|skill\.activated|shell\.(started|ended))$/.test(event.type)) {
      send(event.type, { ...(event.type === 'session.compaction.ended' ? tokenMetadata(data.tokens) : {}), attempt: data.attempt, delayMs: data.at ? Math.max(0, data.at - time) : null, status: event.type.split('.').at(-1) });
    } else if (/^permission\.(asked|replied)$/.test(event.type) || /^session\.(idle|status)$/.test(event.type)) send(event.type, { status: data.status?.type ?? data.reply ?? 'observed' });
  };
}

export function observeCli(telemetry, event) {
  if (!event || !['step_start', 'step_finish', 'tool_use', 'error', 'diagnostic_omitted'].includes(event.type)) return;
  const part = event.part ?? {}, state = part.state ?? {};
  telemetry.emit(`cli.${event.type}`, { ...(event.type === 'step_finish' ? tokenMetadata(part.tokens) : {}), tool: part.tool, callId: part.callID, messageId: part.messageID, status: state.status, durationMs: state.time?.end >= state.time?.start ? state.time.end - state.time.start : null }, { kind: 'opencode-cli', id: part.id, time: event.timestamp });
}

// Payloads are discarded here, inside the runtime, before the host reads any native event.
export function nativeEventFile(path, { maxBytes = 8 * 1024 * 1024 } = {}) {
  let bytes = 0, dropped = 0;
  mkdirSync(dirname(path), { recursive: true });
  const write = (type, attributes, source = {}, correlation = {}, terminal = false) => {
    const safeCorrelation = Object.fromEntries(['sessionId', 'parentSessionId'].filter(k => /^ses_[\w-]{1,128}$/.test(correlation[k] ?? '')).map(k => [k, correlation[k]]));
    const line = JSON.stringify({ type, attributes: metadata(attributes), source, correlation: safeCorrelation }) + '\n';
    // Reserve space for the final omission count even after the event buffer fills.
    if (bytes + Buffer.byteLength(line) > maxBytes - (terminal ? 0 : 1024)) { dropped++; return; }
    try { appendFileSync(path, line, { mode: 0o644 }); bytes += Buffer.byteLength(line); } catch { dropped++; }
  };
  return { write, close() { write('collection.native-stopped', { omittedEvents: dropped, status: dropped ? 'incomplete' : 'completed' }, {}, {}, true); } };
}

export function collectNativeFile(path, telemetry) {
  let offset = 0;
  return () => {
    try {
      if (statSync(path).size > 8 * 1024 * 1024) { telemetry.emit('collection.gap', { reasonCode: 'native-file-capacity' }); return; }
      const content = readFileSync(path, 'utf8'), end = content.lastIndexOf('\n') + 1;
      for (const line of content.slice(offset, end).split('\n').filter(Boolean)) {
        try { const event = JSON.parse(line); telemetry.bind(event.correlation ?? {}); telemetry.emit(event.type, event.attributes, event.source); }
        catch { telemetry.emit('collection.gap', { reasonCode: 'invalid-native-event' }); }
      }
      offset = end;
    } catch (error) { if (error.code !== 'ENOENT') telemetry.emit('collection.gap', { reasonCode: 'native-file-unavailable' }); }
  };
}

export function usageSummary(events, { health = [] } = {}) {
  const unique = [...new Map(events.map(e => [e.source?.id ? `${e.source.kind}:${e.source.id}` : e.id, e])).values()];
  const native = unique.some(e => e.type === 'session.step.started'), selected = unique.filter(e => native ? e.type.startsWith('session.') : e.type.startsWith('cli.'));
  const started = selected.filter(e => e.type === (native ? 'session.step.started' : 'cli.step_start')).length;
  const finished = selected.filter(e => [native ? 'session.step.ended' : 'cli.step_finish', 'session.step.failed'].includes(e.type));
  const fields = ['inputTokens', 'outputTokens', 'reasoningTokens', 'cacheReadTokens', 'cacheWriteTokens'];
  const streams = new Set(events.map(e => e.stream));
  const lost = health.some(h => streams.has(h.stream) && (h.dropped > 0 || h.status === 'degraded'));
  const coverage = started > 0 && started === finished.length && !lost && !unique.some(e => ['collection.gap', 'cli.diagnostic_omitted'].includes(e.type) || e.attributes?.omittedEvents > 0) ? 'observed' : started ? 'incomplete' : 'unavailable';
  return { schemaVersion: 1, source: native ? 'opencode-native' : 'opencode-cli', coverage, stepStarts: started, stepFinishes: finished.length, tokens: Object.fromEntries(fields.map(key => [key, finished.length && finished.every(e => typeof e.attributes[key] === 'number') ? finished.reduce((sum, e) => sum + e.attributes[key], 0) : null])), actualBilledCost: null, toolCalls: selected.filter(e => ['session.tool.success', 'session.tool.failed', 'cli.tool_use'].includes(e.type)).length };
}
