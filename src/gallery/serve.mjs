import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const args = process.argv.slice(2);
const option = (name, fallback) => args.includes(name) ? args[args.indexOf(name) + 1] : fallback;
const host = option('--host', '127.0.0.1');
const port = Number(option('--port', '4173'));
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Use a port between 1 and 65535.');
const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png' };

createServer(async (request, response) => {
  try {
    const url = new URL(request.url, 'http://gallery');
    let path = decodeURIComponent(url.pathname);
    if (path === '/') { response.writeHead(302, { Location: '/gallery/' }); response.end(); return; }
    if (path.endsWith('/')) path += 'index.html';
    const publicRoots = [
      ['/gallery/', 'src/gallery/'],
      ['/packages/ui/', 'src/packages/ui/'],
      ['/assets/', 'assets/']
    ];
    const entry = publicRoots.find(([prefix]) => path.startsWith(prefix));
    const target = entry ? resolve(root, entry[1], path.slice(entry[0].length)) : null;
    const allowed = publicRoots.map(([, folder]) => resolve(root, folder) + sep);
    if (!target || !allowed.some((prefix) => target.startsWith(prefix)) || !types[extname(target)]) {
      response.writeHead(404); response.end('Not found'); return;
    }
    const body = await readFile(target);
    response.writeHead(200, { 'Content-Type': `${types[extname(target)]}; charset=utf-8`, 'Cache-Control': 'no-store' });
    response.end(body);
  } catch { response.writeHead(404); response.end('Not found'); }
}).listen(port, host, () => process.stdout.write(`Lighthouse gallery: http://${host}:${port}/gallery/\n`));
