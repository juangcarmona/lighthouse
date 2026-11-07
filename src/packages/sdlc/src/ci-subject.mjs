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

export async function needsVerificationRefresh(api, pr, base) {
  if (pr.mergeable_state !== 'behind' || !/^[a-f0-9]{40}$/.test(pr.merge_commit_sha ?? '')) return false;
  if ((await api(`git/ref/heads/${pr.base.ref}`)).object?.sha !== base) throw Error('Verification base changed');
  const merge = await api(`git/commits/${pr.merge_commit_sha}`);
  if (merge.sha !== pr.merge_commit_sha || merge.parents?.length !== 2 || merge.parents[1]?.sha !== pr.head.sha || !/^[a-f0-9]{40}$/.test(merge.parents[0]?.sha ?? '')) throw Error('Verification merge parents changed');
  const prior = merge.parents[0].sha;
  if (prior === base) return false;
  const comparison = await api(`compare/${prior}...${base}`);
  if (comparison.base_commit?.sha !== prior || comparison.status !== 'ahead' || comparison.behind_by !== 0 || !Number.isSafeInteger(comparison.ahead_by) || comparison.ahead_by < 1) throw Error('Verification merge base is not an ancestor of the current base');
  return true;
}

export async function observeVerificationMerge(api, expected, base, wait = ms => new Promise(resolve => setTimeout(resolve, ms))) {
  for (let attempt = 0; attempt < 20; attempt++) {
    const current = await api(`pulls/${expected.number}`);
    if (current.number !== expected.number || current.state !== 'open' || current.merged || current.head?.sha !== expected.head.sha || current.head?.ref !== expected.head.ref || current.head?.repo?.full_name !== expected.head.repo?.full_name || current.base?.ref !== expected.base.ref || current.base?.repo?.full_name !== expected.base.repo?.full_name || (await api(`git/ref/heads/${expected.base.ref}`)).object?.sha !== base) throw Error('Verification head or base changed during merge observation');
    try { await currentMergeSubject(api, current, base); return current; }
    catch (error) {
      if (!['CI current merge commit is unavailable', 'CI merge subject does not bind the current head and base'].includes(error.message) || attempt === 19) throw error;
    }
    await wait(250);
  }
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
