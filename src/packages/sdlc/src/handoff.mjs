const headings = {
  requested: 'Requested', queued: 'Queued', working: 'Working', question: 'Waiting for your answer',
  review: 'Ready for your review', failed: 'Execution failed', cancelled: 'Cancelled',
  completed: 'Stage completed', unknown: 'Execution status unknown', blocked: 'Blocked',
};

export function pendingQuestion(value) {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string' || !value.trim() || value.length > 4000 || /<!--\s*lighthouse-/i.test(value)) throw Error('Invalid pending question');
  return value.trim();
}

export function resultHandoffState({ status, stage, question, reviewTarget, draft }) {
  if (!['passed', 'blocked'].includes(status)) throw Error('Unvalidated stage outcome');
  const review = status === 'passed' && reviewTarget === true;
  return {
    status: question ? 'question' : review ? 'review' : status === 'blocked' ? 'blocked' : 'completed',
    label: question ? 'needs-info' : stage === 'implement' && draft ? 'pr-draft' : review ? 'waiting-review' : status === 'passed' && ['triage', 'refine'].includes(stage) ? stage === 'triage' ? 'triaged' : 'ready' : null,
    review,
  };
}

export function handoff({ status, stage, happened, action, next, link, details }) {
  if (!headings[status] || !stage || !happened || !action || !next) throw Error('Incomplete handoff');
  if (status === 'review' && !link) throw Error('Review handoff needs an identified result');
  return `## ${headings[status]} · ${stage}\n\n${happened}\n\nYour next action:\n${action}\n\nWhat happens next:\n${next}${link ? `\n\n${link}` : ''}${details ? `\n\n<details><summary>Execution details</summary>\n\n${details}\n</details>` : ''}`;
}

// A newer authenticated dispatch owns current status, even if an older cleanup finishes late.
export async function publishObservedStop(api, { repository, issue, stage, run, attempt, dispatch, observation, sourceRevision, answerRetained = false }) {
  if (!['failure', 'cancelled', 'preparation-failure', 'publication-unknown'].includes(observation) || !dispatch?.commentId) return false;
  const { checkDispatchClaim, issueComments, readDispatchReceipt } = await import('./stage-dispatch.mjs');
  await checkDispatchClaim(api, repository, issue, dispatch, run);
  const comments = await issueComments(api, issue);
  for (const comment of comments) {
    if (Number(comment.id) <= Number(dispatch.commentId) || comment.user?.login !== 'github-actions[bot]' || comment.user.type !== 'Bot' || !comment.body.includes('<!-- lighthouse-dispatch:')) continue;
    readDispatchReceipt(comment, repository, issue);
    return false;
  }
  const marker = `<!-- lighthouse-stop:${run}:${attempt} -->`;
  if (comments.some(c => c.user?.login === 'github-actions[bot]' && c.user.type === 'Bot' && c.body.includes(marker))) return true;
  const item = await api(`issues/${issue}`);
  if (item.state !== 'open' || item.labels.some(l => l.name === 'human-working')) return false;
  await checkDispatchClaim(api, repository, issue, dispatch, run);
  let adopted = false;
  if (['failure', 'preparation-failure'].includes(observation) && /^[a-f0-9]{40}$/.test(sourceRevision ?? '')) {
    const file = await api(`contents/.lighthouse/reconciliation/labels.json?ref=${sourceRevision}`, 'GET', undefined, true);
    if (file?.encoding === 'base64' && typeof file.content === 'string') {
      try { const record = JSON.parse(Buffer.from(file.content, 'base64').toString('utf8')); adopted = record.verified === true && record.capability?.id === 'labels' && record.capability?.provider === 'github' && Number(record.capability?.version) >= 3; } catch {}
    }
  }
  const available = adopted && await api('labels/execution-failed', 'GET', undefined, true);
  if (available) await api(`issues/${issue}/labels`, 'POST', { labels: ['execution-failed'] });
  const status = observation === 'cancelled' ? 'cancelled' : observation === 'publication-unknown' ? 'unknown' : 'failed';
  const result = observation === 'publication-unknown' ? 'Publication did not complete cleanly; its effects and final result are not confirmed.' : observation === 'preparation-failure' ? 'Preparation failed before the agent started; no validated result was published.' : observation === 'failure' ? 'The agent execution failed before a validated result could be published.' : 'The agent execution was cancelled before a validated result could be published.';
  const gap = ['failure', 'preparation-failure'].includes(observation) && !available ? ' The execution-failed label is not adopted or available; the maintainer must review label capability adoption.' : '';
  const body = handoff({ status, stage, happened: `${result}${answerRetained ? ' The recorded answer remains available.' : ''}${gap}`, action: 'The workflow maintainer should inspect the execution and configured recovery policy.', next: observation === 'publication-unknown' ? 'Reconcile the actual effects before any authorized retry.' : 'Recovery follows the configured policy and requires its existing authorization.', link: `[Execution](https://github.com/${repository}/actions/runs/${run})`, details: marker });
  await api(`issues/${issue}/comments`, 'POST', { body });
  return true;
}
