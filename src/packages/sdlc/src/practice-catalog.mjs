const version = '1.0.0';
const criteria = { secrets: { confirmedSecrets: 0 }, vulnerabilities: { critical: 0, high: 0 }, sast: { blocking: 0 }, tests: { allDeclaredExecuteAndPass: true }, coverage: { lines: 80, branches: 70, perModule: true }, specifications: { format: 'gherkin', allDeclaredExecuteAndPass: true }, sbom: { identifiedDocument: true }, licenses: { versionedPolicy: true, violations: 0 }, complexity: { cyclomatic: 15, crap: 30, perMethod: true }, dast: { critical: 0, high: 0 }, mutation: { coveredScore: 80, informational: true } };
const practices = [
  ['secrets', 1, ['confirmedSecrets'], 'Zero confirmed secrets'],
  ['vulnerabilities', 1, ['critical', 'high'], 'Zero unresolved critical or high findings'],
  ['sast', 1, ['blocking'], 'Zero blocking findings'],
  ['tests', 1, ['declared', 'executed', 'passed', 'failed'], 'All applicable declared tests execute and pass'],
  ['coverage', 2, ['modules'], 'Every production module: lines >= 80%, branches >= 70%'],
  ['specifications', 2, ['format', 'declared', 'executed', 'passed', 'failed'], 'Applicable Gherkin specifications execute and pass'],
  ['sbom', 2, ['format', 'documentDigest', 'components'], 'An identified machine-readable SBOM covers the assessed scope'],
  ['licenses', 2, ['policy', 'assessed', 'violations'], 'An explicit versioned license policy passes'],
  ['complexity', 3, ['modules', 'methods'], 'Every applicable production method: cyclomatic <= 15, CRAP <= 30'],
  ['dast', 3, ['critical', 'high'], 'Zero unresolved critical or high findings on the HTTP application surface'],
  ['mutation', null, ['coveredScore', 'fullScore', 'killed', 'survived', 'timedOut', 'uncovered', 'modules'], 'Covered-code target 80%; informational and nonblocking'],
  ['hygiene', null, ['checks'], 'Complementary observations; no common level threshold'],
  ['performance', null, ['measurements'], 'Complementary measurements; no common level threshold'],
  ['restoration', null, ['exercises'], 'Complementary executed restoration evidence; no common level threshold'],
].map(([id, level, measurements, quality]) => ({ id, definitionVersion: version, level, measurements, quality, criteria: criteria[id] ?? {},
  evidence: 'Exact execution report with measured scope, exclusions, producer and source attempt',
  enforcement: level === null ? 'report-only' : 'blocking-ci-and-merge',
  applicability: id === 'dast' ? 'HTTP application surface; a library or CLI without that surface may justify not-applicable' : 'Applicable to the assessed production scope',
}));
function freeze(value) { if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); } return value; }
export const practiceCatalog = freeze({ schemaVersion: 1, version, levelVersion: version, maximumAgeDays: 14, emptyBranchSet: 'Not applicable only when the measured branch total is exactly zero',
  profiles: { library: { httpSurface: false }, cli: { httpSurface: false }, 'http-service': { httpSurface: true }, 'web-application': { httpSurface: true } },
  levelRules: { L0: 'A verified failing or below-standard L1 assessment; absence never qualifies', L1: 'All applicable basic security and test practices with mandatory enforcement', L2: 'L1 plus coverage, specifications, SBOM and licenses', L3: 'L2 plus complexity and applicable DAST' },
  levels: { L0: [], L1: practices.filter(p => p.level === 1).map(p => p.id), L2: practices.filter(p => p.level && p.level <= 2).map(p => p.id), L3: practices.filter(p => p.level).map(p => p.id) }, practices,
});
export const practiceStates = freeze(['met', 'below-standard', 'failing', 'missing', 'partial', 'stale', 'unavailable', 'not-applicable']);
