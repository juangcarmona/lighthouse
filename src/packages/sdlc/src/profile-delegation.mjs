import { randomUUID } from 'node:crypto';
import { validateLaunchRequest } from './control-plane.mjs';
import { withinScope } from './implementation.mjs';
import { resolveModelProfile, modelExecutionReceipt } from './model-profiles.mjs';

const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const name = value => typeof value === 'string' && /^[a-z][a-z0-9-]{0,63}$/.test(value);
const validScope = value => typeof value === 'string' && !/[?*\[\]{}\\]/.test(value) && withinScope(value.replace(/\/$/, ''), { paths: ['*'] });
const contains = (scope, file) => scope === '*' || (scope.endsWith('/') ? file.startsWith(scope) : file === scope);
const overlaps = (a, b) => a.replace(/\/$/, '') === b.replace(/\/$/, '') || contains(a, b) || contains(b, a);
const boundedLimits = limits => record(limits) && Number.isInteger(limits.timeoutSeconds) && limits.timeoutSeconds > 0 && limits.timeoutSeconds <= 1800 && Number.isInteger(limits.maxAttempts) && limits.maxAttempts === 1;

export function prepareDelegatedTasks({ tasks, parent, controlPlane, project = null, operator, maxParallel }) {
  if (!Number.isInteger(maxParallel) || maxParallel < 1 || maxParallel > 8) throw Error('Host parallel limit must be 1..8');
  if (!record(parent) || !record(controlPlane?.roles?.[parent.role]) || validateLaunchRequest(parent, controlPlane).length || !boundedLimits(parent.limits)) throw Error('Invalid bounded parent launch contract');
  if (!Array.isArray(tasks) || !tasks.length || tasks.length > 100) throw Error('Delegation requires 1..100 tasks');
  const ids = new Set();
  const prepared = structuredClone(tasks).map(task => {
    if (!record(task) || Object.keys(task).some(key => !['id', 'specialist', 'profile', 'dependencies', 'affectedFiles', 'input', 'tools', 'outputSchema', 'limits', 'stopConditions'].includes(key)) || !name(task.id) || ids.has(task.id) || !name(task.specialist)) throw Error('Invalid or duplicate delegated task');
    ids.add(task.id);
    if (!Array.isArray(task.dependencies) || task.dependencies.some(id => !name(id)) || new Set(task.dependencies).size !== task.dependencies.length) throw Error('Task dependencies must be unique task IDs');
    if (!Array.isArray(task.affectedFiles) || !task.affectedFiles.length || task.affectedFiles.length > 100 || new Set(task.affectedFiles).size !== task.affectedFiles.length || task.affectedFiles.some(file => !validScope(file) || !parent.writeScope.some(scope => contains(scope, file)))) throw Error('Task affected files exceed parent scope or use unsupported paths');
    if (task.tools !== undefined && !Array.isArray(task.tools) || task.stopConditions !== undefined && !Array.isArray(task.stopConditions)) throw Error('Task tools and stop conditions must be arrays');
    if (!record(controlPlane.roles[task.specialist])) throw Error('Task specialist needs a declared launch contract');
    const input = JSON.stringify(task.input ?? {});
    if (Buffer.byteLength(input) > 65536) throw Error('Task context exceeds 64 KiB');
    const child = {
      runId: `${parent.runId}-${task.id}-${randomUUID()}`, parentRun: parent.runId, role: task.specialist,
      input: JSON.parse(input), outputSchema: task.outputSchema ?? controlPlane.roles[task.specialist].outputSchema,
      tools: task.tools ?? [...parent.tools], writeScope: [...task.affectedFiles], limits: task.limits ?? { ...parent.limits },
      stopConditions: [...parent.stopConditions, ...(task.stopConditions ?? [])],
    };
    if (!boundedLimits(child.limits) || child.limits.timeoutSeconds > parent.limits.timeoutSeconds || child.tools.some(tool => !parent.tools.includes(tool)) || validateLaunchRequest(child, controlPlane).length) throw Error('Task launch exceeds specialist or parent contract');
    const selection = resolveModelProfile({ project, operator, worker: task.specialist, profile: task.profile });
    if (selection.mode !== 'profile' || !task.profile) throw Error('Delegated task must declare a profile');
    return { id: task.id, dependencies: task.dependencies, affectedFiles: task.affectedFiles, child, selection };
  });
  for (const task of prepared) if (task.dependencies.some(id => !ids.has(id) || id === task.id)) throw Error('Unknown or self task dependency');
  const visited = new Set(), active = new Set(), byId = new Map(prepared.map(task => [task.id, task]));
  function visit(task) {
    if (active.has(task.id)) throw Error('Delegated task dependency cycle');
    if (visited.has(task.id)) return;
    active.add(task.id);
    for (const id of task.dependencies) visit(byId.get(id));
    active.delete(task.id); visited.add(task.id);
  }
  for (const task of prepared) visit(task);
  return prepared;
}

