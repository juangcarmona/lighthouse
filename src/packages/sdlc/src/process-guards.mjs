const text = value => typeof value === 'string' && value.trim() && value.length <= 4000;
const exact = (value, keys) => value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).sort().join(',') === [...keys].sort().join(',');
const evidence = value => Array.isArray(value) && value.length > 0 && value.length <= 20 && value.every(text);
const revision = value => /^[a-f0-9]{40}$/.test(value ?? '');

export const processGuardContract = { schemaVersion: 1, outcome: 'recorded | no-guard', reason: 'Evidence-based disposition; unqualified proposals stay in the retrospective.', records: 'Verified records follow /harness/process-guards.md; no-guard uses an empty array.' };

export function validateProcessGuards(value) {
  if (!exact(value, ['schemaVersion', 'outcome', 'reason', 'records']) || value.schemaVersion !== 1 || !['recorded', 'no-guard'].includes(value.outcome) || !text(value.reason) || !Array.isArray(value.records) || value.records.length > 20) return ['Process guard review requires its version, disposition, reason and bounded records'];
  const errors = [], ids = new Set();
  if ((value.outcome === 'no-guard') !== (value.records.length === 0)) errors.push('Process guard disposition and verified records disagree');
  for (const record of value.records) {
    if (!exact(record, ['id', 'version', 'failure', 'owner', 'source', 'check', 'adoption', 'observations']) || !/^[a-z][a-z0-9-]{2,63}$/.test(record.id ?? '') || !/^\d+\.\d+\.\d+$/.test(record.version ?? '') || ids.has(record.id) || !text(record.owner) || !text(record.source)) { errors.push('Process guard record identity or ownership is invalid'); continue; }
    ids.add(record.id);
    if (!exact(record.failure, ['claim', 'outcome', 'codeDefect', 'processGap', 'evidence']) || !['claim', 'outcome', 'codeDefect', 'processGap'].every(key => text(record.failure[key])) || !evidence(record.failure.evidence)) errors.push(`${record.id}: distinguish the original claim, outcome, code defect and process gap with evidence`);
    const check = record.check;
    if (!exact(check, ['command', 'red', 'green']) || !text(check.command)) errors.push(`${record.id}: identify the smallest owning check`);
    for (const name of ['red', 'green']) {
      const result = check?.[name];
      if (!exact(result, ['revision', 'exitCode', 'evidence']) || !revision(result.revision) || !Number.isInteger(result.exitCode) || (name === 'red' ? result.exitCode < 1 || result.exitCode > 255 : result.exitCode !== 0) || !evidence(result.evidence)) errors.push(`${record.id}: ${name} requires its actual revision, behavioral exit status and evidence`);
    }
    if (!exact(record.adoption, ['version', 'scope', 'rollback', 'retireWhen', 'followUp']) || !Object.values(record.adoption).every(text)) errors.push(`${record.id}: retain adoption, rollback, retirement and follow-up ownership`);
    if (!exact(record.observations, ['recurrence', 'falsePositives', 'maintenanceCost']) || !Object.values(record.observations).every(text)) errors.push(`${record.id}: retain pilot observations or explicit unavailable reasons`);
  }
  return errors;
}
