export const MEMORY_SCOPES = Object.freeze(['run', 'project', 'shared']);
const scopeSet = new Set(MEMORY_SCOPES);

function isRecord(value) {
  return value && typeof value === 'object' && !Array.isArray(value);
}

function issue(code, message, field) {
  return field ? { code, message, field } : { code, message };
}

export function validateMemoryRecord(record, policy = {}) {
  const errors = [];
  if (!isRecord(record)) return [issue('memory.invalid', 'memory record must be an object')];
  for (const field of ['id', 'owner', 'source', 'confidence', 'retention', 'sensitivity']) if (typeof record[field] !== 'string' || !record[field].trim()) errors.push(issue(`memory.${field}`, `${field} must be a non-empty string`, field));
  if (!scopeSet.has(record.scope)) errors.push(issue('memory.scope', `scope must be one of ${MEMORY_SCOPES.join(', ')}`, 'scope'));
  if (record.scope === 'run' && (typeof record.runId !== 'string' || !record.runId.trim())) errors.push(issue('memory.run-id', 'run-scoped memory needs runId', 'runId'));
  if (record.scope === 'project' && (typeof record.projectId !== 'string' || !record.projectId.trim())) errors.push(issue('memory.project-id', 'project-scoped memory needs projectId', 'projectId'));
  if (record.scope === 'shared' && policy.shared !== true) errors.push(issue('memory.shared-disabled', 'shared memory is not enabled by the control-plane policy', 'scope'));
  if (!isRecord(record.value)) errors.push(issue('memory.value', 'value must be an object', 'value'));
  return errors;
}

const learningFields = new Set(['id', 'scope', 'owner', 'source', 'confidence', 'retention', 'sensitivity', 'value', 'runId', 'projectId', 'repository', 'workItem', 'revision', 'provenance', 'topics']);
const text = (value, max = 500) => typeof value === 'string' && value.trim().length > 0 && value.length <= max;
const topicsValid = (topics) => Array.isArray(topics) && topics.length > 0 && topics.length <= 8 && topics.every((topic) => text(topic, 64));

// This deliberately narrows the existing record contract for durable findings.
// It is not a semantic secret detector: the trusted host must assess all fields.
export function validateLearningRecord(record, now = Date.now()) {
  const errors = validateMemoryRecord(record);
  if (!isRecord(record)) return errors;
  if (Object.keys(record).some((key) => !learningFields.has(key))) errors.push(issue('memory.fields', 'unsupported learning fields'));
  for (const field of ['id', 'owner', 'source', 'confidence', 'runId', 'projectId', 'repository', 'workItem', 'revision']) {
    if (!text(record[field])) errors.push(issue(`memory.${field}`, `${field} must be bounded non-empty text`, field));
  }
  if (!['run', 'project'].includes(record.scope)) errors.push(issue('memory.persistent-scope', 'this provider supports only run and project findings'));
  if (record.sensitivity !== 'non-sensitive') errors.push(issue('memory.sensitivity', 'only non-sensitive findings may be retained'));
  if (!isRecord(record.value) || Object.keys(record.value).length !== 1 || !text(record.value.finding, 2000)) errors.push(issue('memory.finding', 'value must contain only a finding of at most 2000 characters'));
  if (!topicsValid(record.topics)) errors.push(issue('memory.topics', 'one to eight bounded task topics are required'));
  if (!Array.isArray(record.provenance) || !record.provenance.length || record.provenance.length > 8 || !record.provenance.every((entry) => text(entry))) errors.push(issue('memory.provenance', 'one to eight bounded provenance references are required'));
  if (!text(record.retention, 40) || !/^\d{4}-\d{2}-\d{2}T/.test(record.retention) || !Number.isFinite(Date.parse(record.retention)) || Date.parse(record.retention) <= now) errors.push(issue('memory.retention', 'retention must be a future absolute expiry timestamp'));
  return errors;
}

function freeze(value) {
  if (value && typeof value === 'object') {
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  }
  return value;
}

