import { practiceCatalog, practiceStates } from './practice-catalog.mjs';
import { canonical, practiceDigest, record, requirePracticeObservation, sourceIdentity, validatePracticeContext } from './practice-observation.mjs';

const count = n => Number.isSafeInteger(n) && n >= 0;
const number = n => typeof n === 'number' && Number.isFinite(n) && n >= 0;
const percent = n => number(n) && n <= 100;
const nonempty = s => typeof s === 'string' && s.length > 0;
const digest = s => /^sha256:[a-f0-9]{64}$/.test(s ?? '');
const outcome = (state, ...gaps) => ({ state, gaps });
const complete = array => Array.isArray(array) && array.length > 0 && array.every(record);
function execution(m) {
  if (!['declared', 'executed', 'passed', 'failed'].every(k => count(m[k])) || m.executed !== m.passed + m.failed || m.executed > m.declared) return outcome('partial', 'incomplete or inconsistent executed-test counts');
  if (m.failed > 0) return outcome('failing', 'executed tests failed');
  if (m.declared === 0 || m.executed !== m.declared) return outcome('partial', 'applicable declared tests did not all execute');
  return outcome('met');
}
function measuredQuality(p, o) {
  const m = o.measurements;
  if (p.measurements.some(k => !Object.hasOwn(m, k))) return outcome('partial', 'required measurements are missing');
  if (['secrets', 'vulnerabilities', 'sast', 'dast'].includes(p.id)) {
    if (!record(m.scanner) || !['name', 'version', 'ruleVersion'].every(k => nonempty(m.scanner[k]))) return outcome('partial', 'scanner and rule versions are missing');
    if (!p.measurements.every(k => count(m[k]))) return outcome('partial', 'security finding counts are incomplete');
    return p.measurements.some(k => m[k] > 0) ? outcome('below-standard', p.quality) : outcome('met');
  }
  if (p.id === 'tests' || p.id === 'specifications') {
    if (p.id === 'specifications' && m.format !== 'gherkin') return outcome('partial', 'executed Gherkin evidence is required');
    return execution(m);
  }
  if (p.id === 'coverage') {
    if (!complete(m.modules) || new Set(m.modules.map(v => v.id)).size !== m.modules.length || m.modules.length !== o.scope.modules.length || o.scope.modules.some(id => !m.modules.some(v => v.id === id))) return outcome('partial', 'coverage does not identify every production module');
    if (m.modules.some(v => !percent(v.lines) || (!percent(v.branches) && !(v.branches === null && v.branchesTotal === 0)) )) return outcome('partial', 'module coverage measurements are incomplete');
    return m.modules.some(v => v.lines < 80 || v.branches !== null && v.branches < 70) ? outcome('below-standard', p.quality) : outcome('met');
  }
  if (p.id === 'sbom') return ['SPDX', 'CycloneDX'].includes(m.format) && digest(m.documentDigest) && count(m.components) && m.components > 0 ? outcome('met') : outcome('partial', 'complete identified SBOM required');
  if (p.id === 'licenses') {
    if (!record(m.policy) || !nonempty(m.policy.id) || !nonempty(m.policy.version) || !digest(m.policy.digest) || !count(m.assessed) || m.assessed === 0 || !count(m.violations)) return outcome('partial', 'explicit versioned license policy and assessed components required');
    return m.violations > 0 ? outcome('below-standard', 'license policy violations') : outcome('met');
  }
  if (p.id === 'complexity') {
    if (!Array.isArray(m.methods) || !complete(m.modules) || new Set(m.modules.map(v => v.id)).size !== m.modules.length || m.modules.length !== o.scope.modules.length || o.scope.modules.some(id => !m.modules.some(v => v.id === id && count(v.declaredMethods) && v.declaredMethods === m.methods.filter(method => method.module === id).length)) || m.methods.some(v => !record(v) || !nonempty(v.id) || !o.scope.modules.includes(v.module) || !number(v.cyclomatic) || !number(v.crap)) || new Set(m.methods.map(v => canonical([v.module, v.id]))).size !== m.methods.length) return outcome('partial', 'complete module/method complexity inventory required');
    return m.methods.some(v => v.cyclomatic > 15 || v.crap > 30) ? outcome('below-standard', p.quality) : outcome('met');
  }
  if (p.id === 'mutation') {
    if (!percent(m.coveredScore) || !percent(m.fullScore) || !['killed', 'survived', 'timedOut', 'uncovered'].every(k => count(m[k])) || !complete(m.modules)) return outcome('partial', 'mutation scores, outcomes and module detail required');
    return m.coveredScore < 80 ? outcome('below-standard', 'informational covered-code target: 80%') : outcome('met');
  }
  return Array.isArray(m[p.measurements[0]]) && m[p.measurements[0]].length > 0 ? outcome('met') : outcome('partial', 'complementary execution detail is missing');
}

