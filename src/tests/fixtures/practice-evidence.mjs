import { observationPayload, practiceDigest } from '../../packages/sdlc/src/practice-observation.mjs';
export const context = { repository: { id: 42, fullName: 'example/project' }, ref: 'refs/heads/main', commit: 'a'.repeat(40), scope: { id: 'production', modules: ['core'] }, profile: 'library' };
export function observation(practice = 'tests', measurements = { declared: 4, executed: 4, passed: 4, failed: 0 }) {
  const value = { schemaVersion: 1, catalogVersion: '1.0.0', definitionVersion: '1.0.0', practice,
    repository: context.repository, ref: context.ref, commit: context.commit, scope: context.scope, mode: 'blocking',
    applicability: { status: 'applicable', profile: 'library', reason: 'Production scope', source: 'https://example.com/scope' },
    collection: { expected: 1, collected: 1, exclusions: [] }, measurements,
    source: { workflow: '.github/workflows/ci.yml', runId: 123, attempt: 1, jobId: 456, url: 'https://example.com/run/123', result: 'success', observedAt: '2026-11-16T12:00:00Z', producer: { name: 'tests', version: '1.0.0' }, reportDigest: '' } };
  return seal(value);
}
export function seal(value) { value.source.reportDigest = practiceDigest(observationPayload(value)); return value; }

