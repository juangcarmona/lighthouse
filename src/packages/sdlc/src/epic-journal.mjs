import { writeFile } from 'node:fs/promises';
import { isDeepStrictEqual } from 'node:util';
import { issueComments } from './stage-dispatch.mjs';
import { readActionsJson } from './actions-artifact.mjs';
import { epicCorrelation, epicJournalKey } from './epic-github.mjs';

const marker = '<!-- lighthouse-epic-journal:';
const positive = value => Number.isSafeInteger(Number(value)) && /^[1-9][0-9]*$/.test(String(value));
const sha = value => /^[a-f0-9]{40}$/.test(value ?? '');
const keyFor = epicJournalKey;
const artifactName = (parent, attempt) => `lighthouse-epic-journal-${parent}-${attempt}`;

function checkedReceipt(key, receipt, repository, parent) {
  if (!receipt || receipt.schemaVersion !== 1 || !['intent', 'created', 'linked', 'cancelled', 'merging', 'accepted'].includes(receipt.state) || !isDeepStrictEqual(receipt.correlation, epicCorrelation(receipt.correlation)) || receipt.correlation.repository !== repository || receipt.correlation.parent !== parent || keyFor(receipt.correlation) !== key) throw Error('Invalid epic journal receipt');
  const resource = receipt.resource;
  if (receipt.state === 'intent' && resource !== undefined || ['created', 'linked', 'merging', 'accepted'].includes(receipt.state) && !resource || resource !== undefined && (!positive(resource.id) || !positive(resource.number) || Object.keys(resource).sort().join(',') !== 'id,number')) throw Error('Epic receipt resource is invalid');
  const publication = receipt.publication;
  const needsPublication = receipt.correlation.kind === 'pull-request' && (['created', 'linked', 'merging', 'accepted'].includes(receipt.state) || receipt.state === 'cancelled' && !!resource);
  if (needsPublication && (!publication || !positive(publication.run) || !Number.isSafeInteger(publication.attempt) || publication.attempt < 1 || !sha(publication.head) || Object.keys(publication).sort().join(',') !== 'attempt,head,run') || !needsPublication && publication !== undefined) throw Error('Epic publication receipt is invalid');
  const merge = receipt.merge, merging = ['merging', 'accepted'].includes(receipt.state);
  if (merging && (receipt.correlation.kind !== 'pull-request' || !merge || !sha(merge.head) || merge.head !== publication.head || !sha(merge.base) || !sha(merge.candidate) || !Number.isSafeInteger(merge.review) || merge.review < 1 || receipt.state === 'accepted' && !sha(merge.commit) || Object.keys(merge).sort().join(',') !== (receipt.state === 'accepted' ? 'base,candidate,commit,head,review' : 'base,candidate,head,review')) || !merging && merge !== undefined) throw Error('Epic merge receipt is invalid');
  const readiness = receipt.readiness;
  if (readiness !== undefined && (receipt.correlation.kind !== 'aggregate' || receipt.state !== 'linked' || !readiness || !sha(readiness.head) || !sha(readiness.base) || !sha(readiness.candidate) || Object.keys(readiness).sort().join(',') !== 'base,candidate,head')) throw Error('Epic aggregate readiness receipt is invalid');
  const expected = ['correlation', ...(merge ? ['merge'] : []), ...(publication ? ['publication'] : []), ...(readiness ? ['readiness'] : []), ...(resource ? ['resource'] : []), 'schemaVersion', 'state'].sort().join(',');
  if (Object.keys(receipt).sort().join(',') !== expected) throw Error('Epic receipt has unexpected fields');
  return receipt;
}

function parseEntry(comment, repository, parent) {
  if (comment.user?.login !== 'github-actions[bot]' || comment.user.type !== 'Bot' || comment.issue_url !== `https://api.github.com/repos/${repository}/issues/${parent}` || !positive(comment.id)) throw Error('Untrusted epic journal comment');
  const matches = [...(comment.body ?? '').matchAll(/<!-- lighthouse-epic-journal:(\{[^\n]*\}) -->/g)];
  if (matches.length !== 1) throw Error('Missing or ambiguous epic journal marker');
  const value = JSON.parse(matches[0][1]);
  if (Object.keys(value).sort().join(',') !== 'attempt,key,parent,receipt,repository,revision,runId,schemaVersion' || value.schemaVersion !== 1 || value.repository !== repository || value.parent !== parent || !positive(value.runId) || !Number.isSafeInteger(value.attempt) || value.attempt < 1 || !sha(value.revision) || typeof value.key !== 'string') throw Error('Invalid epic journal identity');
  checkedReceipt(value.key, value.receipt, repository, parent);
  return value;
}

