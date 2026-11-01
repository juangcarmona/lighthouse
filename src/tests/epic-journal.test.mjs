import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createEpicJournal } from '../packages/sdlc/src/epic-journal.mjs';
import { epicCorrelation } from '../packages/sdlc/src/epic-github.mjs';

const repository = 'owner/repo', owner = 'owner', parent = 146, revision = 'a'.repeat(40), planDigest = 'b'.repeat(64);
const correlation = epicCorrelation({ repository, parent, slice: 'a', planDigest, base: 'lighthouse/epic-146', dependencies: [] });
const key = `${repository}:${parent}:${planDigest}:a`;
const run = id => ({ id, run_attempt: 1, status: 'in_progress', path: '.github/workflows/lighthouse-sdlc-epic.yml', event: 'workflow_dispatch', actor: { login: owner }, triggering_actor: { login: owner }, head_sha: revision, head_branch: 'main', repository: { full_name: repository } });

async function fixture(t) {
  const dir = await mkdtemp(join(tmpdir(), 'lighthouse-epic-journal-test-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const comments = [], origins = new Map(), artifacts = new Map();
  let authorized = true, loseResponse = false;
  const api = async (path, method = 'GET', body) => {
    if (path.startsWith(`issues/${parent}/comments?`)) return comments;
    if (path === `issues/${parent}/comments` && method === 'POST') { const c = { id: comments.length + 1, user: { login: 'github-actions[bot]', type: 'Bot' }, issue_url: `https://api.github.com/repos/${repository}/issues/${parent}`, body: body.body }; comments.push(c); return structuredClone(c); }
    if (path.startsWith('issues/comments/') && method === 'PATCH') { const c = comments.find(item => item.id === Number(path.split('/')[2])); c.body = body.body; if (loseResponse) throw Error('lost response'); return structuredClone(c); }
    if (path.startsWith('actions/runs/')) return origins.get(path.split('/')[2]);
    throw Error(`Unexpected ${method} ${path}`);
  };
  const readArtifact = async (_api, _repo, id) => artifacts.get(String(id));
  const open = id => createEpicJournal({ api, repository, owner, parent, sourceRevision: revision, defaultBranch: 'main', run: run(id), path: join(dir, `${id}.json`), authorize: async () => authorized, readArtifact });
  const finish = async id => { origins.set(String(id), { ...run(id), status: 'completed' }); artifacts.set(String(id), JSON.parse(await readFile(join(dir, `${id}.json`), 'utf8'))); };
  return { api, comments, origins, artifacts, open, finish, authorize: value => { authorized = value; }, lose: value => { loseResponse = value; } };
}

test('journal binds each transition to a retained authenticated workflow artifact', async t => {
  const f = await fixture(t), first = await f.open(100);
  assert.equal(await first.readReceipt(key), null);
  const intent = { schemaVersion: 1, state: 'intent', correlation };
  const created = { ...intent, state: 'created', resource: { id: 123, number: 9 } };
  await first.writeReceipt(key, intent);
  await first.writeReceipt(key, created);
  await f.finish(100);
  const second = await f.open(101);
  assert.deepEqual(await second.readReceipt(key), created);
  await second.writeReceipt(key, { ...created, state: 'linked' });
  await f.finish(101);
  assert.equal((await (await f.open(102)).readReceipt(key)).state, 'linked');
  f.artifacts.get('101').entries[key].receipt.resource.id = 456;
  await assert.rejects((await f.open(103)).readReceipt(key), /artifact is missing or differs/);
});

test('uncertain or forged journal writes never authorize another transition', async t => {
  const f = await fixture(t), journal = await f.open(100);
  await assert.rejects(journal.writeReceipt(key, { schemaVersion: 1, state: 'intent', correlation }), /must be read/);
  await journal.readReceipt(key);
  f.authorize(false);
  await assert.rejects(journal.writeReceipt(key, { schemaVersion: 1, state: 'intent', correlation }), /authorization changed/);
  f.authorize(true);
  const intent = { schemaVersion: 1, state: 'intent', correlation };
  await journal.writeReceipt(key, intent);
  await f.finish(100);
  f.lose(true);
  await assert.rejects(journal.writeReceipt(key, { ...intent, state: 'created', resource: { id: 123, number: 9 } }), /lost response/);
  await assert.rejects((await f.open(101)).readReceipt(key), /artifact is missing or differs/);
});

test('a copied, duplicate or untrusted workflow journal is rejected', async t => {
  const f = await fixture(t), journal = await f.open(100);
  await journal.readReceipt(key);
  await journal.writeReceipt(key, { schemaVersion: 1, state: 'intent', correlation });
  await f.finish(100);
  f.comments.push({ ...f.comments[0], id: 2 });
  await assert.rejects((await f.open(101)).readReceipt(key), /Duplicate/);
  f.comments.pop(); f.origins.get('100').actor.login = 'other';
  await assert.rejects((await f.open(102)).readReceipt(key), /origin is not trusted/);
});
