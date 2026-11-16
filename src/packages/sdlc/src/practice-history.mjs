import { practiceCatalog, practiceStates } from './practice-catalog.mjs';
import { canonical, practiceDigest, record, requirePracticeObservation, validatePracticeContext } from './practice-observation.mjs';

const levels = ['unverified', 'L0', 'L1', 'L2', 'L3'];
const validTime = value => typeof value === 'string' && Number.isFinite(Date.parse(value));
const sharedContext = ({ commit, ...context }) => context;
const groupKey = value => canonical([sharedContext(value.context), value.catalogVersion, value.levelVersion]);
function validateAssessment(report) {
  if (!record(report) || report.schemaVersion !== 1 || report.kind !== 'current-practice-assessment' || !validTime(report.assessedAt) || !levels.includes(report.level) || typeof report.catalogVersion !== 'string' || !report.catalogVersion || typeof report.levelVersion !== 'string' || !report.levelVersion || validatePracticeContext(report.context).length || !Array.isArray(report.practices) || report.practices.length !== practiceCatalog.practices.length) throw Error('Valid current-assessment receipts are required as historical input');
  const ids = new Set();
  for (const p of report.practices) {
    if (!record(p) || !practiceCatalog.practices.some(v => v.id === p.practice) || ids.has(p.practice) || !practiceStates.includes(p.state) || typeof p.certified !== 'boolean' || !Array.isArray(p.gaps) || !Array.isArray(p.enforcementGaps)) throw Error('Invalid or duplicate historical practice receipt');
    ids.add(p.practice);
    if (p.certified && (!['met', 'not-applicable'].includes(p.state) || p.gaps.length || p.enforcementGaps.length)) throw Error('Contradictory historical certification state');
    if (p.observation) {
      const o = requirePracticeObservation(p.observation);
      if (o.practice !== p.practice || o.repository.id !== report.context.repository.id || o.commit !== report.context.commit || o.ref !== report.context.ref || o.repository.fullName !== report.context.repository.fullName || canonical(o.scope) !== canonical(report.context.scope)) throw Error('Historical observation is outside its assessment scope');
    }
  }
  if (report.catalogVersion === practiceCatalog.version && report.levelVersion === practiceCatalog.levelVersion) {
    const highest = ['L3', 'L2', 'L1'].find(level => practiceCatalog.levels[level].every(id => report.practices.find(p => p.practice === id).certified));
    const negative = report.practices.some(p => practiceCatalog.levels.L1.includes(p.practice) && ['failing', 'below-standard'].includes(p.state));
    if (report.level !== (highest ?? (negative ? 'L0' : 'unverified'))) throw Error('Contradictory historical level');
  }
}
function sourceEntries(report) {
  return report.practices.filter(p => p.observation).map(p => p.observation).map(o => ({
    key: canonical([o.source.workflow, o.source.runId]), attempt: o.source.attempt, observedAt: o.source.observedAt, url: o.source.url,
  })).sort((a, b) => a.key.localeCompare(b.key));
}
function compareReceipts(left, right) {
  const a = sourceEntries(left), b = sourceEntries(right);
  let newer = false, older = false;
  if (a.length !== b.length) throw Error('Contradictory historical source coverage');
  for (let i = 0; i < a.length; i++) {
    const delta = a[i].attempt - b[i].attempt;
    if (delta > 0) newer = true; if (delta < 0) older = true;
  }
  if (newer && older) throw Error('Incomparable retry vectors cannot replace a historical receipt');
  if (newer) return 1; if (older) return -1;
  if (practiceDigest(left) === practiceDigest(right)) return 0;
  const leftContent = { ...left, assessedAt: null }, rightContent = { ...right, assessedAt: null };
  if (canonical(leftContent) !== canonical(rightContent)) throw Error('Contradictory historical receipts for the same source attempts');
  return Date.parse(left.assessedAt) - Date.parse(right.assessedAt);
}
function numericMeasurements(value, path = '', result = {}) {
  if (typeof value === 'number' && Number.isFinite(value)) result[path] = value;
  else if (Array.isArray(value)) {
    for (const item of value) {
      if (record(item) && typeof item.id === 'string') numericMeasurements(item, path + '[' + item.id + ']', result);
    }
  } else if (record(value)) for (const key of Object.keys(value).sort()) numericMeasurements(value[key], path ? path + '.' + key : key, result);
  return result;
}

