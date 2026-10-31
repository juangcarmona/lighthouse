import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { runUnattended, validateUnattendedPolicy, unattendedDigest, assertIndependentReview, regressionPlan, hotfixScope } from './unattended.mjs';
import { stageContext, executeUnattendedStage, applyCandidate, candidateInventory, boundedOpenSpecProvider } from './unattended-runtime.mjs';
import { sourceFiles, loadImplementation, createImplementationPullRequest } from './implementation.mjs';
import { prepareProposal, proposalRoot } from './proposal.mjs';
import { resolveModelProfile } from './model-profiles.mjs';
import { taskDigest } from './issue-actions.mjs';
import { list, inspectCompletion, assertChecks, mergeAccepted, postMergeRuns } from './completion.mjs';
import { completionBundle, publishProcessBundle } from './process-publication.mjs';
import { dispatchDeliveryChecks } from './delivery-events.mjs';
import { setPullRequestDraft, projectImplementationPrState } from './pr-state.mjs';
import { handoff } from './handoff.mjs';

const harness = fileURLToPath(new URL('../', import.meta.url));
const readJson = async path => JSON.parse(await readFile(path, 'utf8'));
const owners = (comments, owner) => comments.filter(c => c.user?.login === owner).map(c => ({ id: c.id, body: c.body, updated_at: c.updated_at }));
const testState = (source, paths) => Object.fromEntries([...paths].sort().map(path => [path, source.has(path) ? { content: source.get(path).content.toString('base64'), mode: source.get(path).mode } : null]));

