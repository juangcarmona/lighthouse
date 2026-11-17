import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { compositionFixture, hash } from './fixtures/product-composition.mjs';
import { productWorkingContext } from '../packages/sdlc/src/product-context.mjs';

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
    context.issue.ownerAnswers = [{ body: 'Synthetic decision λ😀: preserve every original obligation; status unapproved.\r\n'.repeat(3600) }];
    const raw = JSON.stringify(context), auditSha256 = hash(raw);
    assert.equal(raw.split('\n').length, 1);
    assert.ok(raw.length > 2000);
    const historyIndex = productWorkingContext(context, auditSha256).productChange.historyIndex;
    assert.ok(historyIndex);
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
    const chunks = [], answer = historyIndex.answers[0], bytes = Buffer.from(context.issue.ownerAnswers[0].body);
    for (let offset = 0; offset < bytes.length;) {
      chunks.push({ jsonrpc: '2.0', id: 10 + chunks.length, method: 'tools/call', params: { name: 'inspect', arguments: { history: { binding: historyIndex.binding, auditSha256, answer, offset, limit: 1024 } }, _meta: { progressToken: 'synthetic-package' } } });
      let end = Math.min(offset + 1024, bytes.length);
      while (end < bytes.length && (bytes[end] & 0xc0) === 0x80) end--;
      offset = end;
    }
    const input = [
      { jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'inspect', arguments: {}, _meta: { progressToken: 'synthetic-catalog' } } },
      { jsonrpc: '2.0', id: 2, method: 'tools/call', params: { name: 'compose', arguments: { binding: { runId: context.request.runId, taskDigest: context.request.taskDigest, ...draft.binding }, plan, envelope }, _meta: { progressToken: 0 } } },
      ...chunks,
      { jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: 'inspect', arguments: { reference: { path: files[3].path, source: 'issue.body#json-0', sha256: hash(files[3].content) } } } },
      { jsonrpc: '2.0', id: 4, method: 'tools/call', params: { name: 'inspect', arguments: {}, unsupported: true } },
      { jsonrpc: '2.0', id: 5, method: 'tools/call', params: { name: 'inspect', arguments: { history: { binding: historyIndex.binding, auditSha256, answer: { ...answer, bytes: answer.bytes + 1 }, offset: 0, limit: 1024 } } } },
    ].map(message => JSON.stringify(message)).join('\n') + '\n';
    const run = spawnSync(process.execPath, ['consumer.mjs'], { cwd: root, input, encoding: 'utf8', env: { PATH: process.env.PATH } });
    assert.equal(run.status, 0, run.stderr);
    const replies = run.stdout.trim().split('\n').map(JSON.parse);
    assert.equal(JSON.parse(replies[0].result.content[0].text).measured.objects, 64);
    assert.equal(JSON.parse(replies[1].result.content[0].text).bytes, 276 * 1024);
    let reconstructed = '';
    for (const [i, response] of replies.slice(2, 2 + chunks.length).entries()) {
      const chunk = JSON.parse(response.result.content[0].text);
      assert.equal(chunk.offset, chunks[i].params.arguments.history.offset);
      assert.equal(chunk.bytes, Buffer.byteLength(chunk.content));
      assert.ok(chunk.bytes <= 1024);
      assert.equal(chunk.sha256, hash(chunk.content));
      assert.equal(chunk.nextOffset, i + 1 === chunks.length ? null : chunks[i + 1].params.arguments.history.offset);
      reconstructed += chunk.content;
    }
    assert.equal(reconstructed, context.issue.ownerAnswers[0].body);
    assert.equal(hash(reconstructed), answer.sha256);
    assert.equal(Buffer.byteLength(reconstructed), answer.bytes);
    assert.equal(JSON.parse(replies.at(-3).result.content[0].text).content, files[3].content);
    assert.ok(replies.at(-2).error);
    assert.ok(replies.at(-1).error);
    assert.equal(await readFile(join(root, 'context.json'), 'utf8'), raw);
    assert.deepEqual(JSON.parse(await readFile(join(output, 'envelope.json'), 'utf8')).result.output.productChange.files, files);
  } finally { await rm(root, { recursive: true, force: true }); }
});
