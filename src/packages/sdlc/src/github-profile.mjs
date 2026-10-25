import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';

export const githubProfileVersion = 1;
export const repositoryDefaults = Object.freeze({
  has_issues: true,
  has_discussions: false,
  is_template: false,
  allow_squash_merge: true,
  allow_merge_commit: false,
  allow_rebase_merge: false,
  squash_merge_commit_title: 'PR_TITLE',
  squash_merge_commit_message: 'PR_BODY',
  allow_auto_merge: true,
  allow_update_branch: true,
  delete_branch_on_merge: true,
  web_commit_signoff_required: false,
});

const record = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const canonical = (value) => JSON.stringify(sort(value));
function sort(value) {
  if (Array.isArray(value)) return value.map(sort);
  if (record(value)) return Object.fromEntries(Object.keys(value).sort().map((key) => [key, sort(value[key])]));
  return value;
}
const equal = (left, right) => canonical(left) === canonical(right);
const digest = (value) => createHash('sha256').update(canonical(value)).digest('hex');
const safeRepo = (repo) => typeof repo === 'string' && /^[A-Za-z0-9][A-Za-z0-9-]*\/[A-Za-z0-9_.-]+$/.test(repo) && !repo.endsWith('/.') && !repo.endsWith('/..');
const defaults = {
  ...Object.fromEntries(Object.entries(repositoryDefaults).map(([key, value]) => [`repository.${key}`, value])),
  'actions.workflow': { default_workflow_permissions: 'read', can_approve_pull_request_reviews: false },
  'actions.forkApproval': 'all_external_contributors',
  'security.alerts': true,
  'security.updates': true,
  'security.secret_scanning': 'enabled',
  'security.secret_scanning_push_protection': 'enabled',
  'releases.immutable': true,
};

export function validateGithubProfile(config) {
  const errors = [];
  if (!record(config)) return ['GitHub profile must be an object.'];
  const keys = ['schemaVersion', 'profileVersion', 'repository', 'intake', 'requiredChecks', 'requiredApprovals', 'evidenceBranch', 'releaseWorkflowReady', 'overrides', 'completion'];
  for (const key of Object.keys(config)) if (!keys.includes(key)) errors.push(`Unknown profile field: ${key}.`);
  if (config.schemaVersion !== 1 || config.profileVersion !== githubProfileVersion) errors.push('Unsupported GitHub profile version.');
  if (!safeRepo(config.repository)) errors.push('repository must be owner/name on github.com.');
  if (!['collaborators', 'public', 'preserve'].includes(config.intake)) errors.push('Choose intake: collaborators, public or preserve.');
  if (!Number.isInteger(config.requiredApprovals) || config.requiredApprovals < 0 || config.requiredApprovals > 6) errors.push('requiredApprovals must be an explicit integer from 0 to 6.');
  if (!Array.isArray(config.requiredChecks) || !config.requiredChecks.length) errors.push('Declare at least one unconditional required CI check.');
  else {
    const seen = new Set();
    for (const check of config.requiredChecks) {
      if (!record(check) || Object.keys(check).some((key) => !['context', 'integrationId'].includes(key)) || typeof check.context !== 'string' || !check.context.trim() || !Number.isInteger(check.integrationId) || check.integrationId <= 0) errors.push('Each required check needs a context and a positive integrationId.');
      else if (seen.has(check.context)) errors.push(`Duplicate required check: ${check.context}.`);
      else seen.add(check.context);
    }
  }
  if (config.evidenceBranch != null && (typeof config.evidenceBranch !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9_/-]*$/.test(config.evidenceBranch) || config.evidenceBranch.includes('//') || config.evidenceBranch.endsWith('/'))) errors.push('evidenceBranch must be a literal branch name, not a pattern.');
  if (config.releaseWorkflowReady !== undefined && typeof config.releaseWorkflowReady !== 'boolean') errors.push('releaseWorkflowReady must be boolean.');
  if (config.completion !== undefined) {
    const c = config.completion;
    if (!record(c) || Object.keys(c).sort().join(',') !== 'postMergeWorkflows,publishEvidence' || typeof c.publishEvidence !== 'boolean' || !Array.isArray(c.postMergeWorkflows) || !c.postMergeWorkflows.length || c.postMergeWorkflows.length > 8 || new Set(c.postMergeWorkflows).size !== c.postMergeWorkflows.length || c.postMergeWorkflows.some(w => !/^[a-zA-Z0-9][a-zA-Z0-9_-]*\.ya?ml$/.test(w))) errors.push('completion requires publishEvidence and 1-8 unique postMergeWorkflows filenames.');
  }
  if (config.overrides !== undefined && !record(config.overrides)) errors.push('overrides must be an object.');
  for (const [id, override] of Object.entries(record(config.overrides) ? config.overrides : {})) {
    if (!Object.hasOwn(defaults, id) && !['rules.main', 'rules.evidence'].includes(id)) { errors.push(`Unknown override: ${id}.`); continue; }
    if (!record(override) || Object.keys(override).some((key) => !['value', 'reason'].includes(key)) || !Object.hasOwn(override, 'value') || typeof override.reason !== 'string' || !override.reason.trim()) { errors.push(`${id} needs a value and a non-empty exception reason.`); continue; }
    if (override.value === null) continue;
    if (id.startsWith('rules.')) { errors.push(`${id} only accepts a null exception; configure protection through checks and approvals.`); continue; }
    const standard = defaults[id];
    if (typeof standard === 'boolean' && typeof override.value !== 'boolean') errors.push(`${id} must be boolean or null.`);
    else if (typeof standard === 'string') {
      const values = id === 'repository.squash_merge_commit_title' ? ['PR_TITLE', 'COMMIT_OR_PR_TITLE']
        : id === 'repository.squash_merge_commit_message' ? ['PR_BODY', 'COMMIT_MESSAGES', 'BLANK']
          : id === 'actions.forkApproval' ? ['all_external_contributors', 'first_time_contributors', 'first_time_contributors_new_to_github'] : ['enabled', 'disabled'];
      if (!values.includes(override.value)) errors.push(`${id} has an unsupported value.`);
    } else if (record(standard) && !equal(override.value, standard)) errors.push(`${id} may only be preserved with null or retain the recommended permissions.`);
    if (id.startsWith('security.') && ['disabled', false].includes(override.value)) errors.push(`${id}: this adapter never disables security; use a reasoned null exception to preserve it.`);
    if (id === 'releases.immutable' && override.value === false) errors.push('This adapter never disables release immutability; use null to preserve it.');
  }
  const desired = { ...defaults, ...Object.fromEntries(Object.entries(record(config.overrides) ? config.overrides : {}).filter(([, value]) => record(value)).map(([id, value]) => [id, value.value])) };
  if (['allow_squash_merge', 'allow_merge_commit', 'allow_rebase_merge'].every((key) => desired[`repository.${key}`] === false)) errors.push('At least one merge method must remain enabled.');
  return errors;
}