// The marker identifies a candidate; only the owner-triggered run and its retained artifact authenticate it.
export async function readEpicResourceReceipt({ api, repository, owner, correlation, sourceRevision, defaultBranch, resource, allowedStates = ['linked'], readArtifact = readActionsJson }) {
  if (!isDeepStrictEqual(correlation, epicCorrelation(correlation)) || correlation.repository !== repository || !sha(sourceRevision) || !defaultBranch || resource && (!positive(resource.id) || !positive(resource.number)) || !Array.isArray(allowedStates) || !allowedStates.length || allowedStates.some(state => !['linked', 'accepted'].includes(state))) throw Error('Invalid epic resource admission');
  const parent = correlation.parent, key = keyFor(correlation);
  const comments = await issueComments(api, parent);
  const candidates = comments.filter(c => c.user?.login === 'github-actions[bot]' && c.user.type === 'Bot' && c.body?.includes(marker)).map(c => ({ comment: c, entry: parseEntry(c, repository, parent) })).filter(item => item.entry.key === key);
  if (candidates.length !== 1) throw Error('Epic resource journal is missing or ambiguous');
  const { comment, entry } = candidates[0], receipt = entry.receipt;
  if (entry.revision !== sourceRevision || !allowedStates.includes(receipt.state) || !isDeepStrictEqual(receipt.correlation, correlation) || resource && !isDeepStrictEqual(receipt.resource, resource)) throw Error('Epic resource receipt does not match the current identity');
  const origin = await api(`actions/runs/${entry.runId}/attempts/${entry.attempt}`);
  if (String(origin.id) !== String(entry.runId) || origin.run_attempt !== entry.attempt || origin.path !== '.github/workflows/lighthouse-sdlc-epic.yml' || origin.event !== 'workflow_dispatch' || origin.status !== 'completed' || origin.actor?.login !== owner || origin.triggering_actor?.login !== owner || origin.head_sha !== sourceRevision || origin.head_branch !== defaultBranch || origin.repository?.full_name !== repository) throw Error('Epic resource journal origin is not trusted');
  const stored = await readArtifact(api, repository, entry.runId, artifactName(parent, entry.attempt), 'journal.json');
  if (!stored || stored.schemaVersion !== 1 || stored.repository !== repository || stored.parent !== parent || stored.revision !== sourceRevision || String(stored.runId) !== String(entry.runId) || stored.attempt !== entry.attempt || !isDeepStrictEqual(stored.entries?.[key], { commentId: comment.id, receipt })) throw Error('Epic resource journal artifact is missing or differs from its comment');
  return receipt;
}

export async function readEpicChildReceipt(input) {
  if (input.correlation?.kind !== 'child' || !input.resource) throw Error('Invalid epic child admission');
  return readEpicResourceReceipt(input);
}

export async function readEpicAggregateReceipt(input) {
  if (input.correlation?.kind !== 'aggregate' || !input.resource) throw Error('Invalid epic aggregate admission');
  const { api, repository, correlation } = input;
  const comments = await issueComments(api, correlation.parent);
  const matches = comments.filter(c => c.user?.login === 'github-actions[bot]' && c.user.type === 'Bot' && c.body?.includes(marker)).map(c => parseEntry(c, repository, correlation.parent)).filter(entry => entry.key === keyFor(correlation));
  if (matches.length !== 1) throw Error('Epic aggregate journal is missing or ambiguous');
  const sourceRevision = matches[0].revision;
  const receipt = await readEpicResourceReceipt({ ...input, sourceRevision });
  if (!receipt.readiness) throw Error('Epic aggregate has no readiness evidence');
  return { sourceRevision, receipt };
}

