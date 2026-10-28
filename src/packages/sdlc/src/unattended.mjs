import { createHash } from 'node:crypto';
import { withinScope } from './implementation.mjs';
import { validateStageCompletion } from './contracts.mjs';

export const unattendedDigest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const boundedPath = path => typeof path === 'string' && path !== '*' && !/[?*\[\]{}]/.test(path) && withinScope(path.replace(/\/$/, ''), { paths: ['*'] }) && !path.startsWith('.github') && !/^docs\/product(?:\/|$)/.test(path) && !/^openspec(?:\/|$)/.test(path);
const contains = (prefix, path) => prefix.endsWith('/') ? path.startsWith(prefix) : prefix === path;
const strings = (list, max = 40) => Array.isArray(list) && list.length > 0 && list.length <= max && list.every(boundedPath) && new Set(list).size === list.length;
const command = value => Array.isArray(value) && value.length > 0 && value.length <= 30 && value.every(arg => typeof arg === 'string' && arg.length > 0 && arg.length <= 1000 && !/[\0\r\n]/.test(arg));

export function validateUnattendedPolicy(policy, route) {
  if (!record(policy) || Object.keys(policy).some(k => !['schemaVersion', 'enabled', 'routes', 'paths', 'reviewerProfile', 'allowFivePoint', 'merge', 'maxCorrections', 'timeoutSeconds', 'hotfix'].includes(k)) ||
      policy.schemaVersion !== 1 || policy.enabled !== true || !['ff', 'hotfix'].includes(route) ||
      !Array.isArray(policy.routes) || !policy.routes.includes(route) || policy.routes.some(r => !['ff', 'hotfix'].includes(r)) ||
      !strings(policy.paths) || !['plan', 'build', 'fast'].includes(policy.reviewerProfile) ||
      typeof policy.allowFivePoint !== 'boolean' || typeof policy.merge !== 'boolean' ||
      !Number.isInteger(policy.maxCorrections) || policy.maxCorrections < 0 || policy.maxCorrections > 2 ||
      !Number.isInteger(policy.timeoutSeconds) || policy.timeoutSeconds < 60 || policy.timeoutSeconds > 7200) throw Error('Invalid or disabled bounded unattended policy');
  if (route === 'hotfix') {
    const hotfix = policy.hotfix;
    if (!record(hotfix) || Object.keys(hotfix).sort().join(',') !== 'failurePattern,modules,regressionCommand,setupCommands,testPaths' || !strings(hotfix.testPaths) ||
        !command(hotfix.regressionCommand) || !Array.isArray(hotfix.setupCommands) || hotfix.setupCommands.length > 8 || hotfix.setupCommands.some(c => !command(c)) || !Array.isArray(hotfix.failurePattern) || !hotfix.failurePattern.length ||
        hotfix.failurePattern.length > 8 || hotfix.failurePattern.some(s => typeof s !== 'string' || !s.trim() || s.length > 200) ||
        !record(hotfix.modules) || Object.keys(hotfix.modules).length === 0 || Object.keys(hotfix.modules).length > 40 ||
        Object.entries(hotfix.modules).some(([name, paths]) => !/^[a-z][a-z0-9-]{0,63}$/.test(name) || !strings(paths))) throw Error('Hotfix needs declared test paths and module boundaries');
  }
  return policy;
}

export function admitUnattended(assessment, policy, route) {
  validateUnattendedPolicy(policy, route);
  if (!record(assessment) || assessment.risk !== 'low' || assessment.reversible !== true || assessment.dependenciesResolved !== true ||
      assessment.scopeKnown !== true || assessment.productChangeNeeded !== false || assessment.humanDecisionRequired !== false ||
      typeof assessment.reason !== 'string' || !assessment.reason.trim() || assessment.reason.length > 4000) throw Error('Issue needs a human decision or lacks low-risk eligibility evidence');
  if (route === 'ff' && ![1, 2, 3, ...(policy.allowFivePoint ? [5] : [])].includes(assessment.points)) throw Error('Fast-forward point estimate is outside the delegated limit');
  if (route === 'hotfix' && (assessment.confirmedDefect !== true || typeof assessment.rollback !== 'string' || !assessment.rollback.trim())) throw Error('Hotfix needs confirmed defect and rollback context');
  return true;
}