function assertConfig(config) {
  const errors = validateGithubProfile(config);
  if (errors.length) throw new Error(errors.join('\n'));
}

// Fix the host explicitly: GH_HOST must not redirect a reviewed github.com plan.
export function githubRequest(path, method = 'GET', body) {
  return new Promise((resolve, reject) => {
    const args = ['api', '--hostname', 'github.com', '--method', method, path];
    if (body !== undefined) args.push('--input', '-');
    const child = execFile('gh', args, { timeout: 30_000, maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
      if (error) {
        const status = Number((stderr.match(/HTTP (\d+)/) ?? [])[1]) || null;
        reject(Object.assign(new Error(`GitHub ${method} ${path} failed${status ? ` (HTTP ${status})` : ''}. Check authentication, permissions and provider availability.`), { status }));
        return;
      }
      try {
        const result = stdout.trim() ? JSON.parse(stdout) : null;
        if (result?.errors?.length) throw new Error('GitHub GraphQL returned errors; check field availability and permissions.');
        resolve(result);
      } catch (parseError) { reject(parseError); }
    });
    child.stdin.on('error', () => {});
    child.stdin.end(body === undefined ? undefined : JSON.stringify(body));
  });
}

async function capture(read) {
  try { return { available: true, value: await read() }; }
  catch (error) { return { available: false, status: error.status ?? null, reason: error.message }; }
}

