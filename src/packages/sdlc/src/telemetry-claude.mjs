import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { createTelemetry, readTelemetry, telemetryContext, telemetryDirectory } from './telemetry.mjs';

const hash = value => createHash('sha256').update(value).digest('hex');
const valueOf = item => item?.stringValue ?? item?.intValue ?? item?.doubleValue ?? item?.boolValue ?? null;
const numberOf = point => {
  const value = point?.asDouble ?? point?.asInt;
  if (typeof value === 'number' && Number.isFinite(value) && value >= 0) return value;
  if (typeof value === 'string' && /^\d+(?:\.\d+)?$/.test(value) && Number.isFinite(Number(value))) return Number(value);
  return null;
};
const timestamp = input => {
  try { const value = BigInt(input); const milliseconds = Number(value / 1000000n); return Number.isSafeInteger(milliseconds) && milliseconds >= 0 && milliseconds < 8640000000000000 ? milliseconds : null; }
  catch { return null; }
};
const fields = values => Object.fromEntries(Object.entries(values).filter(([, value]) => value !== null && value !== undefined));

function attributesOf(items = []) {
  return Object.fromEntries(items.filter(item => typeof item?.key === 'string').map(item => [item.key, valueOf(item.value)]));
}

function metricIdentity(name, point, attributes) {
  return hash(JSON.stringify([name, point.startTimeUnixNano ?? null, point.timeUnixNano ?? null, attributes, point.asDouble ?? point.asInt ?? null]));
}

function mapMetric(metric, point, resource, telemetry, seen) {
  const attribute = attributesOf(point.attributes);
  const model = typeof attribute.model === 'string' ? attribute.model : null;
  const skill = typeof attribute['skill.name'] === 'string' && attribute['skill.name'] !== 'custom_skill' && attribute['skill.name'] !== 'custom' ? attribute['skill.name'] : null;
  const agent = typeof attribute['agent.name'] === 'string' && attribute['agent.name'] !== 'custom' ? attribute['agent.name'] : null;
  const querySource = typeof attribute.query_source === 'string' ? attribute.query_source : null;
  const repoName = typeof resource['vcs.repository.name'] === 'string' ? resource['vcs.repository.name'] : null;
  const ownerName = typeof resource['vcs.owner.name'] === 'string' ? resource['vcs.owner.name'] : null;
  const repository = repoName && ownerName ? `${ownerName}/${repoName}` : null;
  const identity = typeof attribute['session.id'] === 'string' ? `claude-${hash(attribute['session.id']).slice(0, 24)}` : null;
  const time = timestamp(point.timeUnixNano);
  const sourceId = metricIdentity(metric.name, point, { model, skill, agent, querySource, type: attribute.type ?? null, session: identity, repository });
  if (seen.has(sourceId)) return { accepted: true, emitted: false };
  if (seen.size >= 20000) {
    seen.delete(seen.values().next().value);
    telemetry.emit('collection.gap', { reasonCode: 'claude-dedup-window-rotated' });
  }
  if (repository || identity) telemetry.bind({ repository: repository ?? undefined, sessionId: identity ?? undefined });

  const common = { model, provider: 'anthropic', modelSource: 'runtime-reported', skill, agent, querySource };
  if (metric.name === 'claude_code.token.usage') {
    if (metric.unit !== 'tokens') { telemetry.emit('collection.gap', { reasonCode: 'claude-token-unit-unsupported' }); return { accepted: true, emitted: false }; }
    const tokenType = attribute.type;
    const count = numberOf(point);
    const tokenField = { input: 'inputTokens', output: 'outputTokens', cacheRead: 'cacheReadTokens', cacheCreation: 'cacheWriteTokens' }[tokenType];
    if (!tokenField || count === null) { telemetry.emit('collection.gap', { reasonCode: 'claude-token-datapoint-unsupported' }); return { accepted: true, emitted: false }; }
    const event = telemetry.emit('claude.usage.observed', fields({ ...common, tokenType, [tokenField]: count }), { kind: 'claude-code', id: sourceId, time });
    if (!event) return { accepted: false, emitted: false };
    seen.add(sourceId);
    return { accepted: true, emitted: true };
  }
  if (metric.name === 'claude_code.cost.usage') {
    if (metric.unit !== 'USD') { telemetry.emit('collection.gap', { reasonCode: 'claude-cost-unit-unsupported' }); return { accepted: true, emitted: false }; }
    const costUsd = numberOf(point);
    if (costUsd === null) { telemetry.emit('collection.gap', { reasonCode: 'claude-cost-datapoint-unsupported' }); return { accepted: true, emitted: false }; }
    const event = telemetry.emit('claude.cost.observed', { ...fields(common), costUsd, costSource: 'claude-estimated' }, { kind: 'claude-code', id: sourceId, time });
    if (!event) return { accepted: false, emitted: false };
    seen.add(sourceId);
    return { accepted: true, emitted: true };
  }
  return { accepted: true, emitted: false };
}

