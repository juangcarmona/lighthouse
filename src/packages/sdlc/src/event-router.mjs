// Facts must be authenticated by the host before routing and rechecked before publication.
export function routeEvent(facts, policy) {
  if (facts.repository !== policy.repository || facts.actor !== policy.owner) return { action: 'ignore', reason: 'actor is not an authorized engineer' };
  if (facts.event !== 'issues' || facts.action !== 'labeled' || facts.label !== 'refine') return { action: 'ignore', reason: 'unrelated event' };
  if (policy.directRefine !== true || !policy.stages?.includes('refine')) return { action: 'reject', reason: 'direct refinement is not enabled' };
  if (facts.isPullRequest || facts.state !== 'open') return { action: 'reject', reason: 'work item must be an open issue' };
  if (!Number.isSafeInteger(facts.eventId) || facts.eventId < 1) return { action: 'reject', reason: 'verified label event is required' };
  if (facts.labels?.some((label) => ['human-working', 'agent-working'].includes(label))) return { action: 'reject', reason: 'work item is occupied' };
  return { action: 'run', stage: 'refine', route: 'supervised', authorization: { kind: 'label', actor: facts.actor, eventId: facts.eventId } };
}