export async function readGithubProfile(config, request = githubRequest) {
  assertConfig(config);
  const base = `repos/${config.repository}`;
  const repo = await request(base);
  if (repo.full_name?.toLowerCase() !== config.repository.toLowerCase() || !Number.isInteger(repo.id) || !repo.default_branch || !repo.node_id) throw new Error('GitHub repository identity could not be verified.');
  const [owner, name] = config.repository.split('/');
  const snapshot = {
    identity: { id: repo.id, nodeId: repo.node_id, repo: repo.full_name, defaultBranch: repo.default_branch, visibility: repo.visibility, admin: repo.permissions?.admin === true },
    values: Object.fromEntries(Object.keys(repositoryDefaults).map((key) => [`repository.${key}`, repo[key] === undefined ? { available: false, reason: 'GitHub did not return this setting.' } : { available: true, value: repo[key] }])),
  };
  const jobs = {
    'actions.workflow': () => request(`${base}/actions/permissions/workflow`),
    'actions.forkApproval': async () => (await request(`${base}/actions/permissions/fork-pr-contributor-approval`)).approval_policy,
    'security.alerts': async () => {
      try { await request(`${base}/vulnerability-alerts`); return true; }
      catch (error) { if (error.status === 404 && snapshot.identity.admin) return false; throw error; }
    },
    'security.updates': async () => {
      try { const result = await request(`${base}/automated-security-fixes`); return result.enabled === true && result.paused !== true; }
      catch (error) { if (error.status === 404 && snapshot.identity.admin) return false; throw error; }
    },
    'releases.immutable': async () => {
      try { return (await request(`${base}/immutable-releases`)).enabled === true; }
      catch (error) { if (error.status === 404 && snapshot.identity.admin) return false; throw error; }
    },
    intake: async () => {
      const result = await request('graphql', 'POST', { query: 'query($owner:String!,$name:String!){repository(owner:$owner,name:$name){issueCreationPolicy pullRequestCreationPolicy}}', variables: { owner, name } });
      const value = result?.data?.repository;
      if (!value?.issueCreationPolicy || !value?.pullRequestCreationPolicy) throw new Error('GitHub intake policies are unavailable.');
      return value;
    },
  };
  for (const name of ['secret_scanning', 'secret_scanning_push_protection']) {
    snapshot.values[`security.${name}`] = repo.security_and_analysis?.[name]?.status
      ? { available: true, value: repo.security_and_analysis[name].status }
      : { available: false, reason: 'Security setting unavailable for this repository, plan or credential.' };
  }
  for (const [id, branch] of [['rules.main', repo.default_branch], ...(config.evidenceBranch ? [['rules.evidence', config.evidenceBranch]] : [])]) {
    jobs[id] = async () => {
      const rules = [];
      for (let page = 1; ; page++) {
        const batch = await request(`${base}/rules/branches/${encodeURIComponent(branch)}?per_page=100&page=${page}`);
        if (!Array.isArray(batch)) throw new Error('GitHub did not return effective rules.');
        rules.push(...batch);
        if (batch.length < 100) break;
      }
      const ids = [...new Set(rules.map((rule) => `${rule.ruleset_source_type}:${rule.ruleset_source}:${rule.ruleset_id}`))];
      const policies = {};
      for (const id of ids) {
        const [type, source, number] = id.split(':');
        const endpoint = type === 'Repository' ? `repos/${source}/rulesets/${number}` : type === 'Organization' ? `orgs/${source}/rulesets/${number}` : null;
        if (!endpoint) throw new Error('Cannot establish bypass policy for an inherited ruleset.');
        policies[id] = await request(endpoint);
      }
      return rules.map((rule) => {
        const policy = policies[`${rule.ruleset_source_type}:${rule.ruleset_source}:${rule.ruleset_id}`];
        return { type: rule.type, parameters: rule.parameters ?? {}, id: rule.ruleset_id, source: rule.ruleset_source, enforcement: policy.enforcement, bypass: policy.bypass_actors ?? null };
      }).sort((a, b) => canonical(a).localeCompare(canonical(b)));
    };
  }
  const entries = Object.entries(jobs);
  const results = await Promise.all(entries.map(([, read]) => capture(read)));
  entries.forEach(([id], index) => { snapshot.values[id] = results[index]; });
  return snapshot;
}

function requiredRules(config, main) {
  const rules = [{ type: 'deletion' }, { type: 'non_fast_forward' }];
  if (main) rules.push(
    { type: 'pull_request', parameters: { required_approving_review_count: config.requiredApprovals, dismiss_stale_reviews_on_push: true, require_code_owner_review: false, require_last_push_approval: false, required_review_thread_resolution: true } },
    { type: 'required_status_checks', parameters: { strict_required_status_checks_policy: true, required_status_checks: config.requiredChecks.map((check) => ({ context: check.context, integration_id: check.integrationId })) } },
  );
  return rules;
}

function ruleSatisfied(expected, observed) {
  const candidates = observed.filter((rule) => rule.type === expected.type && rule.enforcement === 'active' && Array.isArray(rule.bypass) && rule.bypass.length === 0);
  if (expected.type === 'pull_request') return candidates.some(({ parameters: p }) => p.required_approving_review_count >= expected.parameters.required_approving_review_count && p.required_review_thread_resolution === true && p.dismiss_stale_reviews_on_push === true);
  if (expected.type === 'required_status_checks') return expected.parameters.required_status_checks.every((check) => candidates.some(({ parameters: p }) => p.strict_required_status_checks_policy === true && p.required_status_checks?.some((item) => item.context === check.context && item.integration_id === check.integration_id)));
  return candidates.length > 0;
}

