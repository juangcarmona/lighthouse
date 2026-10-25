// Read-only adoption command; run with an owner credential, never inside the worker.
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { ruleRevision, evidenceProtection, list } from './completion.mjs';
export async function observeProtection(api, branch, now = Date.now()) {
  await evidenceProtection(api, branch);
  const rules = await list(api, `rules/branches/${encodeURIComponent(branch)}`);
  const observations = [];
  for (const id of new Set(rules.filter(r => ['deletion', 'non_fast_forward'].includes(r.type) && r.ruleset_source_type === 'Repository').map(r => r.ruleset_id))) {
    const source = await api(`rulesets/${id}`);
    if (source.enforcement !== 'active' || !Array.isArray(source.bypass_actors) || source.bypass_actors.length) throw Error('Owner must verify active rules without bypass actors');
    // Wait out provider timestamp precision before accepting a revision witness.
    if (now - Date.parse(source.updated_at) < 2000) throw Error('Ruleset just changed; observe again after two seconds');
    observations.push({ id, revision: ruleRevision(source) });
  }
  return observations;
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [repository, branch] = process.argv.slice(2);
  if (!/^[\w.-]+\/[\w.-]+$/.test(repository ?? '') || !/^[\w/-]+$/.test(branch ?? '')) throw Error('Usage: observe-protection <owner/repository> <evidence-branch>');
  const api = async path => JSON.parse(execFileSync('gh', ['api', `repos/${repository}/${path}`], { encoding: 'utf8' }));
  console.log(JSON.stringify(await observeProtection(api, branch), null, 2));
}