// Callbacks are host-owned: enforce paths/tools, stop on abort, validate output schemas,
// retain evidence and check actual file changes. This scheduler grants no permissions.
export async function runDelegatedTasks(options) {
  const { launch, verifyWave, signal } = options;
  if (typeof launch !== 'function' || typeof verifyWave !== 'function') throw Error('Host launch and wave verification callbacks required');
  const tasks = prepareDelegatedTasks(options), results = new Map(), waves = [];
  const deadline = Date.now() + options.parent.limits.timeoutSeconds * 1000;
  const controller = new AbortController();
  const abort = () => controller.abort();
  signal?.addEventListener('abort', abort, { once: true });
  if (signal?.aborted) abort();
  const timer = setTimeout(abort, Math.max(1, deadline - Date.now()));
  const validResult = result => result?.status === 'passed' && Array.isArray(result.evidence) && result.evidence.length > 0;
  async function bounded(callback, seconds) {
    if (controller.signal.aborted) throw Error('Delegation stopped');
    let timeout, onAbort;
    try {
      return await Promise.race([
        Promise.resolve().then(() => callback(controller.signal)),
        new Promise((_, reject) => {
          onAbort = () => reject(Error('Delegation stopped'));
          controller.signal.addEventListener('abort', onAbort, { once: true });
          timeout = setTimeout(() => { controller.abort(); reject(Error('Delegation deadline exceeded')); }, Math.min(seconds * 1000, Math.max(1, deadline - Date.now())));
        }),
      ]);
    } finally { clearTimeout(timeout); controller.signal.removeEventListener('abort', onAbort); }
  }
  try {
    while (results.size < tasks.length && !controller.signal.aborted) {
      // Propagate failures transitively before selecting eligible tasks.
      let changed;
      do {
        changed = false;
        for (const task of tasks) if (!results.has(task.id) && task.dependencies.some(id => results.has(id) && results.get(id).status !== 'passed')) {
          results.set(task.id, { id: task.id, status: 'blocked', reason: 'dependency-failed' }); changed = true;
        }
      } while (changed);
      const wave = [];
      for (const task of tasks) {
        if (results.has(task.id) || task.dependencies.some(id => results.get(id)?.status !== 'passed')) continue;
        if (wave.length < options.maxParallel && !wave.some(other => other.affectedFiles.some(a => task.affectedFiles.some(b => overlaps(a, b))))) wave.push(task);
      }
      if (!wave.length) break;
      const executions = await Promise.all(wave.map(async task => {
        try {
          const outcome = await bounded(signal => launch({ ...structuredClone(task.child), model: structuredClone(task.selection), signal }), task.child.limits.timeoutSeconds);
          return { id: task.id, status: validResult(outcome) ? 'passed' : 'failed', reason: validResult(outcome) ? undefined : 'launch-result-failed', outcome, modelExecution: modelExecutionReceipt(task.selection) };
        } catch { return { id: task.id, status: 'failed', reason: 'launch-failed-or-stopped', modelExecution: modelExecutionReceipt(task.selection) }; }
      }));
      let verification;
      try { verification = await bounded(signal => verifyWave({ tasks: structuredClone(wave), results: structuredClone(executions), signal }), options.parent.limits.timeoutSeconds); }
      catch { verification = { status: 'failed', evidence: [] }; }
      const passed = validResult(verification);
      for (const execution of executions) results.set(execution.id, execution.status === 'passed' && !passed ? { ...execution, status: 'failed', reason: 'wave-verification-failed' } : execution);
      waves.push({ tasks: wave.map(task => task.id), status: passed && executions.every(result => result.status === 'passed') ? 'passed' : 'failed', verification });
    }
    for (const task of tasks) if (!results.has(task.id)) results.set(task.id, { id: task.id, status: 'blocked', reason: controller.signal.aborted ? 'execution-stopped' : 'dependency-failed' });
    return { status: [...results.values()].every(result => result.status === 'passed') ? 'passed' : 'blocked', waves, tasks: tasks.map(task => results.get(task.id)) };
  } finally { clearTimeout(timer); signal?.removeEventListener('abort', abort); }
}