export function buildGithubProfilePlan(config, snapshot) {
  assertConfig(config);
  if (snapshot.identity.repo.toLowerCase() !== config.repository.toLowerCase()) throw new Error('Profile and provider repository do not match.');
  if (config.evidenceBranch === snapshot.identity.defaultBranch) throw new Error('The evidence branch must be separate from the default branch.');
  const desired = { ...defaults, intake: config.intake === 'preserve' ? null : { issueCreationPolicy: config.intake === 'public' ? 'ALL' : 'COLLABORATORS_ONLY', pullRequestCreationPolicy: config.intake === 'public' ? 'ALL' : 'COLLABORATORS_ONLY' }, 'rules.main': requiredRules(config, true) };
  if (config.evidenceBranch) desired['rules.evidence'] = requiredRules(config, false);
  const controls = Object.entries(desired).map(([id, standard]) => {
    const override = config.overrides?.[id];
    const expected = override ? override.value : standard;
    const observed = snapshot.values[id] ?? { available: false, reason: 'Missing provider observation.' };
    let status = expected === null ? 'excepted' : !observed.available ? 'unavailable'
      : id.startsWith('rules.') ? expected.every((rule) => ruleSatisfied(rule, observed.value)) ? 'passed' : 'drift'
        : equal(expected, observed.value) ? 'passed' : 'drift';
    let reason = override?.reason ?? (id === 'intake' && config.intake === 'preserve' ? 'The adopter chose to preserve contribution policy.' : observed.reason ?? null);
    if (id === 'actions.forkApproval' && snapshot.identity.visibility !== 'public' && expected !== null) { status = 'not-applicable'; reason = 'Public fork approval policy does not apply to this private repository; private-fork policy requires separate review.'; }
    if (id === 'releases.immutable' && status === 'drift' && config.releaseWorkflowReady !== true) { status = 'blocked'; reason = 'Confirm draft -> attach all assets -> publish with releaseWorkflowReady, or preserve this setting with a reasoned exception.'; }
    return { id, recommended: standard, expected, observed, status, reason, exception: Boolean(override) };
  });
  const blockers = controls.filter((control) => ['blocked', 'unavailable'].includes(control.status));
  const changes = controls.filter((control) => control.status === 'drift').map((control) => control.id);
  const canApply = blockers.length === 0 && (changes.length === 0 || snapshot.identity.admin);
  const plan = { schemaVersion: 1, kind: 'github-profile', profileVersion: githubProfileVersion, repository: snapshot.identity, configuration: config, controls, changes, canApply, status: blockers.length ? 'blocked' : changes.length ? 'drift' : 'passed', authorization: { planHash: '' } };
  plan.authorization.planHash = githubProfilePlanHash(plan);
  return plan;
}

export function githubProfilePlanHash(plan) {
  const { authorization, ...payload } = plan;
  return digest(payload);
}

function validatePlan(plan, authorization) {
  if (!plan || plan.kind !== 'github-profile' || plan.profileVersion !== githubProfileVersion || plan.schemaVersion !== 1) throw new Error('Unsupported GitHub profile plan.');
  assertConfig(plan.configuration);
  if (authorization !== plan.authorization?.planHash || authorization !== githubProfilePlanHash(plan)) throw new Error('GitHub profile plan authorization does not match; generate a new plan.');
  const rebuilt = buildGithubProfilePlan(plan.configuration, { identity: plan.repository, values: Object.fromEntries(plan.controls.map((control) => [control.id, control.observed])) });
  if (!equal(rebuilt, plan)) throw new Error('GitHub profile plan is not a valid projection of its configuration and observations.');
  if (!plan.canApply) throw new Error('GitHub profile plan is blocked. Resolve unavailable controls or record explicit exceptions.');
}