/** Host-only API. Authenticate the run before constructing this session. */
export function createMemorySession({ provider, policy = {}, grant, clock = Date.now }) {
  const settings = Object.freeze({ enabled: policy.enabled === true, required: policy.required === true, approved: policy.operatorApproved === true });
  const eligible = policy.isEligible;
  const fresh = policy.isFresh;
  const access = grant ? freeze(structuredClone(grant)) : null;
  const validGrant = access && ['projectId', 'repository', 'runId', 'workItem', 'revision', 'owner'].every((field) => text(access[field]))
    && Array.isArray(access.scopes) && access.scopes.length > 0 && access.scopes.every((scope) => ['run', 'project'].includes(scope))
    && topicsValid(access.topics) && Number.isInteger(access.maxResults) && access.maxResults >= 1 && access.maxResults <= 20;
  const unavailable = () => ({ status: 'unavailable', blocked: settings.required, records: [], message: 'Memory unavailable; operator must enable or restore the host memory provider.' });
  const denied = () => ({ status: 'denied', records: [] });
  const binding = (scope) => ({ projectId: access.projectId, repository: access.repository, scope, runId: scope === 'run' ? access.runId : '' });
  const available = () => settings.enabled && provider && provider.available !== false;
  const permits = (permission, scope) => validGrant && access[permission] === true && (!scope || access.scopes.includes(scope));
  const operate = (action) => {
    if (!available()) return unavailable();
    try { return action(); } catch { return unavailable(); }
  };
  const prepare = (input) => {
    let record;
    try { record = JSON.parse(JSON.stringify(input)); } catch { return { status: 'invalid', errors: [issue('memory.json', 'finding must be JSON data')] }; }
    const errors = validateLearningRecord(record, clock());
    if (errors.length) return { status: 'invalid', errors };
    if (!permits('write', record.scope) || !settings.approved || record.projectId !== access.projectId || record.repository !== access.repository || record.runId !== access.runId || record.workItem !== access.workItem || record.revision !== access.revision || record.owner !== access.owner || !record.topics.every((topic) => access.topics.includes(topic))) return denied();
    // Snapshot before assessment so a predicate cannot replace approved content.
    freeze(record);
    if (typeof eligible !== 'function' || eligible(record) !== true) return denied();
    return { status: 'prepared', record };
  };
  const eventFor = (request) => {
    if (!text(request.reason) || !text(request.source) || !Number.isInteger(request.expectedVersion) || request.expectedVersion < 1 || !text(request.id)) return null;
    const event = freeze({ actor: access.owner, reason: request.reason, source: request.source, at: new Date(clock()).toISOString() });
    return typeof eligible === 'function' && eligible(event) === true ? event : null;
  };
  return Object.freeze({
    retain(input) {
      return operate(() => {
        const result = prepare(input);
        if (result.status !== 'prepared') return result;
        return provider.insert(result.record, clock()) ? { status: 'retained', version: 1 } : { status: 'conflict' };
      });
    },
    recall({ topics, limit = access?.maxResults } = {}) {
      return operate(() => {
        if (!permits('read') || !topicsValid(topics) || !topics.every((topic) => access.topics.includes(topic)) || !Number.isInteger(limit) || limit < 1 || limit > access.maxResults) return denied();
        const records = provider.select(access, topics, limit, clock()).filter((record) => {
          const snapshot = freeze(structuredClone(record));
          return typeof eligible === 'function' && eligible(snapshot) === true && (typeof fresh !== 'function' || fresh(snapshot) === true);
        });
        return { status: 'available', blocked: false, records: records.map((record) => ({ ...record, contextOnly: true, authority: 'untrusted' })) };
      });
    },
    correct(request) {
      return operate(() => {
        if (!['run', 'project'].includes(request.scope) || !permits('manage', request.scope)) return denied();
        const event = eventFor(request);
        if (!event || request.record?.id !== request.id || request.record?.scope !== request.scope) return { status: 'invalid' };
        const result = prepare(request.record);
        if (result.status !== 'prepared') return result;
        return provider.replace(binding(request.scope), request.id, request.expectedVersion, result.record, event) ? { status: 'corrected', version: request.expectedVersion + 1 } : { status: 'conflict' };
      });
    },
    invalidate(request) {
      return operate(() => {
        if (!['run', 'project'].includes(request.scope) || !permits('manage', request.scope)) return denied();
        const event = eventFor(request);
        if (!event) return { status: 'invalid' };
        return provider.exclude(binding(request.scope), request.id, request.expectedVersion, request.stale === true ? 'stale' : 'invalidated', event) ? { status: 'invalidated', version: request.expectedVersion + 1 } : { status: 'conflict' };
      });
    },
    review({ scope, id }) {
      return operate(() => ['run', 'project'].includes(scope) && permits('manage', scope) && text(id) ? { status: 'available', history: provider.history(binding(scope), id) } : denied());
    }
  });
}
