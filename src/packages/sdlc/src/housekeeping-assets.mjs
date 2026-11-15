import { readFileSync } from 'node:fs';
import { registryWorkflow } from './workflow-distribution.mjs';

export const housekeepingRequirements = Object.freeze({
  workflow: '.github/workflows/lighthouse-worker-maintenance.yml',
  configuration: ['LIGHTHOUSE_REPORT_INDEX_ISSUE: open owner-authored report index', 'LIGHTHOUSE_MAINTENANCE_ISSUES: leave unset for repository coverage; a selected subset is not complete repository coverage'],
  explicitActivation: ['LIGHTHOUSE_AUTOMATION_ENABLED=true', 'LIGHTHOUSE_MAINTENANCE_ENABLED=true'],
  runtimeEvidence: 'Not established by installation; inspect lighthouse-daily-housekeeping-<attempt>/daily-housekeeping.json and the report index.',
  publication: 'Package publication is required before package-mode execution; source generation is not publication.',
});

export function housekeepingFiles(version) {
  const source = readFileSync(new URL('../workflows/lighthouse-worker-maintenance.yml', import.meta.url), 'utf8');
  return {
    [housekeepingRequirements.workflow]: registryWorkflow(source, version),
    '.lighthouse/housekeeping.json': JSON.stringify({ schemaVersion: 1, ...housekeepingRequirements, activation: 'explicit repository-variable opt-in; installation never changes variables' }, null, 2) + '\n',
  };
}