export function collectClaudeMetrics(payload, { telemetry, seen = new Set() } = {}) {
  if (!payload || !Array.isArray(payload.resourceMetrics) || !telemetry) throw Error('Invalid Claude OTLP metrics payload');
  let emitted = 0, rejected = 0;
  for (const resourceMetric of payload.resourceMetrics) {
    const resource = attributesOf(resourceMetric.resource?.attributes);
    for (const scope of resourceMetric.scopeMetrics ?? []) for (const metric of scope.metrics ?? []) {
      const points = metric.sum?.dataPoints ?? [];
      for (const point of points) {
        const result = mapMetric(metric, point, resource, telemetry, seen);
        if (!result.accepted) rejected++;
        if (result.emitted) emitted++;
      }
    }
  }
  return { emitted, rejected };
}

export function claudeUsageSummary(events) {
  const records = events.filter(event => event.source?.kind === 'claude-code' && ['claude.usage.observed', 'claude.cost.observed'].includes(event.type));
  const unique = [...new Map(records.map(event => [event.source.id ?? event.id, event])).values()];
  const tokenTotals = { input: 0, output: 0, cacheRead: 0, cacheCreation: 0 };
  const tokenSeen = new Set(), costSamples = [];
  const byModel = {}, bySkill = {};
  for (const event of unique) {
    const { model, skill, tokenType, costUsd } = event.attributes;
    if (event.type === 'claude.usage.observed') {
      const key = { input: 'inputTokens', output: 'outputTokens', cacheRead: 'cacheReadTokens', cacheCreation: 'cacheWriteTokens' }[tokenType];
      const amount = key ? event.attributes[key] : null;
      if (typeof amount === 'number') {
        tokenTotals[tokenType] += amount; tokenSeen.add(tokenType);
        const modelKey = model ?? 'unknown'; byModel[modelKey] ??= { tokens: {} }; byModel[modelKey].tokens[tokenType] = (byModel[modelKey].tokens[tokenType] ?? 0) + amount;
        if (skill) { bySkill[skill] ??= {}; bySkill[skill][tokenType] = (bySkill[skill][tokenType] ?? 0) + amount; }
      }
    } else if (typeof costUsd === 'number') {
      const modelKey = model ?? 'unknown'; byModel[modelKey] ??= { tokens: {} }; byModel[modelKey].estimatedCostUsd = (byModel[modelKey].estimatedCostUsd ?? 0) + costUsd;
      if (skill) bySkill[skill] = { ...bySkill[skill], estimatedCostUsd: (bySkill[skill]?.estimatedCostUsd ?? 0) + costUsd };
      costSamples.push({ model: modelKey, skill, costUsd });
    }
  }
  const totalCost = costSamples.reduce((sum, sample) => sum + sample.costUsd, 0);
  const incomplete = events.some(event => event.type === 'collection.gap' && /^claude-/.test(event.attributes?.reasonCode ?? ''));
  return {
    source: 'claude-code-native-otlp-metrics', coverage: !unique.length ? 'unavailable' : incomplete ? 'incomplete' : 'observed',
    tokens: Object.fromEntries(Object.entries(tokenTotals).map(([key, amount]) => [key, tokenSeen.has(key) ? amount : null])),
    estimatedCostUsd: costSamples.length ? totalCost : null, billedCostUsd: null,
    costCoverage: costSamples.length ? 'source-reported-estimate' : 'unavailable', byModel, bySkill,
  };
}

