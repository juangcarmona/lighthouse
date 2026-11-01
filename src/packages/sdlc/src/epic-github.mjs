import { isDeepStrictEqual } from 'node:util';
import { epicPlanDigest } from './epic.mjs';
import { buildDecompositionPlan } from './decompose.mjs';

const positive = value => Number.isSafeInteger(value) && value > 0;
const prefix = '<!-- lighthouse-epic:';

export function epicCorrelation({ repository, parent, slice, planDigest, base, dependencies, kind = 'child' }) {
  if (!/^[\w.-]+\/[\w.-]+$/.test(repository ?? '') || !positive(parent) || typeof slice !== 'string' || !slice.trim() || !/^[a-f0-9]{64}$/.test(planDigest ?? '') || base !== `lighthouse/epic-${parent}` || !Array.isArray(dependencies) || dependencies.some(id => typeof id !== 'string' || !id.trim()) || !['child', 'pull-request', 'aggregate'].includes(kind)) throw Error('Invalid epic correlation');
  return { schemaVersion: 1, kind, repository, parent, slice, planDigest, base, dependencies: [...new Set(dependencies)].sort() };
}

export function epicMarker(correlation) {
  const checked = epicCorrelation(correlation);
  if (!isDeepStrictEqual(correlation, checked)) throw Error('Non-canonical epic correlation');
  return `${prefix}${JSON.stringify(checked).replaceAll('<', '\\u003c').replaceAll('>', '\\u003e')} -->`;
}

export function readEpicMarker(body) {
  if (typeof body !== 'string' || body.split(prefix).length !== 2) return null;
  const match = body.match(/<!-- lighthouse-epic:([^\n]*?) -->/);
  if (!match) return null;
  try {
    const value = JSON.parse(match[1]);
    if (value.schemaVersion !== 1 || !isDeepStrictEqual(value, epicCorrelation(value))) return null;
    return value;
  } catch { return null; }
}

// The credentialed host supplies a durable journal, serialized parent lease,
// current authorization check and receipt authentication. This adapter grants none.
export async function reconcileEpicChildren(plan, context, host) {
  plan = buildDecompositionPlan(plan);
  const digest = epicPlanDigest(plan);
  const { repository, parent, base } = context;
  for (const name of ['withLease', 'readReceipt', 'writeReceipt', 'findCandidates', 'authenticate', 'beforeWrite', 'api']) if (typeof host?.[name] !== 'function') throw Error(`Trusted host must provide ${name}`);
  if (String(parent) !== String(plan.parent.number ?? plan.parent.id.match(/^(?:GH-)?([1-9]\d*)$/)?.[1])) throw Error('Parent identity mismatch');
  const expected = new Map(plan.slices.map(slice => [slice.id, epicCorrelation({ repository, parent, slice: slice.id, planDigest: digest, base, dependencies: slice.dependencies })]));
  return host.withLease(`${repository}:${parent}`, async () => {
    const outcomes = [];
    for (const id of plan.order) {
      const correlation = expected.get(id), slice = plan.slices.find(item => item.id === id);
      const key = `${repository}:${parent}:${digest}:${id}`;
      try {
        const unmet = slice.dependencies.filter(dependency => outcomes.find(item => item.id === dependency)?.state !== 'linked');
        if (unmet.length) {
          outcomes.push({ id, state: 'blocked', reason: `Dependencies are not reconciled: ${unmet.join(', ')}` });
          return { schemaVersion: 1, status: 'blocked', children: outcomes, parent: 'open' };
        }
        let receipt = await host.readReceipt(key);
        if (receipt != null && (receipt.schemaVersion !== 1 || !['intent', 'created', 'linked', 'cancelled'].includes(receipt.state))) throw Error('Unsupported or malformed durable receipt');
        const candidates = await host.findCandidates(correlation);
        if (!Array.isArray(candidates) || candidates.length > 1) throw Error('Duplicate or invalid candidate observations');
        let resource = candidates[0];
        if (receipt && !isDeepStrictEqual(receipt.correlation, correlation)) throw Error('Receipt correlation changed');
        if (resource && (!receipt || !positive(resource.id) || !positive(resource.number) || resource.pull_request || !isDeepStrictEqual(readEpicMarker(resource.body), correlation) || await host.authenticate(resource, receipt) !== true)) throw Error('Candidate lacks matching authenticated receipt');
        if (receipt?.state === 'cancelled') { outcomes.push({ id, state: 'cancelled' }); continue; }
        if (!resource && receipt) throw Error('Prior write is missing or uncertain; reconcile before recreating');
        if (resource && (receipt.resource?.id !== resource.id || receipt.resource?.number !== resource.number)) throw Error('Receipt resource identity mismatch');
        if (!resource) {
          const intent = { schemaVersion: 1, state: 'intent', correlation };
          await host.beforeWrite(correlation);
          await host.writeReceipt(key, intent);
          // Persist intent before POST. A lost response must never trigger another POST.
          await host.beforeWrite(correlation);
          resource = await host.api('issues', 'POST', { title: slice.title, body: `Parent issue: #${parent}\n\nAcceptance evidence:\n${slice.acceptance.map(item => `- ${item}`).join('\n')}\n\n${epicMarker(correlation)}` });
          if (!positive(resource?.id) || !positive(resource?.number)) throw Error('Create response lacks native resource identity');
          receipt = { ...intent, state: 'created', resource: { id: resource.id, number: resource.number } };
          await host.writeReceipt(key, receipt);
        }
        const relation = await host.api(`issues/${resource.number}/parent`);
        if (relation && relation.number !== parent) throw Error('Child belongs to another parent');
        if (!relation) {
          await host.beforeWrite(correlation);
          await host.api(`issues/${parent}/sub_issues`, 'POST', { sub_issue_id: resource.id });
        }
        for (const dependency of slice.dependencies) {
          const prerequisite = outcomes.find(item => item.id === dependency);
          if (prerequisite?.state !== 'linked') throw Error(`Dependency ${dependency} is not reconciled`);
          const links = await host.api(`issues/${resource.number}/dependencies/blocked_by`);
          if (!Array.isArray(links)) throw Error('Dependency observations unavailable');
          if (!links.some(item => item.id === prerequisite.resource.id)) {
            await host.beforeWrite(correlation);
            await host.api(`issues/${resource.number}/dependencies/blocked_by`, 'POST', { issue_id: prerequisite.resource.id });
          }
        }
        receipt = { ...receipt, state: 'linked' };
        await host.writeReceipt(key, receipt);
        outcomes.push({ id, state: 'linked', resource: receipt.resource });
      } catch (error) {
        outcomes.push({ id, state: 'uncertain', reason: error.message });
        // A partial failure is a checkpoint, not permission to create downstream work.
        return { schemaVersion: 1, status: 'blocked', children: outcomes, parent: 'open' };
      }
    }
    return { schemaVersion: 1, status: 'reconciled', children: outcomes, parent: 'open' };
  });
}
