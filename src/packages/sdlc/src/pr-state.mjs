import { checkImplementationPullRequest } from './proposal-review.mjs';
import { checkCommit } from './completion.mjs';

const marker = /<!-- lighthouse-pr-state:(\{[^\n]*\}) -->/;

export async function scheduledImplementationPulls(api) {
  const numbers = [];
  for (let page = 1; page <= 10; page++) {
    const pulls = await api(`pulls?state=open&per_page=100&page=${page}`);
    numbers.push(...pulls.filter(pr => /^lighthouse\/implement-[1-9][0-9]*-[a-f0-9]{12}$/.test(pr.head?.ref ?? '') && pr.user?.login === 'github-actions[bot]').map(pr => pr.number));
    if (pulls.length < 100) return numbers;
  }
  throw Error('Open PR history exceeds reconciliation bound');
}

export async function setPullRequestDraft(token, pr, draft) {
  if (!pr.node_id) throw Error('PR lacks GraphQL identity');
  const field = draft ? 'convertPullRequestToDraft' : 'markPullRequestReadyForReview';
  const response = await fetch('https://api.github.com/graphql', {
    method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: `mutation($id:ID!){${field}(input:{pullRequestId:$id}){pullRequest{id isDraft}}}`, variables: { id: pr.node_id } }),
    signal: AbortSignal.timeout(30000),
  });
  const result = await response.json();
  if (!response.ok || result.errors?.length || result.data?.[field]?.pullRequest?.isDraft !== draft) throw Error('GitHub could not change PR draft state');
}

export function implementationPrProof(comments, pr) {
  for (const comment of [...comments].reverse()) {
    if (comment.user?.login !== 'github-actions[bot]' || comment.user.type !== 'Bot') continue;
    const raw = comment.body?.match(marker)?.[1];
    if (!raw) continue;
    let proof;
    try { proof = JSON.parse(raw); } catch { continue; }
    if (proof.pr === pr.number && proof.head === pr.head.sha && typeof proof.complete === 'boolean' && /^[1-9][0-9]*$/.test(String(proof.run))) return proof;
  }
  return null;
}

export async function projectImplementationPrState(api, issue, draft) {
  const current = await api(`issues/${issue}`);
  if (current.state !== 'open') return;
  const wanted = draft ? 'pr-draft' : 'pr-ready';
  for (const label of ['ready', 'waiting-review', draft ? 'pr-ready' : 'pr-draft']) {
    if (current.labels.some(item => item.name === label)) await api(`issues/${issue}/labels/${label}`, 'DELETE', undefined, true);
  }
  if (!current.labels.some(item => item.name === wanted)) await api(`issues/${issue}/labels`, 'POST', { labels: [wanted] });
}

export async function reconcileImplementationPr(api, repo, pr, issue, comments, requiredChecks, setDraft, { auto = false } = {}) {
  const target = checkImplementationPullRequest(pr, repo);
  if (target.issue !== issue.number || issue.state !== 'open') return { status: 'ignored', reason: 'Issue or PR changed' };
  const proof = implementationPrProof(comments, pr);
  const checks = await checkCommit(api, pr.head.sha, requiredChecks);
  const reserved = issue.labels.some(label => ['agent-working', 'human-working'].includes(label.name));
  const complete = !reserved && proof?.complete === true && checks.length > 0 && checks.every(check => check.status === 'passed');
  if (pr.draft && auto && complete) {
    try { await setDraft(pr, false); }
    catch (error) { if ((await api(`pulls/${pr.number}`)).draft) throw error; }
    await projectImplementationPrState(api, issue.number, false);
    return { status: 'ready', reason: 'Candidate and required checks passed' };
  }
  if (!pr.draft && !complete) {
    try { await setDraft(pr, true); }
    catch (error) { if (!(await api(`pulls/${pr.number}`)).draft) throw error; }
    await projectImplementationPrState(api, issue.number, true);
    return { status: 'draft', reason: reserved ? 'Implementation or owner work is still active' : !proof?.complete ? 'Implementation is incomplete' : 'Required checks have not passed' };
  }
  await projectImplementationPrState(api, issue.number, pr.draft);
  return { status: pr.draft ? 'draft' : 'ready', reason: pr.draft ? 'PR is a draft' : 'Candidate and required checks passed' };
}
