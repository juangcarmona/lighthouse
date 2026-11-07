const stages = ['implement', 'propose', 'product-change'];
const conventionalType = stage => stage === 'implement' ? 'chore' : 'docs';

export function parsePublicationBranch(branch) {
  if (typeof branch !== 'string') return null;
  const legacy = branch?.match(/^lighthouse\/(implement|propose|product-change)-([1-9][0-9]*)-([a-f0-9]{12})$/);
  if (legacy) return { stage: legacy[1], issue: Number(legacy[2]), identity: legacy[3] };
  const current = branch?.match(/^(chore|docs)\/([1-9][0-9]*)-lighthouse-(implement|propose|product-change)-([a-f0-9]{12})$/);
  return current && current[1] === conventionalType(current[3])
    ? { stage: current[3], issue: Number(current[2]), identity: current[4] }
    : null;
}

// Discovery also retains malformed candidates for the existing identity checks.
export function isIssuePublicationBranch(branch, issue, ...kinds) {
  return typeof branch === 'string' && (kinds.length ? kinds : stages).some(stage =>
    branch?.startsWith(`lighthouse/${stage}-${issue}-`) || branch?.startsWith(`${conventionalType(stage)}/${issue}-lighthouse-${stage}-`));
}

export async function selectPublicationBranch(api, snapshot, stage, existing) {
  if (!stages.includes(stage) || !Number.isSafeInteger(snapshot.issue) || snapshot.issue < 1 || existing !== undefined && (typeof existing !== 'string' || !existing) || existing === undefined && !/^[a-f0-9]{64}$/.test(snapshot.runId ?? '')) throw Error('Invalid publication branch identity');
  const legacy = existing ?? `lighthouse/${stage}-${snapshot.issue}-${snapshot.runId.slice(0, 12)}`;
  const current = existing ?? `${conventionalType(stage)}/${snapshot.issue}-lighthouse-${stage}-${snapshot.runId.slice(0, 12)}`;
  const file = await api(`contents/lighthouse.json?ref=${snapshot.baseRevision ?? snapshot.sourceRevision}`, 'GET', undefined, true);
  if (file == null) return existing ?? legacy;
  if (typeof file.content !== 'string' || file.encoding !== undefined && file.encoding !== 'base64' || file.type !== undefined && file.type !== 'file') throw Error('Publication branch policy manifest is unavailable');
  const bytes = Buffer.from(file.content, 'base64');
  if (bytes.length > 65536) throw Error('Publication branch policy manifest exceeds bounds');
  const manifest = JSON.parse(bytes.toString('utf8'));
  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) throw Error('Invalid publication branch policy manifest');
  const pattern = manifest.repository?.conventions?.branchPattern;
  if (pattern === undefined) return existing ?? current;
  if (typeof pattern !== 'string' || !pattern || pattern.length > 4096) throw Error('Invalid publication branch policy pattern');
  let rule;
  try { rule = new RegExp(pattern, 'u'); }
  catch { throw Error('Invalid publication branch policy pattern'); }
  const branch = (existing ? [existing] : [current, legacy]).find(name => rule.test(name));
  if (!branch) throw Error(`Publication branch does not match the adopter policy pattern: ${pattern}`);
  return branch;
}
