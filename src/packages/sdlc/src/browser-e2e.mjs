const statuses = new Set(['passed', 'failed', 'unavailable', 'pending-review']);
const artifactTypes = new Set(['screenshot', 'trace', 'video', 'report']);

function issue(code, message, field) {
  return field ? { code, message, field } : { code, message };
}

function record(value) {
  return value && typeof value === 'object' && !Array.isArray(value);
}

export function validateBrowserEvidence(value) {
  const errors = [];
  if (!record(value)) return [issue('browser-e2e.invalid', 'browser evidence must be an object')];
  if (value.schemaVersion !== 1) errors.push(issue('browser-e2e.schema-version', 'schemaVersion must be 1', 'schemaVersion'));
  if (value.runner !== 'playwright') errors.push(issue('browser-e2e.runner', 'runner must be playwright', 'runner'));
  if (!record(value.journey) || typeof value.journey.id !== 'string' || !value.journey.id.trim() || typeof value.journey.boundedContext !== 'string' || !value.journey.boundedContext.trim()) {
    errors.push(issue('browser-e2e.journey', 'journey needs an id and boundedContext', 'journey'));
  }
  if (typeof value.command !== 'string' || !value.command.trim()) errors.push(issue('browser-e2e.command', 'command must be a non-empty string', 'command'));
  if (!statuses.has(value.status)) errors.push(issue('browser-e2e.status', `status must be one of ${[...statuses].join(', ')}`, 'status'));
  if (!Array.isArray(value.evidence) || value.evidence.length === 0) errors.push(issue('browser-e2e.evidence', 'evidence must contain at least one item', 'evidence'));
  else {
    const ids = new Set();
    for (const [index, item] of value.evidence.entries()) {
      if (!record(item) || typeof item.id !== 'string' || !item.id.trim() || !statuses.has(item.status) || typeof item.source !== 'string' || !item.source.trim()) {
        errors.push(issue('browser-e2e.evidence-item', `evidence[${index}] needs an id, supported status and source`, `evidence[${index}]`));
        continue;
      }
      if (ids.has(item.id)) errors.push(issue('browser-e2e.evidence-duplicate', `evidence id ${item.id} is duplicated`, `evidence[${index}]`));
      ids.add(item.id);
      if (['failed', 'unavailable', 'pending-review'].includes(item.status) && (typeof item.reason !== 'string' || !item.reason.trim())) errors.push(issue('browser-e2e.evidence-reason', `evidence[${index}] needs a reason for status ${item.status}`, `evidence[${index}]`));
    }
  }
  if (!Array.isArray(value.artifacts)) errors.push(issue('browser-e2e.artifacts', 'artifacts must be an array', 'artifacts'));
  else for (const [index, artifact] of value.artifacts.entries()) {
    if (!record(artifact) || !artifactTypes.has(artifact.type) || typeof artifact.path !== 'string' || !artifact.path.trim() || artifact.path.startsWith('/')) errors.push(issue('browser-e2e.artifact', `artifacts[${index}] needs a relative path and supported type`, `artifacts[${index}]`));
  }
  if (value.status === 'passed' && (!value.artifacts?.length || value.evidence?.some((item) => item.status !== 'passed'))) errors.push(issue('browser-e2e.passed-evidence', 'passed browser evidence needs artifacts and only passed evidence items', 'status'));
  if (value.status !== 'passed' && value.evidence?.every((item) => item.status === 'passed')) errors.push(issue('browser-e2e.status-evidence', `status ${value.status} needs a matching evidence item`, 'status'));
  if (typeof value.nextAction !== 'string' || !value.nextAction.trim()) errors.push(issue('browser-e2e.next-action', 'nextAction must be a non-empty string', 'nextAction'));
  return errors;
}

export function browserEvidenceReport(value) {
  const errors = validateBrowserEvidence(value);
  return { schemaVersion: 1, status: errors.length ? 'invalid' : value.status, valid: errors.length === 0, errors, journey: value.journey ?? null, runner: value.runner ?? null, artifacts: value.artifacts ?? [] };
}
