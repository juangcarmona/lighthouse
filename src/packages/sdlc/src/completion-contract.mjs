import { createHash } from 'node:crypto';

export const fingerprint = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
export const sha = value => /^[a-f0-9]{40}$/.test(value ?? '');
export function authorizeCompletion(event, env, stage) {
  const input = event.inputs ?? {};
  if (env.GITHUB_EVENT_NAME !== 'workflow_dispatch' || env.GITHUB_ACTOR !== env.GITHUB_REPOSITORY_OWNER || env.GITHUB_TRIGGERING_ACTOR !== env.GITHUB_REPOSITORY_OWNER || input.stage !== stage || !['integrate', 'review'].includes(stage)) throw Error('Completion requires a fresh owner dispatch');
  if (!/^[1-9][0-9]*$/.test(input.issue ?? '') || !/^[1-9][0-9]*$/.test(input.pull_request ?? '') || !sha(input.head)) throw Error('Issue, pull request and full accepted head SHA are required');
  if (!['false', 'true', false, true, undefined].includes(input.merge)) throw Error('Invalid merge authorization');
  const merge = input.merge === true || input.merge === 'true';
  if (stage === 'review' && merge) throw Error('Review cannot authorize a merge');
  return { issue: Number(input.issue), pr: Number(input.pull_request), head: input.head, merge };
}
