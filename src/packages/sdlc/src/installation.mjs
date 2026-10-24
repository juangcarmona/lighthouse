import { readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const installed = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8'));
const control = JSON.parse(await readFile(resolve(process.cwd(), '.lighthouse/sdlc.json'), 'utf8'));
if (control.package?.name !== installed.name || control.package?.version !== installed.version) {
  throw new Error(`Installed ${installed.name}@${installed.version} does not match .lighthouse/sdlc.json; reconcile the locked adoption before execution.`);
}
console.log(JSON.stringify({ name: installed.name, version: installed.version, root }));