export async function githubJson(env, path, method = 'GET', body, optional = false) {
  const response = await fetch('https://api.github.com/repos/' + env.GITHUB_REPOSITORY + (path ? '/' + path : ''), {
    method, headers: { authorization: 'Bearer ' + env.GH_TOKEN, accept: 'application/vnd.github+json', 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(30000),
  });
  if (optional && response.status === 404) return null;
  if (!response.ok) throw Error('GitHub ' + method + ' ' + path + ': ' + response.status);
  return response.status === 204 ? null : response.json();
}

// A delegated merge never overrides a later owner hold or new review input.
export async function assertUnattendedPullRequest(api, comments, pr, owner) {
  const hold = '<!-- lighthouse-pr-hold:' + pr.number + ':' + pr.head.sha + ' -->';
  if (comments.some(c => c.user?.login === 'github-actions[bot]' && c.body?.includes(hold))) throw Error('Owner placed this PR head on hold');
  const [events, reviews, discussion, inline] = await Promise.all([
    list(api, 'issues/' + pr.number + '/timeline'), list(api, 'pulls/' + pr.number + '/reviews'),
    list(api, 'issues/' + pr.number + '/comments'), list(api, 'pulls/' + pr.number + '/comments'),
  ]);
  if (events.some(e => e.event === 'converted_to_draft' && e.actor?.login === owner)) throw Error('Owner converted this PR to draft; new authorization is required');
  if (reviews.some(r => r.user?.login === owner && (r.state !== 'APPROVED' || r.commit_id !== pr.head.sha)) ||
      [...discussion, ...inline].some(c => c.user?.login === owner)) throw Error('New owner PR feedback requires fresh independent review');
}

export async function runGithubUnattended({ env = process.env, api = (...args) => githubJson(env, ...args), execute = executeUnattendedStage } = {}) {
  const event = await readJson(env.GITHUB_EVENT_PATH), owner = env.GITHUB_REPOSITORY_OWNER;
  if (env.GITHUB_EVENT_NAME !== 'workflow_dispatch' || env.GITHUB_ACTOR !== owner || env.GITHUB_TRIGGERING_ACTOR !== owner ||
      !/^[\w.-]+\/[\w.-]+$/.test(env.GITHUB_REPOSITORY ?? '') || !/^[1-9][0-9]*$/.test(event.inputs?.issue ?? '') ||
      !['ff', 'hotfix'].includes(event.inputs?.route)) throw Error('Unattended delivery requires an authenticated owner workflow request');
  const repository = env.GITHUB_REPOSITORY, issueNumber = Number(event.inputs.issue), route = event.inputs.route;
  const metadata = await api(''), revision = (await api('commits/' + encodeURIComponent(metadata.default_branch))).sha;
  const run = await api('actions/runs/' + env.GITHUB_RUN_ID);
  if (run.event !== 'workflow_dispatch' || run.actor?.login !== owner || run.triggering_actor?.login !== owner ||
      run.repository?.full_name !== repository || run.head_sha !== revision || run.head_branch !== metadata.default_branch ||
      run.path !== '.github/workflows/lighthouse-sdlc-unattended.yml' || String(run.run_attempt) !== env.GITHUB_RUN_ATTEMPT) throw Error('Unattended workflow identity or current source changed');
  const sourceRoot = env.LIGHTHOUSE_SOURCE_ROOT ?? join(env.GITHUB_WORKSPACE, 'product');
  if (execFileSync('git', ['-C', sourceRoot, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim() !== revision) throw Error('Source checkout does not match the authorized revision');
  const policyFile = await api('contents/.lighthouse/unattended.json?ref=' + revision);
  const policy = validateUnattendedPolicy(JSON.parse(Buffer.from(policyFile.content, 'base64').toString()), route);
  const policyDigest = unattendedDigest(policy);
  const issue = await api('issues/' + issueNumber);
  if (issue.state !== 'open' || issue.pull_request || issue.user?.login !== owner || issue.labels.some(l => ['future', 'needs-info', 'waiting-review', 'human-working', 'agent-working'].includes(l.name))) throw Error('Issue is closed, reserved, paused or requires owner admission');
  const comments = () => list(api, 'issues/' + issueNumber + '/comments');
  const initialComments = await comments();
  const initialCommentId = Math.max(0, ...initialComments.map(comment => Number.isSafeInteger(comment.id) ? comment.id : 0));
  const ownerAnswers = owners(initialComments, owner);
  const intent = taskDigest(issue, ownerAnswers);
  const issueContext = { ...issue, ownerAnswers };
  const runId = unattendedDigest({ repository, issue: issueNumber, route, run: env.GITHUB_RUN_ID });
  const marker = '<!-- lighthouse-unattended:' + runId + ' -->';
  if ((await comments()).some(c => c.user?.login === 'github-actions[bot]' && c.body.includes(marker))) throw Error('This request already has a receipt; inspect effects before retrying');
  const pulls = await list(api, 'pulls?state=open');
  if (pulls.some(pr => pr.head.ref.startsWith('lighthouse/implement-' + issueNumber + '-'))) throw Error('Existing implementation PR needs review rather than a second delivery');
  const root = join(env.RUNNER_TEMP, 'lighthouse-unattended-' + env.GITHUB_RUN_ID);
  await mkdir(root, { recursive: true });
  const source = await sourceFiles(sourceRoot);
  const implementation = await loadImplementation(api, issueNumber, owner, revision, metadata.default_branch, route);
  if (implementation.policy.reviewRequired) throw Error('Implementation policy requires an owner decision');
  if (policy.paths.some(path => !implementation.policy.paths.some(p => p === '*' || (p.endsWith('/') ? path.startsWith(p) : path === p)))) throw Error('Unattended paths exceed implementation authority');
  implementation.policy.paths = [...policy.paths, ...(route === 'ff' ? [proposalRoot(issueNumber) + '/'] : [])];
  const operator = await readJson(env.LIGHTHOUSE_ENGINE_CONFIG);
  let project = null;
  try { project = await readJson(join(sourceRoot, '.lighthouse/models.json')); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  const producer = resolveModelProfile({ project, operator, worker: 'implement' });
  const reviewer = resolveModelProfile({ project, operator, worker: 'independent-review', profile: policy.reviewerProfile });
  if (producer.model === reviewer.model) throw Error('Independent reviewer resolves to the implementation model');
  let reserved = false, sequence = 0, working = source, lastStep = null, published = null, refined = null, lastReview = null, planProducer = null;
  const controller = new AbortController(), timer = setTimeout(() => controller.abort(), policy.timeoutSeconds * 1000);
  const provider = boundedOpenSpecProvider({ root, signal: controller.signal, deadline: Date.now() + policy.timeoutSeconds * 1000, env });
  const onSignal = () => controller.abort();
  process.once('SIGTERM', onSignal); process.once('SIGINT', onSignal);
  const runUrl = 'https://github.com/' + repository + '/actions/runs/' + env.GITHUB_RUN_ID;
  const recheck = async () => {
    if (controller.signal.aborted) throw Error('Delivery was cancelled or exceeded its execution limit');
    if ((await api('commits/' + encodeURIComponent(metadata.default_branch))).sha !== revision) throw Error('Authorized base or policy changed; reassess before continuing');
    const fresh = await api('issues/' + issueNumber);
    if (fresh.state !== 'open' || fresh.labels.some(l => ['human-working', 'future', 'needs-info', 'waiting-review'].includes(l.name)) ||
        reserved && !fresh.labels.some(l => l.name === 'agent-working') || !reserved && fresh.labels.some(l => l.name === 'agent-working') || taskDigest(fresh, owners(await comments(), owner)) !== intent) throw Error('Issue scope, reservation or owner authorization changed');
    if (published) {
      const current = await api('pulls/' + published.number);
      if (current.state !== 'open' || current.head.sha !== published.head.sha) throw Error('Published candidate changed before integration');
      await assertUnattendedPullRequest(api, await comments(), current, owner);
    }
  };
  const notify = body => api('issues/' + issueNumber + '/comments', 'POST', { body: body + '\n\n[Execution](' + runUrl + ').\n\n' + marker });
  const releaseReservation = async () => {
    if (!reserved) return 'released';
    const fresh = await api('issues/' + issueNumber);
    const newer = (await comments()).filter(c => c.id > initialCommentId && c.user?.login === 'github-actions[bot]' && c.user.type === 'Bot' && /<!-- lighthouse-(?:unattended|dispatch|actions|stop):/.test(c.body ?? '')).at(-1);
    if (newer && !newer.body.includes(marker)) { reserved = false; return 'stale'; }
    if (fresh.labels.some(label => label.name === 'human-working')) { reserved = false; return 'held'; }
    if (fresh.labels.some(label => label.name === 'agent-working')) await api('issues/' + issueNumber + '/labels/agent-working', 'DELETE', undefined, true);
    reserved = false;
    return 'released';
  };
  const publicationApi = async (path, method, ...args) => {
    if (method === 'POST' && ['git/refs', 'pulls'].includes(path)) {
      await recheck();
      if (controller.signal.aborted) throw Error('Delivery was cancelled before candidate publication');
    }
    return api(path, method, ...args);
  };
  const dispatchApi = (path, method, ...args) => {
    if (method === 'POST' && path.endsWith('/dispatches') && controller.signal.aborted) throw Error('Delivery was cancelled before dependent dispatch');
    return api(path, method, ...args);
  };
  const step = async (stage, worker, text, extra = {}, selectedPolicy = implementation.policy) => {
    await recheck();
    const request = { runId: unattendedDigest({ runId, sequence: ++sequence, stage, worker }), issue: issueNumber, stage, worker, sourceRevision: revision,
      ...(stage === 'implement' ? { implementation: { ...implementation, policy: selectedPolicy } } : {}) };
    const context = { ...stageContext(request, issueContext), unattended: { route, eligibility: refined?.eligibility, scope: policy.paths }, ...extra };
    if (Buffer.byteLength(JSON.stringify(context)) > 2 * 1024 * 1024) throw Error('Review or execution context exceeds its 2 MiB bound');
    const result = await execute({ env, root, request, source: working, context,
      prompt: text, ...(worker === 'independent-review' ? { modelProfile: policy.reviewerProfile } : {}), signal: controller.signal });
    if (result.runtime.execution?.status !== 'passed') throw Error('Host cannot verify completed model execution');
    if (worker === 'independent-review' && result.runtime.model !== reviewer.model || stage === 'implement' && result.runtime.model !== producer.model) throw Error('Operator model selection changed during delivery');
    if (stage !== 'implement' && worker !== 'independent-review' && result.envelope.result.status !== 'passed') throw Error(result.envelope.effect.body);
    return result;
  };
  const review = async (purpose, details, producingRun = null) => {
    const binding = unattendedDigest({ revision, intent, policyDigest, purpose, details });
    const phase = purpose === 'plan'
      ? 'This is pre-implementation PLANNING review. Assess context.review.details.refined and plan for scope, readiness, rollback and the planned verification. The mounted source is intentionally unrepaired. Candidate diffs, RED/GREEN and CI are future-stage requirements, not missing evidence for this planning decision. Do not claim those future checks passed.'
      : 'This is CANDIDATE review. Assess context.review.details changes, originalFiles, RED and executed host checks. Scope identifies the declared implementation paths and any host-authorized OpenSpec planning root; inspect all candidate files and assess the planning artifacts on their merits. Forge CI and merge/release are subsequent trusted-host gates after PR publication; do not claim they passed or require their receipts at this pre-publication review.';
    const result = await step('integrate', 'independent-review',
      phase + ' The contract.envelope is an OUTPUT TEMPLATE, never an execution receipt. Actual review inputs are context.review.details and the original issue. Execute only read-only independent engineering review. Source is mounted at /workspace. Start with the complete contract.envelope object and preserve all required fields, including schemaVersion at both the envelope root and result, plus result.runId, stage and gate, for every outcome including blocked. Read /input/context.json and /harness/skills/independent-review/SKILL.md. Assess the original issue, criteria and authorities against the candidate and executed evidence. Write /output/envelope.json. Return output.review with the exact binding, verdict accept/request-changes/escalate and findings as an array of plain strings, each containing one concrete finding; never use objects. Use an empty array when accepting. Product decisions and unavailable proof require escalation. Acceptance requires passed status and empty blocker arrays; requested corrections use blocked status. Never grant merge authority or edit the workspace.',
      { review: { purpose, binding, details, originalIssue: issueContext } });
    const value = result.envelope.result.output?.review;
    if (!value || value.binding !== binding || !['accept', 'request-changes', 'escalate'].includes(value.verdict) ||
        !Array.isArray(value.findings) || value.findings.length > 30 || value.findings.some(f => typeof f !== 'string' || !f.trim() || f.length > 4000)) throw Error('Reviewer returned invalid or stale findings');
    if (!producingRun) throw Error('Planning review lacks its producing execution');
    const from = { model: producingRun.runtime.model, runId: producingRun.request.runId };
    const to = { model: result.runtime.model, runId: result.request.runId };
    if (from.model === to.model || from.runId === to.runId) throw Error('Reviewer did not execute independently with a distinct model');
    if (value.verdict === 'accept') assertIndependentReview(result.envelope.result, binding, from, to);
    else if (result.envelope.result.status !== 'blocked' || value.findings.length === 0) throw Error('Reviewer findings need a blocked assessment');
    lastReview = { binding, result: result.envelope.result, model: result.runtime.modelExecution, execution: result.runtime.execution };
    return { accepted: value.verdict === 'accept', verdict: value.verdict, findings: value.findings };
  };
  try {
    await recheck();
    await api('issues/' + issueNumber + '/labels', 'POST', { labels: ['agent-working'] }); reserved = true;
    await notify(handoff({ status: 'working', stage: route, happened: 'The authorized bounded delivery has started.', action: 'None. Wait for the result or a specific blocker.', next: 'The workflow will publish its actual outcome and any required decision.' }));
    const outcome = await runUnattended({ route, policy, signal: controller.signal, host: {
      recheck,
      refine: async () => {
        const result = await step(route === 'hotfix' ? 'triage' : 'refine', route === 'hotfix' ? 'triage' : 'refine',
          'Assess the authorized issue using the canonical stage skill (/harness/skills/' + (route === 'hotfix' ? 'triage' : 'refine') + '/SKILL.md) and /input/context.json. Return output.eligibility with points (numeric; never infer a legacy-label conversion), risk, reversible, dependenciesResolved, scopeKnown, productChangeNeeded, humanDecisionRequired and a reason grounded in source. FF requires low risk and 1–3 points, or five only under explicit opt-in. For hotfix also return confirmedDefect and rollback, plus output.hotfix containing command (argv), assertion (the exact expected failing behavioral assertion text), rootCause, estimatedProductionLines (additions plus deletions, at most 100) and plannedFiles. Investigate relevant callers. Missing product meaning or an ambiguous outcome is a blocker. Write only the envelope.',
          { admission: { allowFivePoint: policy.allowFivePoint, hotfix: policy.hotfix ?? null } });
        refined = result.envelope.result.output; planProducer = result;
        if (route === 'hotfix') {
          const plan = regressionPlan(refined.hotfix);
          if (JSON.stringify(plan.command) !== JSON.stringify(policy.hotfix.regressionCommand)) throw Error('Hotfix plan must use the owner-declared regression runner');
          hotfixScope(plan.plannedFiles.map(path => ({ path, additions: 0, deletions: 0, binary: false })), policy);
        }
        return refined;
      },
      propose: async () => {
        const proposal = await prepareProposal(issueNumber, null, provider);
        const result = await step('propose', 'propose',
          'Prepare the smallest engineering plan through context.proposal.instructions. Return proposal.md, design.md and tasks.md in output.files under proposal.root, even for documentation-only changes; keep tasks unchecked. For a change without spec-level behavior, return .openspec.yaml containing exactly skip_specs: true in place of a spec; the host combines it with provider metadata and validates it. Follow /harness/skills/propose/SKILL.md. Preserve product and architecture authority. Write the envelope; the host validates and materializes the proposal.',
          { proposal, refinement: refined });
        planProducer = result;
        const files = await prepareProposal(issueNumber, result.envelope.result.output.files, provider);
        working = applyCandidate(working, files.map(f => ({ path: f.path, content: Buffer.from(f.content).toString('base64'), mode: '100644' })));
        return { files, refinement: refined };
      },
      reviewPlan: async details => { const assessment = await review('plan', details, planProducer); if (!assessment.accepted) throw Error('Independent planning review ' + assessment.verdict + ': ' + assessment.findings.join(' ').slice(0, 3000)); },
      reproduce: async plan => {
        const selected = { ...implementation.policy, paths: policy.hotfix.testPaths, checks: [...policy.hotfix.setupCommands, plan.command] };
        const result = await step('implement', 'implement',
          'Reproduce the confirmed defect before repairing production code. Read context.hotfix. Add the smallest regression assertion and relevant edges ONLY in the authorized test paths. Preserve production code. Run the test and capture the identified behavioral failure. Return an implement envelope with output.eligibility and root-cause evidence; expected RED is a blocked Done result, not a claim of completion. The host reruns the command on production code that is unchanged.',
          { hotfix: plan }, selected);
        if (result.envelope.result.pendingReview.length || result.envelope.result.unavailableChecks.length) throw Error('Reproduction requires a human decision or unavailable check');
        working = result.source;
        const inventory = await candidateInventory(source, working, implementation.policy);
        return { ...result, files: inventory.files, tests: testState(working, inventory.files.map(f => f.path)) };
      },
      implement: async ({ plan, red, previous, round }) => {
        const selected = { ...implementation.policy, checks: [...(route === 'hotfix' ? [...policy.hotfix.setupCommands, plan.command] : []), ...implementation.policy.checks] };
        const result = await step('implement', 'implement',
          'Implement only the reviewed bounded plan. Read /input/context.json and /harness/skills/implement/SKILL.md. ' +
          (route === 'hotfix' ? 'Use the compact hotfix plan; a full OpenSpec feature proposal is not required. Preserve the regression test bytes supplied by the RED phase and repair the root cause. ' : 'Use the supplied OpenSpec plan and update completed tasks accurately. ') +
          'Follow the workspace command slot, run required checks and return output.eligibility with the current admission assessment. Human-only product, visual or architecture decisions remain blockers. Preserve existing work. Write the envelope; the host independently checks the candidate.',
          { plan, refinement: refined, correction: { round, findings: previous?.feedback ?? [] }, regression: red ? { receipt: red.receipt, tests: red.tests } : null }, selected);
        if (result.envelope.result.pendingReview.length || result.envelope.result.unavailableChecks.length ||
            result.envelope.result.status !== 'passed' && result.receipt.checks.every(c => c.exitCode === 0)) throw Error(result.envelope.effect.body);
        working = result.source; lastStep = result;
        const inventory = await candidateInventory(source, working, implementation.policy);
        await writeFile(join(root, 'candidate.json'), JSON.stringify(inventory.changes));
        return { ...result, ...inventory, red: red ? { receipt: red.receipt, tests: red.tests } : null, eligibility: result.envelope.result.output.eligibility,
          tests: red ? testState(working, Object.keys(red.tests)) : null };
      },
      reviewCandidate: candidate => review('candidate', { refinement: refined, scope: { implementationPaths: policy.paths, planningRoots: route === 'ff' ? [proposalRoot(issueNumber) + '/'] : [] }, changes: candidate.changes,
        originalFiles: Object.fromEntries(candidate.changes.map(c => [c.path, source.get(c.path)?.content.toString('base64') ?? null])),
        red: candidate.red, checks: candidate.receipt }, lastStep),
      publish: async candidate => {
        const snapshot = { issue: issueNumber, sourceRevision: revision, defaultBranch: metadata.default_branch, runId, title: issue.title, implementation };
        published = await createImplementationPullRequest(publicationApi, snapshot, candidate.changes, 'Bounded ' + route + ' delivery with independent review. ' + candidate.envelope.effect.body, runUrl, true, recheck);
        await recheck();
        await projectImplementationPrState(api, issueNumber, true);
        if (await releaseReservation() !== 'released') throw Error('The execution reservation changed before PR handoff; inspect the current issue and PR.');
        await notify(handoff({ status: policy.merge ? 'queued' : 'review', stage: route, happened: 'The candidate passed its executed checks and independent review.', action: policy.merge ? 'None. Wait for the required CI and integration check.' : 'Owner: review the linked PR and authorize integration if appropriate.', next: policy.merge ? 'The workflow will recheck the PR head, CI and delegated merge authority.' : 'Integration waits for separate authorization.', link: `[Candidate PR #${published.number}](${published.html_url})`, details: '<!-- lighthouse-pr-state:' + JSON.stringify({ pr: published.number, head: published.head.sha, complete: true, run: Number(env.GITHUB_RUN_ID) }) + ' -->' }));
        await dispatchDeliveryChecks(dispatchApi, revision, published);
        return published;
      },
      integrate: async (candidate, pr) => {
        const until = Math.min(Date.now() + 600000, Date.now() + policy.timeoutSeconds * 1000);
        let observation, promoted = false;
        const authorization = { issue: issueNumber, pr: pr.number, head: pr.head.sha, merge: true,
          unattended: { route, owner, policyDigest, review: lastReview } };
        do {
          await recheck();
          const current = await api('pulls/' + pr.number);
          if (current.head.sha !== pr.head.sha || current.state !== 'open') throw Error('Published candidate changed before integration');
          if (promoted && current.draft) throw Error('PR returned to draft; new authorization is required');
          // Observe a draft without promoting it while CI is pending. The final merge recheck still rejects drafts.
          observation = await inspectCompletion(api, repository, owner, authorization, 'integrate', env.GITHUB_RUN_ID, { observeDraft: true });
          let checked = false;
          try { assertChecks(observation); checked = true; } catch {}
          if (checked) {
            await recheck();
            if (current.draft) {
              try { await setPullRequestDraft(env.GH_TOKEN, current, false); }
              catch (error) {
                const reconciled = await api('pulls/' + pr.number);
                if (reconciled.state !== 'open' || reconciled.head.sha !== pr.head.sha || reconciled.draft) throw error;
              }
            }
            await recheck();
            promoted = true;
            observation = await inspectCompletion(api, repository, owner, authorization, 'integrate', env.GITHUB_RUN_ID);
            if (observation.mergeable) break;
          }
          if (Date.now() >= until) throw Error('Required CI or mergeability is pending; retain the PR for a new authorized action');
          await new Promise(resolve => setTimeout(resolve, 30000));
        } while (!controller.signal.aborted);
        const result = await mergeAccepted(api, observation, async () => {
          await recheck();
          const fresh = await inspectCompletion(api, repository, owner, authorization, 'integrate', env.GITHUB_RUN_ID);
          if (fresh.merged) throw Error('Candidate was merged before this delivery attempted integration');
          return fresh;
        }, async () => {
          await recheck();
          if (controller.signal.aborted) throw Error('Delivery was cancelled before merge');
        });
        const finalObservation = { ...observation, merged: true, merge: result.sha };
        const request = { runId, issue: issueNumber, stage: 'integrate', title: issue.title, observedAt: new Date().toISOString(), workflowRunId: env.GITHUB_RUN_ID,
          attempt: env.GITHUB_RUN_ATTEMPT, runUrl, harnessRevision: execFileSync('git', ['-C', harness, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), completion: finalObservation };
        const envelope = stageContext({ ...request, runId }, issue).contract.envelope;
        envelope.result.evidence = [{ id: 'independent-review:' + lastReview.binding, status: 'passed', source: runUrl }];
        envelope.result.output = { review: lastReview };
        envelope.effect.body = 'Integrated the independently verified ' + route + ' candidate under explicit bounded repository delegation. Post-merge verification and release retain their existing decisions.';
        const receipt = { ...result, acceptedHead: pr.head.sha, authorization, postMerge: [] };
        await publishProcessBundle(api, request, completionBundle(request, envelope, receipt));
        const notifications = [];
        const notifyIntegrated = async body => {
          try { await notify(body); }
          catch (error) { notifications.push({ status: 'unavailable', reason: error.message.slice(0, 3000) }); }
        };
        let postMerge, postMergeError;
        try { postMerge = await postMergeRuns(dispatchApi, observation, result.sha, !controller.signal.aborted); }
        catch (error) {
          postMergeError = error;
          postMerge = observation.profile.completion.postMergeWorkflows.map(workflow => ({ workflow, revision: result.sha, state: 'missing', status: 'unavailable', reason: error.message.slice(0, 3000) }));
        }
        await notifyIntegrated(handoff({ status: postMergeError ? 'blocked' : 'completed', stage: route, happened: `PR #${pr.number} was merged at ${result.sha}.${postMergeError ? ' Post-merge verification could not be requested.' : ''}`, action: postMergeError ? 'Workflow maintainer: inspect the execution and current CI before requesting verification again.' : 'None.', next: postMergeError ? 'Post-merge verification remains unconfirmed.' : 'Post-merge review follows the configured CI and completion policy; release and deployment remain separate.', link: `[Merged PR #${pr.number}](${pr.html_url})` }));
        return { ...result, postMerge, notifications };
      },
      stop: async reason => { const released = await releaseReservation(); if (released === 'stale') return; await notify(handoff({ status: released === 'held' ? 'unknown' : 'blocked', stage: route, happened: String(reason).slice(0, 4000).replace(/<!--\s*lighthouse-/gi, '&lt;!-- lighthouse-'), action: released === 'held' ? 'Workflow maintainer: inspect the human hold and existing execution reservation before releasing it.' : 'Workflow maintainer: inspect the execution and retained artifacts, then resolve the blocker.', next: 'No automatic retry is scheduled.', ...(published ? { link: `[Candidate PR #${published.number}](${published.html_url})` } : {}) })); },
    } });
    await writeFile(join(root, 'report.json'), JSON.stringify(outcome, null, 2));
    return outcome;
  } finally {
    clearTimeout(timer); process.removeListener('SIGTERM', onSignal); process.removeListener('SIGINT', onSignal);
    if (reserved) await releaseReservation();
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) runGithubUnattended().then(result => { if (result.status === 'blocked') process.exitCode = 1; }).catch(error => { console.error(error.message); process.exitCode = 1; });