export function hotfixScope(files, policy) {
  validateUnattendedPolicy(policy, 'hotfix');
  if (!Array.isArray(files) || !files.length || files.length > 10 || new Set(files.map(f => f.path)).size !== files.length) throw Error('Hotfix exceeds 10 changed files or has an invalid inventory');
  let productionLines = 0;
  const modules = new Set(), tests = [];
  for (const file of files) {
    if (!boundedPath(file.path) || !policy.paths.some(p => contains(p, file.path)) || file.binary ||
        !Number.isSafeInteger(file.additions) || file.additions < 0 || !Number.isSafeInteger(file.deletions) || file.deletions < 0) throw Error('Hotfix has out-of-scope or unassessed binary/generated changes');
    const owners = Object.entries(policy.hotfix.modules).filter(([, paths]) => paths.some(p => contains(p, file.path)));
    if (owners.length !== 1) throw Error('Hotfix file needs exactly one declared module');
    modules.add(owners[0][0]);
    if (policy.hotfix.testPaths.some(p => contains(p, file.path))) tests.push(file.path);
    else productionLines += file.additions + file.deletions;
  }
  if (productionLines > 100 || modules.size > 2) throw Error('Hotfix exceeds 100 production-code lines or two modules');
  return { productionLines, files: files.length, modules: [...modules].sort(), tests };
}

export function regressionPlan(value) {
  if (!record(value) || !command(value.command) || typeof value.assertion !== 'string' || !value.assertion.trim() ||
      value.assertion.length > 1000 || typeof value.rootCause !== 'string' || !value.rootCause.trim() ||
      !Array.isArray(value.plannedFiles) || !value.plannedFiles.length || value.plannedFiles.length > 10 || value.plannedFiles.some(p => !boundedPath(p))) throw Error('Hotfix needs bounded regression command, assertion, root cause and planned files');
  return value;
}

export function assertRegression(receipt, expected, color) {
  const check = receipt?.checks?.find(c => JSON.stringify(c.command) === JSON.stringify(expected.command));
  if (!check || !Number.isInteger(check.exitCode) || check.execution?.status !== (color === 'red' ? 'failed' : 'passed') ||
      check.execution.signal || !Number.isInteger(check.execution.exitCode) || check.execution.exitCode !== check.exitCode ||
      (color === 'red' ? check.exitCode <= 0 || check.exitCode >= 124 : check.exitCode !== 0)) throw Error('Regression did not demonstrate ' + color.toUpperCase());
  if (color === 'red' && (typeof check.log !== 'string' || !check.log.includes(expected.assertion))) throw Error('RED did not contain the identified behavioral assertion');
  return check;
}

export function assertIndependentReview(result, binding, producer, reviewer) {
  if (!producer?.model || !reviewer?.model || producer.model === reviewer.model || !reviewer.runId || reviewer.runId === producer.runId) throw Error('Independent review requires a separate execution and distinct resolved model');
  const errors = validateStageCompletion(result, { stage: 'integrate', runId: reviewer.runId });
  const review = result?.output?.review;
  if (errors.length || !record(review) || review.binding !== binding || review.verdict !== 'accept' ||
      !Array.isArray(review.findings) || review.findings.length !== 0) throw Error('Independent review is blocked, invalid or stale');
  return true;
}

