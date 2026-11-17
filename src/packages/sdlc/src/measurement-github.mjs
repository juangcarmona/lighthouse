import { readFile } from 'node:fs/promises';
import { createActionsJsonReader } from './actions-artifact.mjs';
import { validateStageResult } from './contracts.mjs';
import { measurementRecord, measurementHash, deriveMeasurements } from './measurement.mjs';

const kinds = ['issue', 'pull-request', 'issue-pr-relation', 'workflow-attempt', 'workflow-job', 'stage-result', 'human-touch', 'human-wait', 'agent-step', 'usage', 'delegated-integration', 'revert', 'external'];
const positive = value => Number.isSafeInteger(value) && value > 0;
const fullSha = value => /^[a-f0-9]{40}$/.test(value ?? '');

export async function collectGithubMeasurements(repository, window, { api, readArtifact = createActionsJsonReader, now = () => new Date().toISOString(), bounds = {}, workflows = [] } = {}) {
  bounds = { maxPages: 2, maxIssues: 20, maxPullRequests: 20, maxRuns: 20, maxAttempts: 3, maxRequests: 200, ...bounds };
  if (!/^[\w.-]+\/[\w.-]+$/.test(repository) || !Number.isFinite(Date.parse(window?.start)) || !Number.isFinite(Date.parse(window?.end)) || Date.parse(window.start) >= Date.parse(window.end) || Object.values(bounds).some(n => !positive(n) || n > 1000) || !Array.isArray(workflows) || workflows.length > 8 || workflows.some(w => !/^[\w.-]+\.ya?ml$/.test(w))) throw Error('Invalid bounded repository/window collection request');
  const resources = [], collections = Object.fromEntries(kinds.map(kind => [kind, { kind, status: 'complete', reasons: [] }])), records = [];
  let requests = 0;
  function gap(kind, reason, unavailable = false) {
    const item = collections[kind];
    if (item.status !== 'unavailable') item.status = unavailable ? 'unavailable' : 'incomplete';
    if (!item.reasons.includes(reason)) item.reasons.push(reason);
  }
  const read = async path => {
    if (++requests > bounds.maxRequests) throw Object.assign(Error('Request budget exhausted'), { code: 'REQUEST_BOUND' });
    try { const result = await api(path, 'GET'); resources.push({ path, observedAt: now(), status: 'observed' }); return result; }
    catch (error) { resources.push({ path, observedAt: now(), status: 'unavailable', httpStatus: Number.isInteger(error.status) ? error.status : null, reason: error.code === 'REQUEST_BOUND' ? 'request-bound' : 'source-read-failed' }); throw error; }
  };
  async function pages(path, kind, key, stop) {
    const values = [], seen = new Set();
    for (let page = 1; page <= bounds.maxPages; page++) {
      const resource = `${path}${path.includes('?') ? '&' : '?'}per_page=100&page=${page}`;
      let result;
      try { result = await read(resource); } catch { gap(kind, `Unreadable ${resource}`); return values; }
      const items = key ? result?.[key] : result;
      if (!Array.isArray(items) || key && (!Number.isSafeInteger(result.total_count) || result.total_count < items.length)) { gap(kind, `Invalid inventory ${resource}`); return values; }
      for (const item of items) {
        const itemId = positive(item.id) ? `id:${item.id}` : kind === 'issue-pr-relation' && item.event === 'cross-referenced' && positive(item.source?.issue?.id) && item.created_at ? `relation:${item.source.issue.id}:${item.created_at}` : null;
        if (!itemId && kind === 'issue-pr-relation' && item.event !== 'cross-referenced') continue;
        if (!itemId || seen.has(itemId)) { gap(kind, `Missing or duplicate source identity in ${resource}`); continue; }
        seen.add(itemId); values.push(item);
      }
      resources.at(-1).count = items.length;
      if (items.length < 100 || stop?.(items)) return values;
      if (page === bounds.maxPages) gap(kind, `Pagination bound reached at ${resource}`);
    }
    return values;
  }
  const startedAt = now();
  if (Date.parse(window.end) > Date.parse(startedAt)) throw Error('Collection window must end no later than collection start');
  const repo = await read('');
  if (repo.full_name !== repository || !positive(repo.id)) throw Error('GitHub repository identity mismatch');
  const identity = { id: repo.id, fullName: repository };
  const source = (id, url, data, revision) => ({ id, url, observedAt: now(), revision: revision ?? `sha256:${measurementHash(data)}` });
  const add = (kind, id, time, data, url, revision) => {
    if (!Number.isFinite(Date.parse(time))) { gap(kind, `Missing event time for ${id}`); return null; }
    const record = measurementRecord(identity, kind, id, time, data, source(id, url, data, revision)); records.push(record); return record;
  };
  const inside = time => Date.parse(time) >= Date.parse(window.start) && Date.parse(time) < Date.parse(window.end);
  const issueInventory = await pages(`issues?state=all&since=${encodeURIComponent(window.start)}&sort=created&direction=desc`, 'issue', null, items => items.some(i => Date.parse(i.created_at) < Date.parse(window.start)));
  const issues = issueInventory.filter(i => !i.pull_request && inside(i.created_at));
  if (issues.length > bounds.maxIssues) gap('issue', 'Issue selection bound reached');
  const prNumbers = new Set(), relations = [];
  for (const issue of issues.slice(0, bounds.maxIssues)) {
    add('issue', `issue:${issue.id}`, issue.created_at, { id: issue.id, number: issue.number, state: issue.state, createdAt: issue.created_at, closedAt: issue.closed_at }, issue.html_url);
    const timeline = await pages(`issues/${issue.number}/timeline`, 'issue-pr-relation');
    for (const event of timeline) {
      if (event.event === 'cross-referenced' && event.source?.issue?.pull_request) {
        const referenced = event.source.issue;
        const match = referenced.pull_request.url?.match(new RegExp(`^https://api\\.github\\.com/repos/${repository.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/pulls/([1-9][0-9]*)$`));
        if (!match || !positive(referenced.id)) continue;
        const relation = add('issue-pr-relation', positive(event.id) ? `timeline:${event.id}` : `timeline:issue:${issue.id}:pr:${referenced.id}:${event.created_at}`, event.created_at, { issueId: issue.id, prId: referenced.id, relation: 'github-cross-reference' }, positive(event.id) ? `${issue.html_url}#event-${event.id}` : issue.html_url);
        if (relation) { relations.push(relation); prNumbers.add(Number(match[1])); }
      }
    }
    const comments = await pages(`issues/${issue.number}/comments?since=${encodeURIComponent(window.start)}`, 'human-touch');
    for (const comment of comments.filter(c => inside(c.created_at) && c.user?.type === 'User')) add('human-touch', `comment:${comment.id}`, comment.created_at, { actorType: 'User', actorId: comment.user.id, event: 'comment' }, comment.html_url);
  }
  const pullInventory = await pages('pulls?state=all&sort=created&direction=desc', 'pull-request', null, items => items.some(p => Date.parse(p.created_at) < Date.parse(window.start)));
  for (const pr of pullInventory.filter(p => inside(p.created_at))) prNumbers.add(pr.number);
  if (prNumbers.size > bounds.maxPullRequests) gap('pull-request', 'PR selection bound reached');
  for (const number of [...prNumbers].sort((a, b) => b - a).slice(0, bounds.maxPullRequests)) {
    let pr;
    try { pr = await read(`pulls/${number}`); } catch { gap('pull-request', `PR ${number} unavailable`); continue; }
    if (!positive(pr.id) || pr.base?.repo?.id !== repo.id || !fullSha(pr.head?.sha)) { gap('pull-request', `PR ${number} identity mismatch`); continue; }
    const links = relations.filter(r => r.data.prId === pr.id);
    add('pull-request', `pull-request:${pr.id}`, pr.created_at, { id: pr.id, number, head: pr.head.sha, createdAt: pr.created_at, merged: pr.merged === true, mergedAt: pr.merged_at, mergeCommitSha: pr.merge_commit_sha, linkedIssueIds: [...new Set(links.map(r => r.data.issueId))].sort(), linkProof: links.map(r => ({ issueId: r.data.issueId, sourceId: r.id, sha256: r.source.sha256 })) }, pr.html_url);
    const reviews = await pages(`pulls/${number}/reviews`, 'human-touch');
    for (const review of reviews.filter(r => inside(r.submitted_at) && r.user?.type === 'User' && r.state !== 'PENDING')) add('human-touch', `review:${review.id}`, review.submitted_at, { actorType: 'User', actorId: review.user.id, event: 'review', state: review.state }, review.html_url);
    const comments = await pages(`issues/${number}/comments?since=${encodeURIComponent(window.start)}`, 'human-touch');
    for (const comment of comments.filter(c => inside(c.created_at) && c.user?.type === 'User')) add('human-touch', `comment:${comment.id}`, comment.created_at, { actorType: 'User', actorId: comment.user.id, event: 'comment' }, comment.html_url);
  }
  const query = `created=${encodeURIComponent(`${window.start}..${window.end}`)}`;
  const runs = new Map();
  for (const workflow of workflows.length ? workflows : [null]) {
    const list = await pages(`${workflow ? `actions/workflows/${workflow}/runs` : 'actions/runs'}?${query}`, 'workflow-attempt', 'workflow_runs');
    for (const run of list.filter(r => inside(r.created_at))) runs.set(run.id, run);
  }
  if (runs.size > bounds.maxRuns) gap('workflow-attempt', 'Workflow run selection bound reached');
  for (const selected of [...runs.values()].sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at) || b.id - a.id).slice(0, bounds.maxRuns)) {
    if (!positive(selected.run_attempt)) { gap('workflow-attempt', `Missing attempt identity for run ${selected.id}`); continue; }
    if (selected.run_attempt > bounds.maxAttempts) gap('workflow-attempt', `Attempt bound reached for run ${selected.id}`);
    let artifactInventory;
    try { artifactInventory = await read(`actions/runs/${selected.id}/artifacts?per_page=100`); }
    catch { artifactInventory = null; gap('stage-result', `Artifacts unavailable for run ${selected.id}`); gap('usage', `Artifacts unavailable for run ${selected.id}`); }
    const artifacts = Array.isArray(artifactInventory?.artifacts) ? artifactInventory.artifacts : [];
    if (artifactInventory && (!Array.isArray(artifactInventory.artifacts) || artifactInventory.total_count !== artifacts.length || artifacts.length > 100)) { gap('stage-result', `Artifact inventory incomplete for run ${selected.id}`); gap('usage', `Artifact inventory incomplete for run ${selected.id}`); }
    for (let attempt = 1; attempt <= Math.min(selected.run_attempt, bounds.maxAttempts); attempt++) {
      let run;
      try { run = await read(`actions/runs/${selected.id}/attempts/${attempt}`); }
      catch { gap('workflow-attempt', `Run ${selected.id} attempt ${attempt} unavailable`); continue; }
      if (run.id !== selected.id || run.run_attempt !== attempt || run.repository?.id !== repo.id || !fullSha(run.head_sha)) { gap('workflow-attempt', `Run ${selected.id} attempt identity mismatch`); continue; }
      add('workflow-attempt', `run:${run.id}:attempt:${attempt}`, run.status === 'completed' ? run.updated_at : run.created_at, { runId: run.id, attempt, workflow: run.path, status: run.status, conclusion: run.conclusion ?? 'pending', head: run.head_sha }, run.html_url, run.head_sha);
      const jobs = await pages(`actions/runs/${run.id}/attempts/${attempt}/jobs`, 'agent-step', 'jobs');
      const agentSteps = [];
      for (const job of jobs) {
        add('workflow-job', `job:${job.id}`, job.completed_at ?? job.started_at ?? run.created_at, { runId: run.id, attempt, jobId: job.id, name: job.name, status: job.status, conclusion: job.conclusion, publication: ['publish', 'Validate, publish and release'].includes(job.name) }, job.html_url, run.head_sha);
        for (const step of (job.steps ?? []).filter(s => s.name === 'OpenCode progress and result' && s.conclusion !== 'skipped')) {
          const id = `run:${run.id}:attempt:${attempt}:job:${job.id}:step:${step.number}`;
          const record = add('agent-step', id, step.completed_at ?? step.started_at ?? run.created_at, { runId: run.id, attempt, jobId: job.id, stepNumber: step.number, stepName: step.name, startedAt: step.started_at, completedAt: step.completed_at, conclusion: step.conclusion }, job.html_url, run.head_sha);
          if (record) agentSteps.push(record);
        }
      }
      const resultArtifacts = artifacts.filter(a => new RegExp(`^lighthouse-(?:(triage|refine|propose|implement|integrate|review|apply-review)-)?result-[1-9][0-9]*-${attempt}$`).test(a.name));
      let runtime;
      for (const artifact of resultArtifacts) {
        if (artifact.expired) { gap('stage-result', `Expired artifact ${artifact.id}`); continue; }
        try {
          const reader = await readArtifact(read, repository, run.id, artifact.name), envelope = reader('envelope.json');
          const result = envelope?.result;
          if (validateStageResult(result).length) throw Error('Invalid source assessment');
          runtime = reader('runtime.json', true);
          add('stage-result', `artifact:${artifact.id}:stage-result`, run.updated_at, { runId: run.id, attempt, artifactId: artifact.id, stage: result.stage, status: result.status, blockingCause: result.status === 'blocked' && result.output?.handoff ? 'human' : 'unknown', pendingReviewCount: result.pendingReview.length, unavailableCheckCount: result.unavailableChecks.length, missingEvidenceCount: result.missingEvidence.length, nextAction: result.nextAction.slice(0, 1000), sourceAssessment: 'worker-declared; not acceptance' }, run.html_url, run.head_sha);
        } catch { gap('stage-result', `Result artifact ${artifact.id} unavailable, incompatible or outside archive bounds`); }
      }
      if (!resultArtifacts.length && agentSteps.length) gap('stage-result', `No stage result artifact for run ${run.id} attempt ${attempt}`);
      const telemetry = artifacts.filter(a => a.name === `lighthouse-telemetry-agent-${attempt}` && !a.expired);
      let summary;
      if (telemetry.length === 1 && agentSteps.length === 1) {
        try {
          const reader = await readArtifact(read, repository, run.id, telemetry[0].name);
          summary = reader(`lighthouse-${run.id}-${attempt}/evidence/host/telemetry-usage.json`, true) ?? reader('telemetry-usage.json', true);
          if (summary?.schemaVersion !== 1 || !['observed', 'incomplete', 'unavailable'].includes(summary.coverage)) summary = null;
        } catch { gap('usage', `Usage artifact unavailable or outside archive bounds for run ${run.id} attempt ${attempt}`); }
      }
      for (const step of agentSteps) {
        const data = { invocationId: step.id, runId: run.id, attempt, coverage: summary?.coverage ?? 'unavailable', usageSource: summary?.source ?? 'unavailable', authenticationRoute: 'unknown', identity: { requested: runtime?.modelExecution?.requested ?? null, resolved: runtime?.modelExecution?.resolved ?? null, providerReported: runtime?.modelExecution?.providerReported ?? null }, ...Object.fromEntries(['inputTokens', 'outputTokens', 'reasoningTokens', 'cacheReadTokens', 'cacheWriteTokens'].map(field => [field, summary?.tokens?.[field] ?? null])) };
        add('usage', `usage:${step.id}`, step.time, data, run.html_url, run.head_sha);
        if (!summary || summary.coverage === 'unavailable') gap('usage', `Missing or unassignable usage for ${step.id}`);
      }
    }
  }
  for (const kind of ['human-wait', 'delegated-integration', 'revert', 'external']) gap(kind, 'No independently qualified source adapter selected by this collector; no replacement evidence is inferred', true);
  for (const kind of ['human-touch', 'issue-pr-relation']) if (collections.issue.status !== 'complete' || collections['pull-request'].status !== 'complete') gap(kind, 'Issue/PR population or relation coverage is incomplete');
  for (const kind of ['agent-step', 'workflow-job', 'stage-result', 'usage']) if (collections['workflow-attempt'].status !== 'complete') gap(kind, 'Run/attempt population coverage is incomplete');
  gap('human-touch', 'Only selected issue/PR cohorts are scanned; interactions on other work items are not enumerated');
  collections['human-touch'].scope = 'Selected issue/PR creation cohorts and explicitly linked PRs';
  if (collections['agent-step'].status !== 'complete') gap('workflow-job', 'Native job inventory is incomplete');
  const packageVersion = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8')).version;
  const bundle = { schemaVersion: 1, repository: identity, window, collector: { version: 1, packageVersion, implementationSha256: measurementHash(await readFile(new URL(import.meta.url), 'utf8')), startedAt, completedAt: now(), permissions: 'read-only GET requests; no repository mutation', bounds, workflows: workflows.length ? [...workflows].sort() : ['all-repository-workflows'], resources }, collections: Object.values(collections).map(c => ({ ...c, reason: c.reasons.join('; ') || null, records: records.filter(r => r.kind === c.kind).length })), records: records.sort((a, b) => `${a.kind}:${a.id}`.localeCompare(`${b.kind}:${b.id}`)) };
  deriveMeasurements(bundle);
  return bundle;
}
