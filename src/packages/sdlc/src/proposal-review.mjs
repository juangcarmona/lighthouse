import { digest } from './host-contract.mjs';
import { proposalRoot, validateProposalFiles } from './proposal.mjs';
import { productImplementationProof, productProposalProof } from './product-change.mjs';

export const feedbackKey = review => digest(`${review.number}:${review.kind}:${review.id}:${review.feedbackDigest}`);
export const feedbackWorker = review => review && !review.approved ? 'apply-review' : undefined;

export function reviewTarget(event, eventName) {
  if (eventName === 'issue_comment' && event.issue?.pull_request) return event.issue.number;
  if (['pull_request_review', 'pull_request_review_comment'].includes(eventName)) return event.pull_request?.number;
  return null;
}

export function checkProposal(pr, repo, expected) {
  const match = pr.head?.ref?.match(/^lighthouse\/(?:propose|implement)-([1-9][0-9]*)-([a-f0-9]{12})$/);
  const marker = pr.body?.match(/<!-- lighthouse-proposal:([a-f0-9]{64}) -->/)?.[1];
  const productProof = productProposalProof(pr);
  const standard = pr.head?.ref?.startsWith('lighthouse/propose-') && !/<!-- lighthouse-product-change(?:-checkpoint|:checkpoint):/.test(pr.body ?? '') && marker?.startsWith(match?.[2] ?? 'invalid');
  if (!match || !(standard || productProof?.issue === Number(match[1])) || pr.user?.login !== 'github-actions[bot]' || pr.user.type !== 'Bot' || pr.state !== 'open' || pr.merged || pr.head.repo?.full_name !== repo || pr.base.repo?.full_name !== repo) throw Error('Not an open repository-owned Lighthouse proposal');
  if (expected && (pr.head.sha !== expected.head || pr.head.ref !== expected.branch || Number(match[1]) !== expected.issue || pr.base.ref !== expected.base)) throw Error('Proposal changed during review; no update published');
  return { number: pr.number, issue: Number(match[1]), head: pr.head.sha, branch: pr.head.ref, base: pr.base.ref, url: pr.html_url, ...(productProof ? { productProposal: true } : {}) };
}

export function checkImplementationPullRequest(pr, repo, expected) {
  const match = pr.head?.ref?.match(/^lighthouse\/(?:implement|propose)-([1-9][0-9]*)-([a-f0-9]{12})$/);
  const marker = pr.body?.match(/<!-- lighthouse-implementation:([a-f0-9]{64}) -->/)?.[1];
  const productProof = productImplementationProof(pr);
  const standard = pr.head?.ref?.startsWith('lighthouse/implement-') && !pr.body?.includes('<!-- lighthouse-product-change:') && !/<!-- lighthouse-product-change(?:-checkpoint|:checkpoint):/.test(pr.body ?? '') && marker?.startsWith(match?.[2] ?? 'invalid');
  if (!match || !(standard || productProof?.issue === Number(match[1])) || pr.user?.login !== 'github-actions[bot]' || pr.user.type !== 'Bot' || pr.state !== 'open' || pr.merged || pr.head.repo?.full_name !== repo || pr.base.repo?.full_name !== repo) throw Error('Not an open repository-owned implementation PR');
  if (expected && (pr.head.sha !== expected.head || pr.head.ref !== expected.branch || Number(match[1]) !== expected.issue || pr.base.ref !== expected.base)) throw Error('Implementation changed during review');
  return { number: pr.number, issue: Number(match[1]), head: pr.head.sha, branch: pr.head.ref, base: pr.base.ref, url: pr.html_url };
}

export function checkAlignedImplementationPullRequest(pr, repository, alignment) {
  const parent = alignment?.parent, expected = parent?.pullRequest;
  if (parent?.stage !== 'implement' || parent.review || !expected || pr?.number !== expected.number || !pr.draft) throw Error('Aligned implementation PR is not eligible');
  return checkImplementationPullRequest(pr, repository, { issue: parent.issue, head: expected.head, branch: expected.branch, base: alignment.defaultBranch });
}

