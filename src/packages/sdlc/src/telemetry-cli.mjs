import { existsSync, readFileSync } from 'node:fs';
import { setTimeout as pause } from 'node:timers/promises';
import { createTelemetry, readTelemetry, telemetryDirectory, telemetryHealth, exportTelemetry } from './telemetry.mjs';
import { usageSummary } from './telemetry-opencode.mjs';
import { installTelemetry } from './telemetry-runner.mjs';

export async function telemetryCli(args, env = process.env) {
  const [command] = args, option = name => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };
  const directory = option('--directory') ?? telemetryDirectory(env);
  const print = value => process.stdout.write(JSON.stringify(value) + '\n');
  if (command === 'install') {
    const config = installTelemetry(directory, env), telemetry = createTelemetry({ ...config, component: 'installation' });
    telemetry.emit('installation.ready', { status: 'installed' }); telemetry.close(); print(telemetry.health());
  } else if (command === 'status') {
    const streams = telemetryHealth(directory); print({ schemaVersion: 1, directory, streams, export: existsSync(directory + '/export-health.json') ? JSON.parse(readFileSync(directory + '/export-health.json')) : { status: 'local-only' } });
  } else if (command === 'read') {
    const stream = option('--stream'); let after = Number(option('--after') ?? 0);
    if (args.includes('--follow') && !stream) throw Error('Follow requires --stream and its numeric --after cursor');
    do {
      const events = readTelemetry(directory, { stream, after });
      for (const event of events) { print(event); if (stream) after = event.sequence; }
      if (!args.includes('--follow')) break;
      await pause(250);
    } while (true);
  } else if (command === 'usage') print(usageSummary(readTelemetry(directory).filter(e => !option('--run') || e.correlation.runId === option('--run')), { health: telemetryHealth(directory) }));
  else if (command === 'export') {
    const endpoint = option('--endpoint') ?? env.LIGHTHOUSE_TELEMETRY_OTLP_ENDPOINT;
    if (!endpoint) throw Error('Configure an explicit OTLP HTTP JSON /v1/logs endpoint');
    const headers = env.LIGHTHOUSE_TELEMETRY_OTLP_HEADERS ? JSON.parse(env.LIGHTHOUSE_TELEMETRY_OTLP_HEADERS) : {};
    do { print(await exportTelemetry(directory, { endpoint, headers })); if (!args.includes('--follow')) break; await pause(2000); } while (true);
  } else throw Error('Usage: lighthouse-sdlc telemetry <install|status|read|usage|export> [--directory <operator-state>] [--stream <id> --after <sequence> --follow]');
}