export async function verifyUnattendedIntegration(api, authorization, run, binding) {
  const delegation = authorization?.unattended;
  if (!delegation || delegation.owner !== binding.repository.split('/')[0] ||
      run.path !== '.github/workflows/lighthouse-sdlc-unattended.yml' || run.event !== 'workflow_dispatch' ||
      run.actor?.login !== delegation.owner || run.triggering_actor?.login !== delegation.owner ||
      run.head_sha !== binding.base) return false;
  const file = await api('contents/.lighthouse/unattended.json?ref=' + binding.base);
  const policy = validateUnattendedPolicy(JSON.parse(Buffer.from(file.content, 'base64').toString()), delegation.route);
  const review = delegation.review;
  return policy.merge === true && unattendedDigest(policy) === delegation.policyDigest &&
    review?.execution?.status === 'passed' && review.result?.stage === 'integrate' &&
    review.result.status === 'passed' && review.result.output?.review?.binding === review.binding &&
    review.result.output.review.verdict === 'accept' && review.result.output.review.findings?.length === 0;
}

// All effects are trusted host callbacks; the model cannot supply authorization or receipts.
export async function runUnattended({ route, policy, host, signal }) {
  validateUnattendedPolicy(policy, route);
  const started = Date.now(), deadline = started + policy.timeoutSeconds * 1000;
  const check = async () => {
    if (signal?.aborted || Date.now() >= deadline) throw Error('Unattended execution stopped or exceeded its deadline');
    await host.recheck();
  };
  const evidence = [];
  try {
    await check();
    const refined = await host.refine();
    admitUnattended(refined.eligibility, policy, route);
    const plan = route === 'hotfix' ? regressionPlan(refined.hotfix) : await host.propose(refined);
    await check();
    await host.reviewPlan({ refined, plan });
    let red = null;
    if (route === 'hotfix') {
      red = await host.reproduce(plan);
      assertRegression(red.receipt, plan, 'red');
      const regression = red.receipt.checks.find(c => JSON.stringify(c.command) === JSON.stringify(plan.command));
      if (JSON.stringify(plan.command) !== JSON.stringify(policy.hotfix.regressionCommand) ||
          !policy.hotfix.failurePattern.some(pattern => regression.log.includes(pattern))) throw Error('RED did not use the owner-declared regression runner and assertion failure signal');
      const scope = hotfixScope(red.files, policy);
      if (scope.tests.length !== red.files.length) throw Error('Reproduction phase may change regression tests only');
      evidence.push({ kind: 'red', receipt: red.receipt, tests: red.tests });
    }
    let candidate, accepted = false;
    for (let round = 0; round <= policy.maxCorrections; round++) {
      await check();
      candidate = await host.implement({ refined, plan, red, previous: candidate, round });
      admitUnattended(candidate.eligibility, policy, route);
      if (route === 'hotfix') {
        hotfixScope(candidate.files, policy);
        if (unattendedDigest(candidate.tests) !== unattendedDigest(red.tests)) throw Error('Hotfix repair changed its regression assertions');
      }
      if (!candidate.receipt?.checks?.length) throw Error('Required candidate checks are unavailable');
      if (candidate.receipt.checks.some(c => c.exitCode !== 0)) {
        candidate.feedback = ['Required host checks failed; preserve regression assertions and repair only the authorized scope.'];
        evidence.push({ kind: 'failed-checks', round, checks: candidate.receipt.checks });
        continue;
      }
      if (route === 'hotfix') assertRegression(candidate.receipt, plan, 'green');
      await check();
      const review = await host.reviewCandidate(candidate);
      evidence.push({ kind: 'candidate', round, review });
      if (review.accepted === true) { accepted = true; break; }
      if (review.verdict !== 'request-changes') throw Error('Independent review requires a human decision');
      candidate.feedback = review.findings;
    }
    if (!accepted) throw Error('Independent review correction limit exhausted');
    await check();
    const published = await host.publish(candidate);
    await check();
    if (!policy.merge) return { status: 'waiting-human', published, evidence, nextAction: 'Authorize integration of the reviewed PR head' };
    const integrated = await host.integrate(candidate, published);
    evidence.push({ kind: 'integration', result: integrated });
    return { status: 'passed', published, integrated, evidence, durationMs: Date.now() - started, nextAction: 'Follow existing post-merge review and release policy' };
  } catch (error) {
    await host.stop(error.message, evidence);
    return { status: 'blocked', evidence, reason: error.message, nextAction: 'Inspect the retained candidate and resolve the identified blocker' };
  }
}
