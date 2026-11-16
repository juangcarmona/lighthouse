import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { compositionFixture, hash } from './fixtures/product-composition.mjs';

test('packed composition server invokes inspect and compose through stdio without ambient dependencies (not native-engine qualification)', async () => {
  const root = await mkdtemp(join(tmpdir(), 'composition-package-'));
  try {
    const packed = spawnSync('npm', ['pack', '--workspace', '@juangcarmona/lighthouse-sdlc', '--pack-destination', root, '--json'], { encoding: 'utf8' });
    assert.equal(packed.status, 0, packed.stderr);
    const [artifact] = JSON.parse(packed.stdout);
    for (const path of ['src/product-composition.mjs', 'src/product-composition-server.mjs', 'src/product-composition-runtime.mjs', 'src/engine-result-limits.mjs', 'skills/product-change/retained-composition.md']) assert.ok(artifact.files.some(file => file.path === path), path);
    const target = join(root, 'package'); await mkdir(target);
    const unpacked = spawnSync('tar', ['-xzf', join(root, artifact.filename), '--strip-components=1', '-C', target]);
    assert.equal(unpacked.status, 0);
    const { context, envelope, files, draft } = compositionFixture();
    await writeFile(join(root, 'context.json'), JSON.stringify(context));
    const output = join(root, 'output'); await mkdir(output);
    await writeFile(join(root, 'consumer.mjs'), `
import assert from 'node:assert/strict';
import { compositionService, runCompositionServer } from './package/src/product-composition-server.mjs';
import { configureProductCompositionWorker } from './package/src/product-composition-runtime.mjs';
globalThis.fetch = () => { throw Error('Network forbidden'); };
const config=configureProductCompositionWorker({permissions:[],policies:[]});
assert.equal(config.mcp.servers.productcomposition.codemode,false);
const service=compositionService('./context.json','./output');
await runCompositionServer(process.stdin,process.stdout,service);
`);
    // The caller selects references from its admitted input, not a generated copy of content.
    const plan = files.map(file => ({ path: file.path, selected: { source: 'issue.body#json-0', sha256: hash(file.content) }, omitted: [] }));
    const input = [
      { jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'inspect', arguments: {} } },
      { jsonrpc: '2.0', id: 2, method: 'tools/call', params: { name: 'compose', arguments: { binding: { runId: context.request.runId, taskDigest: context.request.taskDigest, ...draft.binding }, plan, envelope } } },
    ].map(message => JSON.stringify(message)).join('\n') + '\n';
    const run = spawnSync(process.execPath, ['consumer.mjs'], { cwd: root, input, encoding: 'utf8', env: { PATH: process.env.PATH } });
    assert.equal(run.status, 0, run.stderr);
    const replies = run.stdout.trim().split('\n').map(JSON.parse);
    assert.equal(JSON.parse(replies[0].result.content[0].text).measured.objects, 64);
    assert.equal(JSON.parse(replies[1].result.content[0].text).bytes, 276 * 1024);
    assert.deepEqual(JSON.parse(await readFile(join(output, 'envelope.json'), 'utf8')).result.output.productChange.files, files);
  } finally { await rm(root, { recursive: true, force: true }); }
});