export function selectPracticeObservations(observations) {
  if (!Array.isArray(observations) || observations.length > 10000) throw Error('Supply at most 10000 practice observations');
  const byAttempt = new Map(), latest = new Map();
  for (const value of observations) {
    requirePracticeObservation(value);
    const key = sourceIdentity(value), existing = byAttempt.get(key);
    if (existing && canonical(existing) !== canonical(value)) throw Error('Contradictory observations for the same source attempt');
    byAttempt.set(key, value);
  }
  for (const value of byAttempt.values()) {
    const key = sourceIdentity(value, { attempt: false }), existing = latest.get(key);
    if (!existing || value.source.attempt > existing.source.attempt) latest.set(key, value);
  }
  return [...latest.values()].sort((a, b) => canonical([a.practice, a.source.observedAt, a.source.runId]).localeCompare(canonical([b.practice, b.source.observedAt, b.source.runId])));
}

export async function evaluatePractices({ context, observations = [], resolveSource, now = new Date().toISOString() }) {
  const errors = validatePracticeContext(context);
  if (errors.length) throw Error('Invalid practice context: ' + errors.join('; '));
  if (!Number.isFinite(Date.parse(now))) throw Error('An explicit valid evaluation time is required');
  const selected = selectPracticeObservations(observations), reports = [];
  for (const practice of practiceCatalog.practices) {
    const matching = selected.filter(o => o.practice === practice.id && o.repository.id === context.repository.id && o.repository.fullName === context.repository.fullName && o.commit === context.commit && o.ref === context.ref && canonical(o.scope) === canonical(context.scope));
    const o = matching.sort((a, b) => Date.parse(b.source.observedAt) - Date.parse(a.source.observedAt) || b.source.runId - a.source.runId)[0];
    let result, verifiedEnforcement = null;
    const enforcementGaps = [];
    if (!o) result = outcome('missing', 'no exact repository/revision/scope observation');
    else if (o.catalogVersion !== practiceCatalog.version || o.definitionVersion !== practice.definitionVersion) result = outcome('unavailable', 'incompatible practice definition');
    else if (o.applicability.profile !== context.profile) result = outcome('unavailable', 'incompatible applicability profile');
    else if (Date.parse(o.source.observedAt) > Date.parse(now) || Date.parse(now) - Date.parse(o.source.observedAt) > practiceCatalog.maximumAgeDays * 86400000) result = outcome('stale', 'evidence is future-dated or exceeds 14 days');
    else {
      let proof;
      try { proof = await resolveSource?.(structuredClone(o)); } catch { /* Authority failure remains an explicit evidence gap. */ }
      if (!record(proof) || proof.observationDigest !== practiceDigest(o) || proof.verified !== true) result = outcome('unavailable', 'execution source could not be independently verified');
      else {
        verifiedEnforcement = structuredClone(proof.enforcement ?? null);
        if (o.source.result === 'unavailable') result = outcome('unavailable', 'source result is unavailable');
        else if (o.source.result !== 'success') result = outcome('failing', 'source execution failed or was cancelled');
        else if (o.applicability.status === 'not-applicable') {
          result = practice.id === 'dast' && practiceCatalog.profiles[context.profile].httpSurface === false ? outcome('not-applicable') : outcome('partial', 'shared profile does not justify this exemption');
        } else if (o.collection.collected < o.collection.expected || o.collection.exclusions.some(e => context.scope.modules.includes(e.scope))) result = outcome('partial', 'collection or applicable production scope is incomplete');
        else result = measuredQuality(practice, o);
        if (practice.level !== null && result.state !== 'not-applicable') {
          if (o.mode !== 'blocking') enforcementGaps.push('observation is report-only');
          if (proof.enforcement?.status !== 'verified' || proof.enforcement.ci !== true || proof.enforcement.merge !== true || !Array.isArray(proof.enforcement.sources) || !proof.enforcement.sources.length) enforcementGaps.push('configured CI and merge enforcement is missing or unavailable');
        }
      }
    }
    reports.push({ practice: practice.id, definitionVersion: practice.definitionVersion, requiredFrom: practice.level, ...result, enforcement: verifiedEnforcement, enforcementGaps, certified: ['met', 'not-applicable'].includes(result.state) && enforcementGaps.length === 0,
      observation: o ?? null });
  }
  const licenses = reports.find(p => p.practice === 'licenses'), sbom = reports.find(p => p.practice === 'sbom');
  if (licenses.state === 'met' && sbom.state === 'met' && licenses.observation.measurements.assessed !== sbom.observation.measurements.components) Object.assign(licenses, { state: 'partial', certified: false, gaps: ['license assessment does not cover every SBOM component'] });
  const levels = Object.fromEntries(['L1', 'L2', 'L3'].map(level => {
    const gaps = reports.filter(p => practiceCatalog.levels[level].includes(p.practice) && !p.certified).map(p => ({ practice: p.practice, state: p.state, reasons: [...p.gaps, ...p.enforcementGaps] }));
    return [level, { demonstrated: gaps.length === 0, gaps }];
  }));
  const negativeL1 = reports.some(p => practiceCatalog.levels.L1.includes(p.practice) && ['failing', 'below-standard'].includes(p.state));
  const level = ['L3', 'L2', 'L1'].find(l => levels[l].demonstrated) ?? (negativeL1 ? 'L0' : 'unverified');
  return { schemaVersion: 1, kind: 'current-practice-assessment', catalogVersion: practiceCatalog.version, levelVersion: practiceCatalog.levelVersion, assessedAt: new Date(now).toISOString(), context: structuredClone(context), level, levels, practices: reports, states: practiceStates };
}
