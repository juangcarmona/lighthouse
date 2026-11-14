import { access } from 'node:fs/promises';
import { join } from 'node:path';

export const productSerialization = 'v1alpha2';
export const productMigration = 'Review the installed Lighthouse upgrades/pdac-v1alpha2.md migration guide, migrate through ProductShape and validate before running lighthouse authorities --adopt-existing.';

export async function inspectProductContract(root, providerVersion) {
  const result = { requiredSerializationVersion: productSerialization, serializationVersion: null, providerVersion, status: 'unconfigured', diagnostics: [], nextAction: productMigration };
  try { await access(join(root, '.product/config.yaml')); }
  catch (error) {
    if (error.code !== 'ENOENT') throw error;
    return { ...result, diagnostics: ['Explicit .product/config.yaml is required; an implicit provider default is not PDaC v1alpha2 adoption.'], nextAction: 'For a new model, run prodshape --serialization-version v1alpha2 init --full --sdd none --gitignore. For existing product content, review the migration guide before initialization.' };
  }
  const version = /^(\d+)\.(\d+)\.(\d+)$/.exec(providerVersion ?? '');
  if (!version || Number(version[1]) === 0 && (Number(version[2]) < 26 || Number(version[2]) === 26 && Number(version[3]) < 1)) {
    return { ...result, status: 'unavailable', diagnostics: [`ProductShape provider ${providerVersion ?? 'not installed'} is unsupported; PDaC v1alpha2 requires @prodshape/cli >=0.26.1.`] };
  }
  let repository;
  let validateBaseline;
  try { const core = await import('@prodshape/core'); repository = await core.openRepository(root); validateBaseline = core.validateBaseline; }
  catch (error) { return { ...result, status: 'unavailable', diagnostics: [`ProductShape configuration inspection is unavailable: ${error.message}`] }; }
  result.serializationVersion = repository.config?.version ?? null;
  result.modelPath = repository.config?.product?.model ?? null;
  result.diagnostics = repository.configDiagnostics.map(item => `${item.code}: ${item.message}`);
  if (result.diagnostics.length || result.serializationVersion !== productSerialization) {
    result.status = 'failed';
    result.diagnostics.push(`PDaC ${result.serializationVersion ?? 'unknown'} does not satisfy required ${productSerialization}; missing, legacy or conflicting configuration cannot count as compliant adoption.`);
    return result;
  }
  const baseline = await validateBaseline(repository);
  const blocking = baseline.diagnostics.filter(item => item.severity === 'error' || repository.config.validation['warnings-as-errors']);
  if (blocking.length) return { ...result, status: 'failed', diagnostics: blocking.map(item => `${item.file}: ${item.code}: ${item.message}`), nextAction: 'Run prodshape --serialization-version v1alpha2 validate, repair the reported model and rerun Lighthouse verification.' };
  return { ...result, status: 'passed', nextAction: null };
}
