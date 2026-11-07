// Independent demonstration consumer: only the public OTLP/JSON event contract is used.
import { createServer } from 'node:http';
import { appendFileSync, existsSync, readFileSync } from 'node:fs';

const path = process.env.TELEMETRY_RECEIVER_FILE ?? '/data/events.jsonl';
const events = existsSync(path) ? readFileSync(path, 'utf8').trim().split('\n').filter(Boolean).map(line => JSON.parse(line)) : [];
const ids = new Set(events.map(e => e.id)); let reject = false;
const server = createServer(async (req, res) => {
  res.setHeader('content-type', 'application/json');
  if (req.method === 'GET') { res.end(JSON.stringify({ count: events.length, types: [...new Set(events.map(e => e.type))], events: events.slice(Number(new URL(req.url, 'http://consumer').searchParams.get('after') ?? 0)) })); return; }
  if (req.url === '/reject') { reject = true; res.end('{}'); return; }
  if (req.url === '/accept') { reject = false; res.end('{}'); return; }
  if (req.url !== '/v1/logs' || reject) { res.writeHead(503); res.end('{}'); return; }
  try {
    let body = ''; for await (const chunk of req) { body += chunk; if (body.length > 2 * 1024 * 1024) throw Error('Bound exceeded'); }
    const payload = JSON.parse(body);
    for (const resource of payload.resourceLogs ?? []) for (const scope of resource.scopeLogs ?? []) for (const log of scope.logRecords ?? []) {
      const event = JSON.parse(log.body.stringValue);
      if (event.schemaVersion !== 1 || !/^[a-f0-9]{64}$/.test(event.id)) throw Error('Invalid contract');
      if (!ids.has(event.id)) { appendFileSync(path, JSON.stringify(event) + '\n'); events.push(event); ids.add(event.id); }
    }
    res.end('{}');
  } catch { res.writeHead(400); res.end('{}'); }
});
server.listen(Number(process.env.PORT ?? 4318), '0.0.0.0');
process.on('SIGTERM', () => server.close(() => process.exit(0)));
