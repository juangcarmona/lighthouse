import { createHash } from 'node:crypto';
import { digest } from './digests.mjs';

const stages = ['triage', 'refine', 'propose', 'implement', 'integrate', 'review'];
const background = ['lighthouse-sdlc-unattended.yml', 'lighthouse-sdlc-epic.yml'];
const keys = ['schemaVersion', 'contractVersion', 'routerDigest', 'stages', 'autoImplement', 'completionEnabled', 'productChangeEnabled', 'backgroundWorkflows'];
function routerPolicy(router) {
  const field = name => {
    const matches = [...router.matchAll(new RegExp(`^  ${name}: ([^\\r\\n]+)$`, 'gm'))];
    if (matches.length !== 1) throw Error('Unsupported installed router configuration');
    return matches[0][1];
  };
  const enabled = field('LIGHTHOUSE_ENABLED_STAGES').split(',');
  if (!enabled.length || enabled.some(stage => !stages.includes(stage)) || new Set(enabled).size !== enabled.length) throw Error('Unsupported stage contract');
  const flag = name => { const value = field(name); if (!['true', 'false'].includes(value)) throw Error('Unsupported router flag'); return value === 'true'; };
  return { stages: enabled, autoImplement: flag('LIGHTHOUSE_AUTO_IMPLEMENT'), completionEnabled: flag('LIGHTHOUSE_COMPLETION_ENABLED'), productChangeEnabled: flag('LIGHTHOUSE_PRODUCT_CHANGE_ENABLED') };
}

export function createIssueControlManifest(router, backgroundWorkflows = []) {
  if (!/^# lighthouse-issue-control:v1$/m.test(router) || !/^      client_request:$/m.test(router)
      || !Array.isArray(backgroundWorkflows) || backgroundWorkflows.some(name => !background.includes(name))
      || new Set(backgroundWorkflows).size !== backgroundWorkflows.length) throw Error('Router has no supported client entry contract');
  return { schemaVersion: 1, contractVersion: 1, routerDigest: digest(router), ...routerPolicy(router), backgroundWorkflows };
}

function content(value, maximum) {
  if (value?.type !== 'file' || value.encoding !== 'base64' || !Number.isSafeInteger(value.size) || value.size < 0 || value.size > maximum
      || typeof value.content !== 'string' || value.content.length > Math.ceil(maximum / 3) * 4 + maximum / 32
      || typeof value.sha !== 'string' || !/^[a-f0-9]{40}$/.test(value.sha)) throw Error('Unsupported committed source content');
  const encoded = value.content.replace(/[\r\n]/g, '');
  const bytes = Buffer.from(encoded, 'base64');
  if (bytes.toString('base64') !== encoded || bytes.length !== value.size
      || createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex') !== value.sha) throw Error('Source content integrity mismatch');
  return new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes);
}

export async function readIssueControlCapability({ api, sourceRevision }) {
  try {
    const raw = content(await api(`contents/.lighthouse/issue-control.json?ref=${sourceRevision}`, 'GET', undefined, true), 16384);
    const manifest = JSON.parse(raw);
    if (manifest.schemaVersion !== 1 || manifest.contractVersion !== 1 || Object.keys(manifest).length !== keys.length
        || keys.some(key => !Object.hasOwn(manifest, key))) throw Error('Unsupported control contract version');
    const router = content(await api(`contents/.github/workflows/lighthouse-sdlc-router.yml?ref=${sourceRevision}`), 128 * 1024);
    const actual = createIssueControlManifest(router, manifest.backgroundWorkflows);
    if (JSON.stringify(manifest.stages) !== JSON.stringify(actual.stages) || keys.some(key => !['stages', 'backgroundWorkflows'].includes(key) && manifest[key] !== actual[key]))
      throw Error('Installed router declaration drifted');
    return { availability: 'available', version: 1, digest: digest(raw), ...actual };
  } catch { return { availability: 'unsupported', reason: 'installed-contract-unverified' }; }
}

export async function readIssueControlPolicy({ api, capability, variables }) {
  if (capability?.availability !== 'available' || capability.version !== 1) return { availability: 'unavailable', reason: 'installed-contract-unverified' };
  const selected = {};
  for (const name of ['LIGHTHOUSE_AUTOMATION_ENABLED', 'LIGHTHOUSE_EPIC_ENABLED']) {
    if (variables !== undefined) selected[name] = variables[name] === 'true';
    else {
      const value = await api(`actions/variables/${name}`, 'GET', undefined, true);
      if (value !== null && (value?.name !== name || typeof value.value !== 'string')) throw Error('Policy source unavailable');
      selected[name] = value?.value === 'true';
    }
  }
  const policy = { version: 1, capabilityDigest: capability.digest, automationEnabled: selected.LIGHTHOUSE_AUTOMATION_ENABLED,
    epicEnabled: selected.LIGHTHOUSE_EPIC_ENABLED, stages: capability.stages, autoImplement: capability.autoImplement,
    completionEnabled: capability.completionEnabled, productChangeEnabled: capability.productChangeEnabled };
  return { availability: 'available', ...policy, digest: digest(JSON.stringify(policy)) };
}
