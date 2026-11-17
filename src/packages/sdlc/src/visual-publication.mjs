import { createHash } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import { loadProfile, evidenceProtection } from './completion-state.mjs';
import { readVisualFile, validatePng, validateVisualEvidence } from './visual-evidence.mjs';
import { validatePublishable } from './process-publication.mjs';

const digest = value => createHash('sha256').update(value).digest('hex');
const blob = bytes => createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
const escape = value => value.replace(/[\\`*_{}\[\]<>()!|#]/g, char => `\\${char}`).replace(/[\r\n]/g, ' ');

export async function publishVisualEvidence(api, request, envelope, directory, { candidateTree = null, beforeWrite = async () => {} } = {}) {
  const assessment = envelope.result.output?.visualEvidence;
  if (!assessment || assessment.status !== 'provided') return null;
  const errors = validateVisualEvidence(assessment, request);
  if (errors.length) throw Error(errors.join('\n'));
  const receipt = JSON.parse(await readVisualFile(directory, 'visual-evidence.json', 32000));
  if (receipt.schemaVersion !== 1 || receipt.repository !== request.repository || receipt.issue !== request.issue || receipt.runId !== request.runId || receipt.workflowRunId !== String(request.workflowRunId) || receipt.attempt !== Number(request.attempt) || receipt.stage !== request.stage || receipt.sourceRevision !== request.sourceRevision || receipt.candidateTree !== candidateTree || receipt.assessmentSha256 !== digest(JSON.stringify(assessment)) || receipt.items?.length !== assessment.items.length) throw Error('Visual evidence does not bind this request and candidate');
  if (!/^[a-f0-9]{40}$/.test(request.sourceRevision) || request.stage === 'implement' && !/^[a-f0-9]{40}$/.test(candidateTree ?? '') || !Number.isSafeInteger(request.issue) || request.issue < 1 || !/^[1-9]\d*$/.test(String(request.workflowRunId)) || !Number.isSafeInteger(Number(request.attempt)) || Number(request.attempt) < 1) throw Error('Invalid visual publication identity');
  const files = new Map();
  for (const [index, item] of receipt.items.entries()) {
    const { path, sha256, bytes, producer, htmlSha256, ...metadata } = item;
    const { html, path: originalPath, ...expected } = assessment.items[index];
    if (!isDeepStrictEqual(metadata, expected) || path !== `evidence/visual/${sha256}.png` || !/^[a-f0-9]{64}$/.test(sha256) || producer !== (html === undefined ? 'agent-declared capture' : 'isolated proposed-design renderer') || htmlSha256 !== (html === undefined ? undefined : digest(html))) throw Error('Visual receipt metadata changed');
    const content = validatePng(await readVisualFile(directory, path), item.viewport);
    if (content.length !== bytes || digest(content) !== sha256) throw Error('Visual capture content changed');
    files.set(`${sha256}.png`, content);
  }
  const repository = await api('');
  if (repository.full_name !== request.repository || request.repositoryId !== undefined && repository.id !== request.repositoryId) throw Error('Visual publication repository changed');
  const profile = await loadProfile(api, request.repository, request.baseRevision ?? request.sourceRevision);
  if (profile.evidenceBranch === repository.default_branch) throw Error('Visual evidence branch must be separate from source');
  const prefix = `visual/issue-${request.issue}/runs/${request.workflowRunId}/attempt-${request.attempt}`;
  const report = `# Visual evidence for #${request.issue}\n\nStage: ${request.stage}. Source: \`${request.sourceRevision}\`. Candidate tree: \`${candidateTree ?? 'not an implementation'}\`.\n\n${escape(assessment.reason)}\n\n${receipt.items.map(item => `## ${escape(item.id)}: ${item.kind}\n\nView: ${escape(item.view)}. State: ${escape(item.state)}. Viewport: ${item.viewport.width} × ${item.viewport.height}. Producer: ${item.producer}.\n\n![${escape(item.view)} — ${item.kind}](${item.sha256}.png)\n`).join('\n')}\nProposed designs are illustrative. Candidate captures are agent-declared; the host verifies their bytes and binds them to the independently checked candidate tree. Images grant no visual acceptance, merge or release approval.\n`;
  const textFiles = validatePublishable({ 'report.md': report, 'receipt.json': JSON.stringify(receipt, null, 2) + '\n' });
  for (const [name, content] of Object.entries(textFiles)) files.set(name, Buffer.from(content));
  const branch = profile.evidenceBranch;
  for (let attempt = 0; attempt < 3; attempt++) {
    await evidenceProtection(api, branch, profile.completion.protectionObservations);
    const tip = (await api(`git/ref/heads/${branch}`)).object.sha;
    const tree = await api(`git/trees/${tip}?recursive=1`);
    if (tree.truncated || tree.tree?.length > 10000) throw Error('Visual evidence tree exceeds bounds');
    const paths = new Map(tree.tree.map(entry => [entry.path, entry]));
    for (let i = 1; i <= prefix.split('/').length; i++) {
      const ancestor = paths.get(prefix.split('/').slice(0, i).join('/'));
      if (ancestor && ancestor.type !== 'tree') throw Error('Visual publication destination is not a directory');
    }
    const existing = tree.tree.filter(entry => entry.path.startsWith(prefix + '/') && entry.type !== 'tree');
    let commit = tip;
    if (existing.length) {
      if (existing.length !== files.size || existing.some(entry => entry.type !== 'blob' || entry.mode !== '100644' || !files.has(entry.path.slice(prefix.length + 1)) || entry.sha !== blob(files.get(entry.path.slice(prefix.length + 1))))) throw Error('Conflicting immutable visual evidence');
    } else {
      await beforeWrite();
      const entries = [];
      for (const [name, content] of files) entries.push({ path: `${prefix}/${name}`, mode: '100644', type: 'blob', sha: (await api('git/blobs', 'POST', { content: content.toString('base64'), encoding: 'base64' })).sha });
      const next = await api('git/trees', 'POST', { base_tree: tree.sha, tree: entries });
      commit = (await api('git/commits', 'POST', { message: `docs: retain ${request.stage} visual evidence for #${request.issue}`, tree: next.sha, parents: [tip] })).sha;
      await beforeWrite();
      await evidenceProtection(api, branch, profile.completion.protectionObservations);
      const current = await api('');
      if (current.full_name !== repository.full_name || current.id !== repository.id) throw Error('Visual publication repository changed before write');
      try { await api(`git/refs/heads/${branch}`, 'PATCH', { sha: commit, force: false }); }
      catch (error) { if ((await api(`git/ref/heads/${branch}`)).object.sha === tip) throw error; continue; }
    }
    const base = `https://github.com/${request.repository}/blob/${commit}/${prefix}`;
    return { commit, url: `${base}/report.md`, markdown: `\n\n## Visual evidence\n\n[Retained views and provenance](${base}/report.md). Candidate tree: \`${candidateTree ?? 'not an implementation'}\`.\n\n${receipt.items.map(item => `**${escape(item.id)} — ${item.kind}** · ${item.viewport.width} × ${item.viewport.height} · ${escape(item.state)}\n\n![${escape(item.view)} — ${item.kind}](${base}/${item.sha256}.png?raw=true)`).join('\n\n')}\n\nImages do not record visual acceptance. Leave feedback on this issue or the linked delivery PR.\n` };
  }
  throw Error('Visual evidence branch remained busy; reconcile this publication before retrying');
}
