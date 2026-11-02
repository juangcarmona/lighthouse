import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createMemorySession } from '../../packages/sdlc/src/memory.mjs';
import { openSqliteMemoryProvider } from '../../packages/sdlc/src/memory-sqlite.mjs';

export const now = Date.parse('2026-11-02T12:00:00Z');
export const grant = (overrides = {}) => ({ projectId: 'sample', repository: 'example/sample', runId: 'run-1', workItem: '272', revision: 'revision-a', owner: 'operator', scopes: ['run', 'project'], topics: ['testing'], maxResults: 2, read: true, write: true, manage: true, ...overrides });
export const finding = (overrides = {}) => ({ id: 'finding-1', scope: 'project', projectId: 'sample', repository: 'example/sample', runId: 'run-1', workItem: '272', revision: 'revision-a', owner: 'operator', source: 'test-report:272', provenance: ['execution:run-1'], confidence: 'verified', sensitivity: 'non-sensitive', retention: '2026-12-01T00:00:00Z', topics: ['testing'], value: { finding: 'Use the repository verification command before publishing.' }, ...overrides });
// A fixture-only assessor for synthetic data, not a production privacy scanner.
export const policy = (overrides = {}) => ({ enabled: true, operatorApproved: true, isEligible: (record) => !JSON.stringify(record).includes('private-fixture'), ...overrides });

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [filename, runId, action] = process.argv.slice(2);
  const provider = await openSqliteMemoryProvider({ filename, disposableRoots: [join(dirname(filename), 'worker')] });
  const memory = createMemorySession({ provider, policy: policy({ enabled: action !== 'disabled' }), grant: grant({ runId }), clock: () => now });
  let result;
  if (action === 'retain') result = memory.retain(finding({ runId }));
  else if (action === 'invalidate') result = memory.invalidate({ scope: 'project', id: 'finding-1', expectedVersion: 1, source: 'operator-review:272', reason: 'Replaced verification guidance' });
  else result = memory.recall({ topics: ['testing'] });
  provider.close?.();
  console.log(JSON.stringify(result));
}
