export const verificationBranch = (number, head) => `lighthouse/verification-${number}-${head}`;

export function verificationPush(run, number = null) {
  const match = typeof run.head_branch === 'string' && run.head_branch.match(/^lighthouse\/verification-([1-9][0-9]*)-([a-f0-9]{40})$/);
  return run.event === 'push' && !!match && Number.isSafeInteger(Number(match[1])) && (number === null || Number(match[1]) === number) && match[2] === run.head_sha;
}

export function ciRunMatches(run, target) {
  return /^[a-f0-9]{40}$/.test(target.head ?? '') && run.head_sha === target.head && (typeof target.branch === 'string' && run.head_branch === target.branch || Number.isSafeInteger(target.number) && verificationPush(run, target.number));
}
