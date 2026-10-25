import { repositoryDefaults, readGithubProfile, buildGithubProfilePlan } from '../../../packages/sdlc/src/github-profile.mjs';
const clone = (value) => structuredClone(value);
export const config = () => ({ schemaVersion: 1, profileVersion: 1, repository: 'example/project', intake: 'collaborators', requiredChecks: [{ context: 'verify', integrationId: 15368 }], requiredApprovals: 0, evidenceBranch: 'process/retrospectives', overrides: { 'releases.immutable': { value: null, reason: 'This project does not publish releases.' } } });
export function github() {
  const state = {
    repo: { id: 42, node_id: 'R_example', full_name: 'example/project', default_branch: 'main', visibility: 'public', permissions: { admin: true }, ...repositoryDefaults, allow_auto_merge: false, has_wiki: true, security_and_analysis: { secret_scanning: { status: 'enabled' }, secret_scanning_push_protection: { status: 'enabled' } } },
    workflow: { default_workflow_permissions: 'read', can_approve_pull_request_reviews: false },
    forkApproval: 'all_external_contributors',
    intake: { issueCreationPolicy: 'COLLABORATORS_ONLY', pullRequestCreationPolicy: 'COLLABORATORS_ONLY' },
    alerts: true, updates: true, immutable: false, policies: [], writes: [], failures: {},
  };
  const request = async (path, method = 'GET', body) => {
    if (state.failures[`${method} ${path}`]) throw Object.assign(new Error('Provider rejected request.'), { status: state.failures[`${method} ${path}`] });
    const query = path === 'graphql' && body.query.startsWith('query');
    if (method !== 'GET' && !query) state.writes.push({ path, method, body: clone(body) });
    if (path === 'graphql') {
      if (query) return { data: { repository: clone(state.intake) } };
      Object.assign(state.intake, Object.fromEntries(Object.entries(body.variables.input).filter(([key]) => key !== 'repositoryId')));
      return { data: { updateRepository: { repository: clone(state.intake) } } };
    }
    const endpoint = path.replace('repos/example/project', '');
    if (!endpoint) {
      if (method === 'PATCH') {
        for (const [key, value] of Object.entries(body)) {
          if (key === 'security_and_analysis') Object.assign(state.repo[key], value);
          else state.repo[key] = value;
        }
      }
      return clone(state.repo);
    }
    if (endpoint === '/actions/permissions/workflow') { if (method === 'PUT') state.workflow = clone(body); return clone(state.workflow); }
    if (endpoint === '/actions/permissions/fork-pr-contributor-approval') { if (method === 'PUT') state.forkApproval = body.approval_policy; return { approval_policy: state.forkApproval }; }
    for (const [url, key] of [['/vulnerability-alerts', 'alerts'], ['/automated-security-fixes', 'updates'], ['/immutable-releases', 'immutable']]) {
      if (endpoint !== url) continue;
      if (method === 'PUT') state[key] = true;
      if (url === '/vulnerability-alerts') { if (!state[key]) throw Object.assign(new Error('Disabled'), { status: 404 }); return null; }
      return { enabled: state[key], paused: false };
    }
    if (endpoint === '/rulesets' && method === 'POST') {
      const rule = { ...clone(body), id: state.policies.length + 1 }; state.policies.push(rule); return clone(rule);
    }
    if (endpoint.startsWith('/rulesets/')) return clone(state.policies.find((policy) => policy.id === Number(endpoint.split('/').at(-1))));
    if (endpoint.startsWith('/rules/branches/')) {
      const branch = decodeURIComponent(endpoint.split('/').at(-1).split('?')[0]);
      return state.policies.filter((policy) => policy.conditions.ref_name.include.includes(branch === 'main' ? '~DEFAULT_BRANCH' : `refs/heads/${branch}`)).flatMap((policy) => policy.rules.map((rule) => ({ ...clone(rule), ruleset_id: policy.id, ruleset_source_type: 'Repository', ruleset_source: 'example/project' })));
    }
    throw new Error(`Unexpected request: ${method} ${path}`);
  };
  return { state, request, plan: async (configuration = config()) => buildGithubProfilePlan(configuration, await readGithubProfile(configuration, request)) };
}