export function aggregatePracticeHistory({ assessments, period, expectations = [] }) {
  if (!Array.isArray(assessments) || assessments.length > 10000 || !record(period) || !validTime(period.start) || !validTime(period.end) || Date.parse(period.start) >= Date.parse(period.end) || !Array.isArray(expectations) || expectations.length > 10000) throw Error('History needs a bounded receipt list and a valid half-open period');
  const groups = new Map();
  const get = value => {
    const key = groupKey(value);
    if (!groups.has(key)) groups.set(key, { context: structuredClone(sharedContext(value.context)), catalogVersion: value.catalogVersion, levelVersion: value.levelVersion, expectedSamples: null, receipts: new Map(), receivedSources: new Map() });
    return groups.get(key);
  };
  for (const expected of expectations) {
    if (!record(expected) || validatePracticeContext(expected.context).length || typeof expected.catalogVersion !== 'string' || !expected.catalogVersion || typeof expected.levelVersion !== 'string' || !expected.levelVersion || !Number.isSafeInteger(expected.samples) || expected.samples < 0) throw Error('History expectations need exact compatible context, versions and a nonnegative sample count');
    const group = get(expected);
    if (group.expectedSamples !== null) throw Error('Duplicate history expectation');
    group.expectedSamples = expected.samples;
  }
  for (const report of assessments) {
    validateAssessment(report);
    if (Date.parse(report.assessedAt) < Date.parse(period.start) || Date.parse(report.assessedAt) >= Date.parse(period.end)) throw Error('Historical receipt is outside the requested period');
    const group = get(report), sources = sourceEntries(report);
    for (const p of report.practices.filter(p => p.observation)) {
      const o = p.observation;
      group.receivedSources.set(o.source.url, { url: o.source.url, attempt: o.source.attempt, result: o.source.result });
    }
    const identity = canonical([report.context.commit, sources.length ? [...new Set(sources.map(s => s.key))] : report.assessedAt]);
    const previous = group.receipts.get(identity);
    if (!previous || compareReceipts(report, previous) > 0) group.receipts.set(identity, structuredClone(report));
  }
  const summaries = [...groups.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([, group]) => {
    const receipts = [...group.receipts.values()].sort((a, b) => Date.parse(a.assessedAt) - Date.parse(b.assessedAt) || practiceDigest(a).localeCompare(practiceDigest(b)));
    if (group.expectedSamples !== null && group.expectedSamples < receipts.length) throw Error('Observed samples exceed the declared sampling coverage');
    const distribution = Object.fromEntries(levels.map(l => [l, 0])), states = Object.fromEntries(practiceStates.map(s => [s, 0]));
    const trends = {}, gaps = {}, definitions = {}, references = new Set();
    let incompatibleObservations = 0;
    let observedPractices = 0;
    for (const report of receipts) {
      distribution[report.level]++;
      for (const p of report.practices) {
        states[p.state]++;
        if (p.observation) {
          observedPractices++;
          references.add(p.observation.source.url);
          const definition = p.observation.catalogVersion + '/' + p.observation.definitionVersion;
          definitions[p.practice + '@' + definition] = (definitions[p.practice + '@' + definition] ?? 0) + 1;
          const compatible = p.observation.catalogVersion === group.catalogVersion && p.observation.definitionVersion === p.definitionVersion;
          if (!compatible) incompatibleObservations++;
          const measurements = compatible ? numericMeasurements(p.observation.measurements) : {};
          for (const [path, value] of Object.entries(measurements)) {
            const key = p.practice + '.' + path;
            if (!trends[key]) trends[key] = { count: 0, min: value, max: value, first: value, last: value, firstAt: p.observation.source.observedAt, lastAt: p.observation.source.observedAt, firstSource: p.observation.source.url, lastSource: p.observation.source.url };
            const trend = trends[key]; trend.count++; trend.min = Math.min(trend.min, value); trend.max = Math.max(trend.max, value);
            if (Date.parse(p.observation.source.observedAt) < Date.parse(trend.firstAt)) Object.assign(trend, { first: value, firstAt: p.observation.source.observedAt, firstSource: p.observation.source.url });
            if (Date.parse(p.observation.source.observedAt) >= Date.parse(trend.lastAt)) Object.assign(trend, { last: value, lastAt: p.observation.source.observedAt, lastSource: p.observation.source.url });
          }
        }
        for (const reason of [...p.gaps, ...p.enforcementGaps]) { const key = p.practice + ': ' + reason; gaps[key] = (gaps[key] ?? 0) + 1; }
      }
    }
    return { context: group.context, catalogVersion: group.catalogVersion, levelVersion: group.levelVersion,
      coverage: { expectedSamples: group.expectedSamples, observedSamples: receipts.length, missingSamples: group.expectedSamples === null ? null : group.expectedSamples - receipts.length, unknownSamplingCoverage: group.expectedSamples === null,
        expectedPracticeSlots: receipts.length * practiceCatalog.practices.length, observedPractices, missingPractices: states.missing, unknownPractices: states.partial + states.stale + states.unavailable },
      observedDefinitions: definitions, incompatibleObservations, levelDistribution: distribution, practiceStates: states, gaps, measurementTrends: trends, sources: [...references].sort(), supersededSources: [...group.receivedSources.values()].filter(source => !references.has(source.url)).sort((a, b) => a.url.localeCompare(b.url)) };
  });
  return { schemaVersion: 1, kind: 'historical-practice-summary', currentCertification: false, period: { start: new Date(period.start).toISOString(), end: new Date(period.end).toISOString() }, groups: summaries,
    retention: 'Source receipts remain subject to existing retention obligations; this summary authorizes no deletion' };
}
