export const riskAssessment = () => ({
  schemaVersion: 1,
  inherentRisk: { level: 'routine', reversible: true, reason: 'One reversible comparison; callers retain the same interface.', dependents: ['The local boundary caller; equality is its only changed result.'] },
  scope: [
    { path: 'src/feature/rule.mjs', reason: 'Correct the inclusive comparison without changing its exported signature.' },
    { path: 'tests/edge.test.mjs', reason: 'Assert equality and the adjacent lower value.' },
  ],
  defects: { status: 'none', reason: 'No outstanding findings in the bounded assessment; actual checks remain separately required.' },
  evidence: { confidence: 'sufficient', reason: 'The original issue and relevant caller identify the boundary; host checks and independent review are still required.' },
});

export const riskPolicy = () => ({ schemaVersion: 1, reason: 'Authentication and irreversible data operations need the project owner.', stopPaths: ['src/feature/auth/'] });
