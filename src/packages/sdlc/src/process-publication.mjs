import { createHash } from 'node:crypto';
import { evidenceProtection } from './completion.mjs';
import { buildEvidenceIndex, validateEvidenceRecord, validateEvidenceIndex } from './evidence.mjs';

const digest = value => createHash('sha256').update(value).digest('hex');
const blobSha = content => createHash('sha1').update(`blob ${Buffer.byteLength(content)}\0`).update(content).digest('hex');
const json = value => JSON.stringify(value, null, 2) + '\n';
export function validatePublishable(files) {
  let bytes = 0;
  if (!files || Object.keys(files).length > 32) throw Error('Evidence file count exceeds bounds');
  for (const [path, content] of Object.entries(files)) {
    if (!/^[a-zA-Z0-9][a-zA-Z0-9._/-]*$/.test(path) || path.split('/').some(p => !p || ['.', '..', '.git'].includes(p)) || typeof content !== 'string') throw Error('Unsafe evidence path or payload');
    bytes += Buffer.byteLength(content);
    if (Buffer.byteLength(content) > 1024 * 1024 || bytes > 4 * 1024 * 1024) throw Error('Evidence payload exceeds bounds');
    if (/\b(?:sk-|ghp_|github_pat_)[A-Za-z0-9_-]{15,}|-----BEGIN (?:RSA |OPENSSH |EC )?PRIVATE KEY-----|Bearer\s+[A-Za-z0-9_.-]{10,}|\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+|https?:\/\/[^\s<>"\)]+[?][^\s<>"\)]*(?:token|signature|credential|sig|X-Amz-)[=]/i.test(content)) throw Error('Credential-shaped or signed content is not publishable');
  }
  return files;
}
export function completionBundle(request, envelope, receipt) {
  const observation = request.completion;
  const priorIntegration = request.priorIntegration ? Object.fromEntries(['evidenceId', 'commit', 'path', 'recordSha256', 'url', 'workflow'].map(key => [key, request.priorIntegration[key]])) : null;
  const files = {
    'report.md': `# ${request.stage} result\n\n[Work item](${observation.issueUrl}) · [PR](${observation.prUrl}) · [Actions run](${request.runUrl})\n\nAccepted head: \`${observation.binding.head}\`. Base observed: \`${observation.binding.base}\`.\n\nOutcome: ${receipt.state}. Merged revision: ${receipt.sha ?? 'not merged'}.\n\n${envelope.effect.body}\n\n## Verification\n\n${observation.checks.map(c => `- ${c.context}: ${c.state ?? c.status} at \`${c.revision}\`.`).join('\n')}\n\n## Post-merge checks\n\n${receipt.postMerge?.map(c => `- ${c.workflow}: ${c.state ?? c.status}${c.url ? ` ([run](${c.url}))` : ''}.`).join('\n') || 'Not performed by this invocation.'}\n\n## Limits\n\nThe agent assessment is separate from authenticated GitHub check results. This bundle retains reports and receipts; raw sessions and earlier screenshots remain in their original evidence locations. No additional test or visual acceptance is implied.\n`,
    'retrospective.md': envelope.result.output?.retrospective ?? '# Retrospective\n\nNo retrospective finding was established in this stage.\n',
    'receipt.json': json(receipt),
    'stage-result.json': json(envelope.result),
  };
  const record = { schemaVersion: 1, id: `completion:${request.runId}`, runId: request.runId, kind: 'stage-result', scope: 'delivery', status: envelope.result.status === 'passed' ? 'passed' : 'pending-review', producer: 'Lighthouse GitHub Actions completion adapter', subject: { type: 'issue', id: observation.issueUrl }, observedAt: request.observedAt, artifacts: Object.entries(files).map(([path, content]) => ({ type: path.endsWith('.md') ? 'report' : 'receipt', path, sha256: digest(content) })), payload: { stage: request.stage, priorIntegration, binding: observation.binding, requiredChecks: observation.checks, observedChecks: observation.observedChecks, finalization: observation.finalization, receipt, checkSource: 'GitHub REST API', workflow: { ...(request.dispatchOrigin ? { dispatchOrigin: request.dispatchOrigin } : {}), runId: request.workflowRunId, attempt: request.attempt, url: request.runUrl, harnessRevision: request.harnessRevision } }, nextAction: envelope.result.nextAction };
  const errors = validateEvidenceRecord(record); if (errors.length) throw Error(JSON.stringify(errors));
  files['evidence-record.json'] = JSON.stringify(record);
  const { index, errors: buildErrors } = buildEvidenceIndex([record], { runId: request.runId, repository: observation.binding.repository, revision: receipt.sha ?? observation.binding.head, recordPaths: { [record.id]: 'evidence-record.json' } });
  if (buildErrors.length) throw Error(JSON.stringify(buildErrors));
  const indexErrors = validateEvidenceIndex(index); if (indexErrors.length) throw Error(JSON.stringify(indexErrors));
  files['evidence-index.json'] = json(index);
  return validatePublishable(files);
}
export async function publishProcessBundle(api, request, files, beforeWrite = async () => {}) {
  validatePublishable(files);
  const branch = request.completion.profile.evidenceBranch, issue = request.issue;
  if (!Number.isSafeInteger(issue) || issue < 1 || !/^\d+$/.test(request.workflowRunId) || !/^\d+$/.test(request.attempt) || !['integrate', 'review'].includes(request.stage)) throw Error('Invalid publication identity');
  const date = request.observedAt.slice(0, 10).replaceAll('-', '');
  if (!/^\d{8}$/.test(date)) throw Error('Invalid publication date');
  const slug = request.title.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 64).replace(/-$/, '') || 'change';
  const phase = request.stage === 'review' || request.completion.merged ? 'post-integration' : 'pr-ready';
  const relative = `runs/${request.workflowRunId}/attempt-${request.attempt.padStart(4, '0')}/${phase}`;
  for (let attempt = 0; attempt < 3; attempt++) {
    await evidenceProtection(api, branch, request.completion.profile.completion.protectionObservations);
    const ref = await api(`git/ref/heads/${branch}`), tip = ref.object.sha;
    const tree = await api(`git/trees/${tip}?recursive=1`);
    if (tree.truncated || tree.tree.length > 10000) throw Error('Evidence tree exceeds bounds');
    const paths = new Map(tree.tree.map(f => [f.path, f]));
    const roots = tree.tree.filter(f => f.type === 'tree' && new RegExp(`^docs/process/\\d{8}-${issue}-[a-z0-9-]+$`).test(f.path)).map(f => f.path);
    if (roots.length > 1) throw Error('Ambiguous work-item evidence mapping');
    const root = roots[0] ?? `docs/process/${date}-${issue}-${slug}`, prefix = `${root}/${relative}`;
    for (const path of [prefix, root]) {
      const parts = path.split('/');
      for (let i = 1; i <= parts.length; i++) {
        const ancestor = paths.get(parts.slice(0, i).join('/'));
        if (ancestor && ancestor.type !== 'tree') throw Error('Evidence ancestor must be a directory');
      }
    }
    const desired = Object.fromEntries(Object.entries(files).map(([name, content]) => [`${prefix}/${name}`, content]));
    const existing = [...paths.keys()].filter(p => p.startsWith(`${prefix}/`) && paths.get(p).type !== 'tree');
    const url = commit => `https://github.com/${request.completion.binding.repository}/blob/${commit}/${prefix}/report.md`;
    if (existing.length) {
      if (existing.length !== Object.keys(desired).length || existing.some(p => paths.get(p).mode !== '100644' || paths.get(p).type !== 'blob' || paths.get(p).sha !== blobSha(desired[p] ?? ''))) throw Error('Conflicting immutable evidence bundle');
      return { commit: tip, url: url(tip), duplicate: true };
    }
    const indexPath = `${root}/README.md`, prior = paths.get(indexPath);
    if (prior && (prior.type !== 'blob' || prior.mode !== '100644')) throw Error('Evidence index must be a regular file');
    const old = prior ? await api(`git/blobs/${prior.sha}`) : null;
    if (old && (old.encoding !== 'base64' || old.size > 1024 * 1024)) throw Error('Evidence index exceeds bounds');
    const content = old ? Buffer.from(old.content, 'base64').toString() : `# Process evidence for issue #${issue}\n\n[Work item](${request.completion.issueUrl}). Publication dates use UTC. Earlier attempts remain available.\n`;
    desired[indexPath] = `${content.trimEnd()}\n\n- [${request.stage}, run ${request.workflowRunId}, attempt ${request.attempt}](${relative}/report.md)\n`;
    validatePublishable(desired);
    const entries = [];
    for (const [path, content] of Object.entries(desired)) entries.push({ path, mode: '100644', type: 'blob', sha: (await api('git/blobs', 'POST', { content, encoding: 'utf-8' })).sha });
    const nextTree = await api('git/trees', 'POST', { base_tree: tree.sha, tree: entries });
    const commit = await api('git/commits', 'POST', { message: `docs: retain ${request.stage} evidence for #${issue}`, tree: nextTree.sha, parents: [tip] });
    await beforeWrite(); await evidenceProtection(api, branch, request.completion.profile.completion.protectionObservations);
    try {
      await api(`git/refs/heads/${branch}`, 'PATCH', { sha: commit.sha, force: false });
      return { commit: commit.sha, url: url(commit.sha), duplicate: false };
    } catch (error) {
      // Only a changed remote tip justifies rebuilding; the next pass also detects a lost successful response.
      if ((await api(`git/ref/heads/${branch}`)).object.sha === tip) throw error;
    }
  }
  throw Error('Evidence branch remained busy; retry the same publication');
}
