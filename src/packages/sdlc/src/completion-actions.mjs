import { readFile, writeFile, mkdir, appendFile, access } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { authorizeCompletion, inspectCompletion, assertFresh, assertChecks, mergeAccepted, postMergeRuns, fingerprint, list } from './completion.mjs';
import { completionBundle, publishProcessBundle } from './process-publication.mjs';
import { validateStageEnvelope } from './host-contract.mjs';

async function main(command) {
  const env = process.env, repository = env.GITHUB_REPOSITORY, owner = env.GITHUB_REPOSITORY_OWNER;
  if (!/^[\w.-]+\/[\w.-]+$/.test(repository ?? '')) throw Error('Invalid repository');
  const dir = join(env.RUNNER_TEMP, `lighthouse-${env.GITHUB_RUN_ID}-${env.GITHUB_RUN_ATTEMPT}`);
  const api = async (path, method = 'GET', body, optional = false) => {
    const response = await fetch(`https://api.github.com/repos/${repository}${path ? '/' + path : ''}`, { method, headers: { authorization: `Bearer ${env.GH_TOKEN}`, accept: 'application/vnd.github+json', 'content-type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(30000) });
    if (optional && response.status === 404) return null;
    if (!response.ok) throw Error(`GitHub ${method} ${path}: ${response.status}`);
    return response.status === 204 ? null : response.json();
  };
  const save = (file, value) => writeFile(join(dir, file), JSON.stringify(value, null, 2));
  const load = async file => JSON.parse(await readFile(join(dir, file), 'utf8'));
  const summary = async text => { console.log(text); if (env.GITHUB_STEP_SUMMARY) await appendFile(env.GITHUB_STEP_SUMMARY, text + '\n'); };
  if (command === 'prepare') {
    const event = JSON.parse(await readFile(env.GITHUB_EVENT_PATH, 'utf8'));
    const stage = env.LIGHTHOUSE_STAGE, authorization = authorizeCompletion(event, env, stage);
    if (Number(env.LIGHTHOUSE_ISSUE) !== authorization.issue) throw Error('Routed issue mismatch');
    const completion = await inspectCompletion(api, repository, owner, authorization, stage);
    if (completion.currentRevision !== env.GITHUB_SHA) throw Error('Run completion from the current default branch');
    if (completion.labels.some(l => ['agent-working', 'human-working'].includes(l))) throw Error('Issue is reserved');
    if (!completion.merged) assertChecks(completion);
    const postMerge = completion.merged ? await postMergeRuns(api, completion, completion.merge) : [];
    const id = fingerprint({ repository, stage, issue: authorization.issue, run: env.GITHUB_RUN_ID, attempt: env.GITHUB_RUN_ATTEMPT });
    const request = { runId: id, issue: authorization.issue, stage, title: completion.title, sourceRevision: completion.merged ? completion.merge : completion.binding.head, taskDigest: completion.binding.intent, workflowRunId: env.GITHUB_RUN_ID, attempt: env.GITHUB_RUN_ATTEMPT, observedAt: new Date().toISOString(), harnessRevision: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), runUrl: `https://github.com/${repository}/actions/runs/${env.GITHUB_RUN_ID}`, authorization, completion, postMerge };
    if (Buffer.byteLength(JSON.stringify(request)) > 2 * 1024 * 1024) throw Error('Completion context exceeds bounds');
    await mkdir(dir, { recursive: true }); await save('request.json', request);
    await save('issue.json', { number: request.issue, ...completion.workItem, url: completion.issueUrl });
    const context = JSON.parse(execFileSync(process.execPath, [fileURLToPath(new URL('./host-contract.mjs', import.meta.url)), 'context', join(dir, 'request.json'), join(dir, 'issue.json')], { encoding: 'utf8' }));
    context.completion = completion; context.postMerge = postMerge;
    context.contract.rules += ' Inspect only the requested completion stage. completion contains host-authenticated GitHub observations. An independent GitHub receipt is not an agent assertion. Report missing, pending or failed checks as blockers. Compare the changed-file list with affected repository instructions; report drift with file references, without rewriting guidance. For review, return output.retrospective as Markdown with what went well, what went wrong, start doing, stop doing, and evidence-supported improvement candidates. Mark unknowns explicitly, distinguish repeated failures across issues from retries, and give follow-up owners. Never invent timings, tests, screenshots or human acceptance. Do not open follow-up issues or change policy. The host publishes bounded reports on the explicitly adopted evidence branch. Raw events and credentials are excluded. A successful integration assessment prepares the merge; it does not prove that merge or post-merge tests happened.';
    await save('context.json', context);
    await api(`issues/${request.issue}/labels`, 'POST', { labels: ['agent-working'] });
    await writeFile(join(dir, 'reserved'), id);
    if (env.GITHUB_OUTPUT) await appendFile(env.GITHUB_OUTPUT, `revision=${request.sourceRevision}\n`);
    await summary(`### ${stage} #${request.issue}\nPR #${authorization.pr}, accepted head \`${authorization.head}\`.\n\n${authorization.merge ? 'Owner explicitly authorized merge of this revision, subject to checks.' : 'No merge authorized.'}\n\nRequired checks and evidence protection verified. OpenCode will assess the retained context.`);
    return;
  }
  if (command === 'cleanup') {
    if (!await access(join(dir, 'reserved')).then(() => true, () => false)) return;
    const request = await load('request.json');
    await api(`issues/${request.issue}/labels/agent-working`, 'DELETE', undefined, true);
    await summary('Issue reservation released.'); return;
  }
  const request = await load('request.json'), envelope = await load('envelope.json');
  const errors = validateStageEnvelope(envelope, request);
  if (errors.length || !['passed', 'blocked'].includes(envelope.result.status)) throw Error(errors.join('\n') || 'Incomplete engine outcome');
  if (command === 'validate') {
    if (request.stage === 'review' && (typeof envelope.result.output?.retrospective !== 'string' || !envelope.result.output.retrospective.trim())) throw Error('Review must retain its retrospective');
    if (envelope.result.status === 'passed' && request.stage === 'review') {
      assertChecks(request.completion);
      if (request.postMerge.some(c => c.status !== 'passed')) throw Error('Agent claimed completion with unavailable or failed post-merge verification');
    }
    await summary(`### OpenCode assessment\n${envelope.effect.body}\n\nOutcome: ${envelope.result.status}`); return;
  }
  if (command !== 'publish') throw Error('Unknown completion command');
  const refresh = () => inspectCompletion(api, repository, owner, request.authorization, request.stage);
  let fresh = await refresh(); assertFresh(request.completion, fresh);
  if (!fresh.labels.includes('agent-working') || fresh.labels.includes('human-working')) throw Error('Reservation revoked');
  let receipt = { schemaVersion: 1, state: fresh.merged ? 'merged' : 'prepared', sha: fresh.merge, acceptedHead: request.authorization.head, authorization: request.authorization, binding: request.completion.binding };
  if (request.stage === 'integrate' && request.authorization.merge && envelope.result.status === 'passed') {
    const result = await mergeAccepted(api, request.completion, refresh);
    receipt = { ...receipt, ...result };
    // Persist the irreversible outcome before any dispatch or publication can fail.
    await save('integration-receipt.json', receipt);
    try { receipt.postMerge = await postMergeRuns(api, request.completion, receipt.sha, true); }
    catch (error) { receipt.postMerge = []; receipt.dispatchError = error.message; }
    fresh = await refresh();
    if (!fresh.merged || fresh.merge !== receipt.sha || fresh.binding.head !== request.authorization.head) throw Error('Merged receipt no longer matches GitHub');
  } else if (fresh.merged) receipt.postMerge = await postMergeRuns(api, fresh, fresh.merge);
  if (request.stage === 'review' && envelope.result.status === 'passed') {
    assertChecks(fresh);
    if (receipt.postMerge.some(c => c.status !== 'passed')) throw Error('Post-merge checks have not passed');
  }
  if (envelope.result.status !== 'passed') receipt.state = fresh.merged ? 'merged-review-blocked' : 'blocked';
  await save('integration-receipt.json', receipt);
  const publicationRequest = { ...request, completion: { ...request.completion, merged: fresh.merged } };
  const files = completionBundle(publicationRequest, envelope, receipt);
  const recheck = async () => {
    const current = await refresh(); assertFresh(fresh, current);
    if (!current.labels.includes('agent-working') || current.labels.includes('human-working')) throw Error('Reservation revoked before publication');
  };
  const publication = await publishProcessBundle(api, publicationRequest, files, recheck);
  await save('publication-receipt.json', publication);
  const marker = `<!-- lighthouse-completion:${request.runId} -->`;
  const body = `${envelope.effect.body}\n\n${request.stage}: **${receipt.state}**. Accepted head: \`${request.authorization.head}\`.${receipt.sha ? ` Merged commit: \`${receipt.sha}\`.` : ''}\n\n[Permanent report and retrospective](${publication.url}) · [Actions execution](${request.runUrl})\n\n${request.stage === 'integrate' ? 'Run review explicitly after post-merge checks finish. No next stage was started.' : 'Review recorded; follow-up proposals do not change policy or create new work automatically.'}\n\n${marker}`;
  for (const target of new Set([request.issue, request.authorization.pr])) {
    const comments = await list(api, `issues/${target}/comments`);
    if (!comments.some(c => c.user.type === 'Bot' && c.body.includes(marker))) await api(`issues/${target}/comments`, 'POST', { body });
  }
  if (request.stage === 'review' && envelope.result.status === 'passed') {
    for (const label of ['waiting-review', 'ready', 'integrate', 'review']) await api(`issues/${request.issue}/labels/${label}`, 'DELETE', undefined, true);
    await api(`issues/${request.issue}`, 'PATCH', { state: 'closed', state_reason: 'completed' });
  } else await api(`issues/${request.issue}/labels`, 'POST', { labels: ['waiting-review'] });
  await summary(`### Retained delivery result\n${receipt.state}\n\n[Permanent report](${publication.url})\n\n${receipt.dispatchError ?? 'Publication confirmed; source and evidence commits are recorded separately.'}`);
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main(process.argv[2]).catch(error => { console.error(`::error::${error.message.replaceAll('\n', ' ')}`); process.exitCode = 1; });