export async function createEpicJournal({ api, repository, owner, parent, sourceRevision, defaultBranch, run, path, authorize, readArtifact = readActionsJson }) {
  if (!/^[\w.-]+\/[\w.-]+$/.test(repository ?? '') || typeof owner !== 'string' || !positive(parent) || !sha(sourceRevision) || !defaultBranch || !positive(run?.id) || !Number.isSafeInteger(run?.run_attempt) || run.run_attempt < 1 || run.status !== 'in_progress' || run.path !== '.github/workflows/lighthouse-sdlc-epic.yml' || run.event !== 'workflow_dispatch' || run.actor?.login !== owner || run.triggering_actor?.login !== owner || run.head_sha !== sourceRevision || run.head_branch !== defaultBranch || run.repository?.full_name !== repository || typeof authorize !== 'function' || typeof path !== 'string') throw Error('Epic journal requires an authenticated owner workflow');
  parent = Number(parent);
  const journal = { schemaVersion: 1, repository, parent, revision: sourceRevision, runId: String(run.id), attempt: run.run_attempt, entries: {} };
  const loaded = new Map();
  const save = () => writeFile(path, JSON.stringify(journal));
  await save();
  async function readReceipt(key) {
    const comments = await issueComments(api, parent);
    const candidates = comments.filter(c => c.user?.login === 'github-actions[bot]' && c.user.type === 'Bot' && c.body?.includes(marker)).map(c => ({ comment: c, entry: parseEntry(c, repository, parent) })).filter(item => item.entry.key === key);
    if (candidates.length > 1) throw Error('Duplicate epic journal receipts');
    if (!candidates.length) { loaded.set(key, null); return null; }
    const { comment, entry } = candidates[0];
    if (entry.revision !== sourceRevision) throw Error('Epic journal source changed');
    let stored;
    if (entry.runId === String(run.id) && entry.attempt === run.run_attempt) stored = journal;
    else {
      const origin = await api(`actions/runs/${entry.runId}/attempts/${entry.attempt}`);
      if (String(origin.id) !== String(entry.runId) || origin.run_attempt !== entry.attempt || origin.path !== run.path || origin.event !== 'workflow_dispatch' || origin.status !== 'completed' || origin.actor?.login !== owner || origin.triggering_actor?.login !== owner || origin.head_sha !== sourceRevision || origin.head_branch !== defaultBranch || origin.repository?.full_name !== repository) throw Error('Epic journal origin is not trusted');
      stored = await readArtifact(api, repository, entry.runId, artifactName(parent, entry.attempt), 'journal.json');
    }
    if (!stored || stored.schemaVersion !== 1 || stored.repository !== repository || stored.parent !== parent || stored.revision !== sourceRevision || String(stored.runId) !== String(entry.runId) || stored.attempt !== entry.attempt || !isDeepStrictEqual(stored.entries?.[key], { commentId: comment.id, receipt: entry.receipt })) throw Error('Epic journal artifact is missing or differs from its comment');
    loaded.set(key, { comment, receipt: entry.receipt });
    return entry.receipt;
  }
  async function writeReceipt(key, receipt) {
    checkedReceipt(key, receipt, repository, parent);
    if (!loaded.has(key)) throw Error('Epic journal must be read before writing');
    const previous = loaded.get(key);
    if (previous && (!isDeepStrictEqual(previous.receipt.correlation, receipt.correlation) || previous.receipt.resource && !isDeepStrictEqual(previous.receipt.resource, receipt.resource) || !({ intent: ['created', 'cancelled'], created: ['created', 'linked', 'cancelled'], linked: ['linked', 'merging', 'cancelled'], merging: ['merging', 'accepted'], accepted: ['accepted'], cancelled: ['cancelled'] })[previous.receipt.state].includes(receipt.state))) throw Error('Epic journal transition is invalid');
    if (previous?.receipt.merge) {
      const { commit: ignored, ...identity } = receipt.merge ?? {};
      const { commit: previousCommit, ...prior } = previous.receipt.merge;
      if (!isDeepStrictEqual(identity, prior) || previousCommit && previousCommit !== receipt.merge?.commit || !isDeepStrictEqual(previous.receipt.publication, receipt.publication)) throw Error('Epic merge identity changed');
    }
    if (!previous && receipt.state !== 'intent') throw Error('Epic journal must start with intent');
    if (await authorize() !== true) throw Error('Epic journal authorization changed');
    const entry = { schemaVersion: 1, repository, parent, revision: sourceRevision, runId: String(run.id), attempt: run.run_attempt, key, receipt };
    const body = `${marker}${JSON.stringify(entry).replaceAll('<', '\\u003c').replaceAll('>', '\\u003e')} -->`;
    const comment = previous ? await api(`issues/comments/${previous.comment.id}`, 'PATCH', { body }) : await api(`issues/${parent}/comments`, 'POST', { body });
    if (!isDeepStrictEqual(parseEntry(comment, repository, parent), entry)) throw Error('Epic journal write could not be confirmed');
    journal.entries[key] = { commentId: comment.id, receipt };
    await save();
    loaded.set(key, { comment, receipt });
  }
  return { readReceipt, writeReceipt };
}