export function createClaudeMetricsReceiver({ telemetry, seen = new Set(), maxBodyBytes = 1048576 } = {}) {
  const server = createServer((request, response) => {
    if (request.method !== 'POST' || request.url !== '/v1/metrics') { response.writeHead(404).end(); return; }
    const chunks = []; let bytes = 0, overflow = false;
    request.on('data', chunk => { bytes += chunk.length; if (bytes > maxBodyBytes) overflow = true; else chunks.push(chunk); });
    request.on('end', () => {
      if (overflow) { response.writeHead(413).end(); return; }
      try {
        const payload = JSON.parse(Buffer.concat(chunks).toString('utf8'));
        const result = collectClaudeMetrics(payload, { telemetry, seen });
        if (result.rejected) { response.writeHead(503).end(); return; }
        response.writeHead(200, { 'content-type': 'application/json' }).end('{}');
      } catch { response.writeHead(400).end(); }
    });
  });
  return server;
}

export async function runClaudeTelemetry(command, { env = process.env, directory = telemetryDirectory(env) } = {}) {
  if (!command.length) throw Error('A Claude Code command is required');
  const telemetry = createTelemetry({ directory, component: 'claude-code', context: telemetryContext(env, { stage: env.LIGHTHOUSE_CLAUDE_STAGE, issue: env.LIGHTHOUSE_CLAUDE_ISSUE, runId: env.LIGHTHOUSE_CLAUDE_RUN_ID }), env });
  const seen = new Set(readTelemetry(directory).filter(event => event.source?.kind === 'claude-code' && event.source.id).slice(-20000).map(event => event.source.id));
  const server = createClaudeMetricsReceiver({ telemetry, seen });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  const { port } = server.address();
  const childEnv = { ...env,
    CLAUDE_CODE_ENABLE_TELEMETRY: '1', OTEL_METRICS_EXPORTER: 'otlp', OTEL_LOGS_EXPORTER: 'none', OTEL_TRACES_EXPORTER: 'none',
    OTEL_EXPORTER_OTLP_METRICS_PROTOCOL: 'http/json', OTEL_EXPORTER_OTLP_METRICS_TEMPORALITY_PREFERENCE: 'delta',
    OTEL_EXPORTER_OTLP_METRICS_ENDPOINT: `http://127.0.0.1:${port}/v1/metrics`, OTEL_METRICS_INCLUDE_SESSION_ID: env.LIGHTHOUSE_CLAUDE_INCLUDE_SESSION_ID === 'true' ? 'true' : 'false',
    OTEL_METRICS_INCLUDE_ACCOUNT_UUID: 'false', OTEL_METRICS_INCLUDE_REPOSITORY: env.LIGHTHOUSE_CLAUDE_INCLUDE_REPOSITORY === 'true' ? 'true' : 'false',
    OTEL_LOG_TOOL_DETAILS: '1', OTEL_LOG_USER_PROMPTS: '0', OTEL_LOG_ASSISTANT_RESPONSES: '0', OTEL_LOG_TOOL_CONTENT: '0', OTEL_LOG_RAW_API_BODIES: '0',
  };
  delete childEnv.OTEL_EXPORTER_OTLP_HEADERS; delete childEnv.OTEL_EXPORTER_OTLP_METRICS_HEADERS; delete childEnv.OTEL_EXPORTER_OTLP_ENDPOINT;
  const child = spawn(command[0], command.slice(1), { env: childEnv, stdio: 'inherit' });
  const result = await new Promise(resolve => { child.once('error', () => resolve(127)); child.once('close', code => resolve(code ?? 1)); });
  await new Promise(resolve => server.close(resolve)); telemetry.close(result === 0 ? 'completed' : 'failed');
  return result;
}