export async function loadProposalReview(api, repo, owner, event, eventName, implementation = false) {
  const number = reviewTarget(event, eventName);
  if (!number) return null;
  const pr = await api(`pulls/${number}`), target = (implementation ? checkImplementationPullRequest : checkProposal)(pr, repo);
  const kind = eventName === 'pull_request_review' ? 'review' : eventName === 'pull_request_review_comment' ? 'inline' : 'comment';
  const id = kind === 'review' ? event.review?.id : event.comment?.id;
  if (!Number.isSafeInteger(id) || id < 1) throw Error('Missing feedback identity');
  const path = kind === 'review' ? `pulls/${number}/reviews/${id}` : kind === 'inline' ? `pulls/comments/${id}` : `issues/comments/${id}`;
  const feedback = await api(path);
  if (feedback.user?.login !== owner || feedback.user.type === 'Bot') throw Error('Feedback is not from the repository owner');
  if (kind === 'comment' && feedback.issue_url !== `https://api.github.com/repos/${repo}/issues/${number}` || kind === 'inline' && feedback.pull_request_url !== `https://api.github.com/repos/${repo}/pulls/${number}`) throw Error('Feedback belongs to another PR');
  if (kind !== 'comment' && feedback.commit_id !== target.head) throw Error('Feedback targets an older proposal commit; review the current diff');
  const approved = kind === 'review' && feedback.state?.toLowerCase() === 'approved';
  if (kind === 'review' && !['approved', 'commented', 'changes_requested'].includes(feedback.state?.toLowerCase())) throw Error('Review is not submitted feedback');
  const inline = kind === 'review' ? await api(`pulls/${number}/reviews/${id}/comments?per_page=100`) : [];
  if (inline.length >= 100) throw Error('Review exceeds bounded feedback collection');
  const body = [feedback.body, ...inline.map(c => `${c.path}:${c.line ?? c.original_line}\n${c.body}`)].filter(Boolean).join('\n\n');
  if (!approved && !body.trim()) throw Error('No review feedback to apply');
  return { ...target, kind, id, path, feedback: body, feedbackDigest: digest(JSON.stringify(feedback)), receipt: `<!-- lighthouse-review:${kind}:${id}:${digest(JSON.stringify(feedback))} -->`, url: pr.html_url, feedbackUrl: feedback.html_url, approved };
}

export async function reviewThread(api, number, owner) {
  const messages = [];
  for (const path of [`issues/${number}/comments`, `pulls/${number}/comments`, `pulls/${number}/reviews`]) {
    const rows = await api(`${path}?per_page=100`);
    if (rows.length >= 100) throw Error('Proposal discussion exceeds bounded collection');
    for (const c of rows) if (c.user?.login === owner && c.user.type !== 'Bot' && (!c.state || ['commented', 'changes_requested'].includes(c.state.toLowerCase()))) messages.push({ id: c.id, body: c.body, path: c.path, url: c.html_url, updated: c.updated_at, submitted: c.submitted_at });
  }
  return messages;
}

export async function loadProposalFiles(api, review) {
  const changed = await api(`pulls/${review.number}/files?per_page=100`);
  const root = proposalRoot(review.issue);
  if (changed.length >= 100 || changed.some(f => (!review.productProposal || f.filename.startsWith(`${root}/`)) && (!f.filename.startsWith(`${root}/`) || f.status === 'removed' || f.status === 'renamed'))) throw Error('Proposal PR includes unsupported proposal changes');
  const files = [];
  for (const f of changed) {
    if (!f.filename.startsWith(`${root}/`)) continue;
    const value = await api(`contents/${f.filename}?ref=${review.head}`);
    if (value.type !== 'file' || value.encoding !== 'base64' || value.size > 96000) throw Error('Unsupported proposal file');
    const content = Buffer.from(value.content, 'base64').toString('utf8');
    if (f.filename === `${root}/.openspec.yaml`) { if (/^skip_specs:\s*true\s*$/m.test(content)) files.push({ path: f.filename, content: 'skip_specs: true\n' }); continue; }
    files.push({ path: f.filename, content });
  }
  return validateProposalFiles(files, review.issue);
}

export async function checkReviewCurrent(api, repo, review, implementation = false) {
  (implementation ? checkImplementationPullRequest : checkProposal)(await api(`pulls/${review.number}`), repo, review);
  if (digest(JSON.stringify(await api(review.path))) !== review.feedbackDigest) throw Error('Review feedback changed; no update published');
}

export async function updateProposal(api, repo, snapshot, files, beforeWrite) {
  const review = snapshot.proposalReview;
  const commit = await api(`git/commits/${review.head}`);
  const old = await loadProposalFiles(api, review);
  const removed = old.filter(f => !files.some(n => n.path === f.path)).map(f => ({ path: f.path, mode: '100644', type: 'blob', sha: null }));
  const tree = await api('git/trees', 'POST', { base_tree: commit.tree.sha, tree: [...files.map(f => ({ path: f.path, mode: '100644', type: 'blob', content: f.content })), ...removed] });
  const created = await api('git/commits', 'POST', { message: `docs: address proposal review for #${snapshot.issue}`, tree: tree.sha, parents: [review.head] });
  await beforeWrite();
  await checkReviewCurrent(api, repo, review);
  const current = review.productProposal ? await api(`pulls/${review.number}`) : null;
  const proof = current ? productProposalProof(current) : null;
  if (review.productProposal && (!proof || current.head.sha !== review.head)) throw Error('Product proposal changed before publication');
  // Non-forced update rejects a concurrent writer after the final head check.
  await api(`git/refs/heads/${review.branch}`, 'PATCH', { sha: created.sha, force: false });
  if (proof) await api(`pulls/${review.number}`, 'PATCH', { body: current.body.replace(/<!-- lighthouse-product-proposal:\{[^\n]*\} -->/g, `<!-- lighthouse-product-proposal:${JSON.stringify({ ...proof, runId: snapshot.runId, head: created.sha })} -->`) });
  return { number: review.number, html_url: review.url };
}
