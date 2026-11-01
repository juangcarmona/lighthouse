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

export function visibleNextAction(value) {
  if (typeof value !== 'string' || !value.trim() || value.length > 4000) return 'The workflow maintainer must inspect the recorded result for the next action.';
  return value.trim().replace(/<!--(?=\s*lighthouse-)/gi, '&lt;!--');
}

export function productApplyObservation({ prepare, apply, publish }) {
  if (prepare === 'failure' || prepare === 'timed_out') return 'provider-preparation-failure';
  if (prepare === 'cancelled') return 'preparation-cancelled';
  if (apply === 'failure' || apply === 'timed_out') return 'provider-failure';
  if (apply === 'cancelled') return 'provider-cancelled';
  if (apply === 'success' && ['failure', 'timed_out', 'cancelled', 'skipped'].includes(publish)) return 'publication-unknown';
  return null;
}

export function productPublicationMessage({ worker, outcome, reviewTarget, agentMessage }) {
  return worker === 'product-change' && outcome === 'candidate' && reviewTarget ? 'The Product Change candidate passed provider overlay and OpenSpec validation and is ready for your product decision.' : agentMessage;
}

export function workerStopObservation({ preActivation, activation, agent, publish }) {
  if (agent === 'skipped' && [preActivation, activation].some(value => value === 'failure' || value === 'timed_out')) return 'activation-failure';
  if (agent === 'skipped' && [preActivation, activation].includes('cancelled')) return 'pre-agent-cancelled';
  if (agent === 'failure' || agent === 'cancelled') return agent;
  if (agent === 'success' && publish === 'failure') return 'publication-unknown';
  return null;
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
export async function publishObservedStop(api, { repository, issue, stage, run, attempt, dispatch, observation, sourceRevision, answerRetained = false, preparationReason }) {
  if (!['failure', 'cancelled', 'pre-agent-cancelled', 'preparation-failure', 'provider-preparation-failure', 'preparation-cancelled', 'activation-failure', 'provider-failure', 'provider-cancelled', 'publication-unknown', 'cleanup-failure'].includes(observation) || !dispatch?.commentId) return false;
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
  if (['failure', 'preparation-failure', 'provider-preparation-failure', 'activation-failure', 'provider-failure'].includes(observation) && /^[a-f0-9]{40}$/.test(sourceRevision ?? '')) {
    const file = await api(`contents/.lighthouse/reconciliation/labels.json?ref=${sourceRevision}`, 'GET', undefined, true);
    if (file?.encoding === 'base64' && typeof file.content === 'string') {
      try { const record = JSON.parse(Buffer.from(file.content, 'base64').toString('utf8')); adopted = record.verified === true && record.capability?.id === 'labels' && record.capability?.provider === 'github' && Number(record.capability?.version) >= 3; } catch {}
    }
  }
  const available = adopted && await api('labels/execution-failed', 'GET', undefined, true);
  if (available) await api(`issues/${issue}/labels`, 'POST', { labels: ['execution-failed'] });
  const status = ['cancelled', 'pre-agent-cancelled', 'preparation-cancelled', 'provider-cancelled'].includes(observation) ? 'cancelled' : observation === 'publication-unknown' ? 'unknown' : observation === 'cleanup-failure' ? 'blocked' : 'failed';
  const missingChecks = observation === 'preparation-failure' && preparationReason === 'missing-implementation-checks';
  const result = observation === 'cleanup-failure' ? 'The validated result was published, but reservation cleanup did not complete.' : observation === 'publication-unknown' ? 'Publication did not complete cleanly; its effects and final result are not confirmed.' : missingChecks ? 'Preparation stopped because the repository has no implementation verification policy; the agent did not start.' : observation === 'preparation-failure' ? 'Preparation failed before the agent started; no validated result was published.' : observation === 'provider-preparation-failure' ? 'Product Change preparation failed before the provider started.' : observation === 'preparation-cancelled' ? 'Preparation was cancelled before work started; no validated result was published.' : observation === 'activation-failure' ? 'The execution environment failed before the agent started; no validated result was published.' : observation === 'provider-failure' ? 'The credential-free Product Change provider failed before publication.' : observation === 'provider-cancelled' ? 'The credential-free Product Change provider was cancelled before publication.' : observation === 'pre-agent-cancelled' ? 'The execution was cancelled before the agent started; no validated result was published.' : observation === 'failure' ? 'The agent execution failed before a validated result could be published.' : 'The execution was cancelled before a validated result could be published.';
  const gap = ['failure', 'preparation-failure', 'provider-preparation-failure', 'activation-failure', 'provider-failure'].includes(observation) && !available ? ' The execution-failed label is not adopted or available; the maintainer must review label capability adoption.' : '';
  const reservation = item.labels.some(l => l.name === 'agent-working') ? ' The maintainer must also inspect the remaining agent-working reservation and release it only after verifying that no newer worker owns it.' : '';
  const action = (missingChecks ? 'The repository maintainer must configure checks in .lighthouse/implement.json or add npm run verify before requesting implementation again.' : observation === 'publication-unknown' ? 'The workflow maintainer must inspect the linked execution and compare the issue and any linked PR with its publication steps.' : 'The workflow maintainer must inspect the failed or cancelled execution and the configured recovery policy.') + reservation;
  const body = handoff({ status, stage, happened: `${result}${answerRetained ? ' The recorded answer remains available.' : ''}${gap}`, action, next: observation === 'publication-unknown' ? 'Reconcile the actual effects before any authorized retry.' : 'Recovery follows the configured policy and requires its existing authorization.', link: `[Execution](https://github.com/${repository}/actions/runs/${run})`, details: marker });
  await checkDispatchClaim(api, repository, issue, dispatch, run);
  const current = await issueComments(api, issue);
  for (const comment of current) {
    if (Number(comment.id) <= Number(dispatch.commentId) || comment.user?.login !== 'github-actions[bot]' || comment.user.type !== 'Bot' || !comment.body.includes('<!-- lighthouse-dispatch:')) continue;
    readDispatchReceipt(comment, repository, issue);
    return false;
  }
  if (current.some(c => c.user?.login === 'github-actions[bot]' && c.user.type === 'Bot' && c.body.includes(marker))) return true;
  await api(`issues/${issue}/comments`, 'POST', { body });
  return true;
}
