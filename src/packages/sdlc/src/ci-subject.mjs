export const verificationBranch = (number, head) => `lighthouse/verification-${number}-${head}`;

export function verificationPullRequest(run) {
  const match = typeof run.head_branch === 'string' && run.head_branch.match(/^lighthouse\/verification-([1-9][0-9]*)-([a-f0-9]{40})$/);
  return run.event === 'push' && !!match && Number.isSafeInteger(Number(match[1])) && match[2] === run.head_sha ? Number(match[1]) : null;
}

export function verificationPush(run, number = null) {
  const subject = verificationPullRequest(run);
  return subject !== null && (number === null || subject === number);
}

export function ciRunMatches(run, target) {
  return /^[a-f0-9]{40}$/.test(target.head ?? '') && run.head_sha === target.head && (typeof target.branch === 'string' && run.head_branch === target.branch || Number.isSafeInteger(target.number) && verificationPush(run, target.number));
}

export async function currentMergeSubject(api, pr, base) {
  if (!/^[a-f0-9]{40}$/.test(base ?? '') || !/^[a-f0-9]{40}$/.test(pr.head?.sha ?? '')) throw Error('CI head or base reference is unavailable');
  const comparison = await api(`compare/${base}...${pr.head.sha}`);
  if (!Number.isSafeInteger(comparison.behind_by) || comparison.behind_by < 0 || comparison.base_commit?.sha !== base) throw Error('CI base comparison is unavailable');
  if (comparison.behind_by === 0) return null;
  if (!/^[a-f0-9]{40}$/.test(pr.merge_commit_sha ?? '')) throw Error('CI current merge commit is unavailable');
  const merge = await api(`git/commits/${pr.merge_commit_sha}`);
  if (merge.sha !== pr.merge_commit_sha || base === pr.head.sha || merge.parents?.length !== 2 || !merge.parents.some(p => p.sha === base) || !merge.parents.some(p => p.sha === pr.head.sha)) throw Error('CI merge subject does not bind the current head and base');
  return { head: merge.sha, sourceHead: pr.head.sha };
}