async function writeControl(control, plan, request) {
  const base = `repos/${plan.configuration.repository}`;
  const id = control.id;
  if (id.startsWith('repository.')) {
    const body = { [id.slice(11)]: control.expected };
    if (id === 'repository.squash_merge_commit_message') {
      const title = plan.controls.find((item) => item.id === 'repository.squash_merge_commit_title');
      body.squash_merge_commit_title = title.expected ?? title.observed.value;
      if (!body.squash_merge_commit_title) throw new Error('Cannot preserve the unobserved squash title setting.');
    }
    return request(base, 'PATCH', body);
  }
  if (id === 'actions.workflow') return request(`${base}/actions/permissions/workflow`, 'PUT', control.expected);
  if (id === 'actions.forkApproval') return request(`${base}/actions/permissions/fork-pr-contributor-approval`, 'PUT', { approval_policy: control.expected });
  if (id === 'security.alerts') return request(`${base}/vulnerability-alerts`, 'PUT');
  if (id === 'security.updates') return request(`${base}/automated-security-fixes`, 'PUT');
  if (id.startsWith('security.')) return request(base, 'PATCH', { security_and_analysis: { [id.slice(9)]: { status: control.expected } } });
  if (id === 'releases.immutable') return request(`${base}/immutable-releases`, 'PUT');
  if (id === 'intake') return request('graphql', 'POST', { query: 'mutation($input:UpdateRepositoryInput!){updateRepository(input:$input){repository{id issueCreationPolicy pullRequestCreationPolicy}}}', variables: { input: { repositoryId: plan.repository.nodeId, ...control.expected } } });
  if (id.startsWith('rules.')) {
    const main = id === 'rules.main';
    return request(`${base}/rulesets`, 'POST', { name: `Lighthouse recommended ${main ? 'main' : 'evidence'} v${githubProfileVersion}`, target: 'branch', enforcement: 'active', bypass_actors: [], conditions: { ref_name: { include: [main ? '~DEFAULT_BRANCH' : `refs/heads/${plan.configuration.evidenceBranch}`], exclude: [] } }, rules: control.expected });
  }
  throw new Error(`Unsupported control: ${id}.`);
}

function checkFresh(plan, current) {
  if (!equal(plan.repository, current.repository)) throw new Error('Repository identity, visibility, default branch or administration permission changed; generate a new plan.');
  for (const control of current.controls) {
    const original = plan.controls.find((item) => item.id === control.id);
    if (control.status === 'passed' || ['excepted', 'not-applicable'].includes(control.status)) continue;
    if (!original || original.status !== 'drift' || !equal(control.observed, original.observed)) throw new Error(`GitHub ${control.id} changed outside the authorized plan; generate a new plan.`);
  }
  if (!current.canApply) throw new Error('GitHub profile is no longer applicable.');
}

export async function applyGithubProfile(plan, authorization, { request = githubRequest } = {}) {
  validatePlan(plan, authorization);
  const completed = [];
  const receipt = (status, extra = {}) => ({ schemaVersion: 1, kind: 'github-profile-receipt', profileVersion: githubProfileVersion, repository: plan.repository, planHash: authorization, configurationHash: digest(plan.configuration), checkedAt: new Date().toISOString(), completed: [...completed], status, ...extra });
  try {
    let current = buildGithubProfilePlan(plan.configuration, await readGithubProfile(plan.configuration, request));
    checkFresh(plan, current);
    // Add protection first; then settings. Never PUT or delete another ruleset.
    const priority = (id) => id.startsWith('rules.') ? 0 : /^repository.allow_(squash_merge|merge_commit|rebase_merge)$/.test(id) && plan.controls.find((item) => item.id === id).expected === true ? 1 : 2;
    const ids = [...plan.changes].sort((a, b) => priority(a) - priority(b));
    for (const id of ids) {
      current = buildGithubProfilePlan(plan.configuration, await readGithubProfile(plan.configuration, request));
      checkFresh(plan, current);
      const control = current.controls.find((item) => item.id === id);
      if (control.status === 'passed') continue;
      await writeControl(control, current, request);
      completed.push(id);
    }
    const final = buildGithubProfilePlan(plan.configuration, await readGithubProfile(plan.configuration, request));
    if (final.status !== 'passed') throw new Error('GitHub readback has not reached the declared state; verify before retrying.');
    return receipt('passed', { controls: final.controls, exceptions: final.controls.filter((control) => control.exception || control.status === 'excepted') });
  } catch (error) {
    error.result = receipt('failed', { error: error.message });
    throw error;
  }
}

export const githubProfileManualRecommendations = Object.freeze([
  'Keep Wiki deferred or explicitly selected, with editing restricted to collaborators.',
  'Review issue forms, sponsorship, Projects, social preview and archive participation for the product.',
  'Review commit comments, linked-issue auto-close, LFS archives and multi-ref push limits in GitHub settings; this adapter does not manage them.',
  'Review Actions retention, workflow-specific token permissions, self-hosted admission and integration authority separately; repository defaults do not enforce those controls.',
]);
