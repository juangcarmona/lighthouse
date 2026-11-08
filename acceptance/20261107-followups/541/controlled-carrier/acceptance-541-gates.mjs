import { readFile, appendFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

export async function waitForAcceptanceGate(phase, request = null, nativeFetch = fetch) {
  const env = process.env;
  const event = JSON.parse(await readFile(env.GITHUB_EVENT_PATH, 'utf8'));
  if (env.LIGHTHOUSE_ACCEPTANCE_541_ISSUE !== '59' || env.LIGHTHOUSE_ISSUE !== '59' || env.GITHUB_EVENT_NAME !== 'workflow_dispatch' || env.GITHUB_ACTOR !== 'github-actions[bot]' || env.GITHUB_TRIGGERING_ACTOR !== 'github-actions[bot]' || event.inputs?.stage !== 'review' || event.inputs?.workflow !== 'stage') return;
  if (!['before-preparation', 'before-post'].includes(phase) || !/^[1-9][0-9]*$/.test(env.GITHUB_RUN_ID) || !/^[1-9][0-9]*$/.test(event.inputs.after_run)) throw Error('Invalid acceptance gate identity');
  const base = `https://api.github.com/repos/${env.GITHUB_REPOSITORY}`;
  const api = async (path, method = 'GET', body = undefined) => {
    const response = await nativeFetch(`${base}/${path}`, {method, headers:{authorization:`Bearer ${env.GH_TOKEN}`,accept:'application/vnd.github+json','content-type':'application/json'},body:body === undefined ? undefined : JSON.stringify(body),signal:AbortSignal.timeout(30000)});
    if (!response.ok) throw Error(`Acceptance gate API ${method} ${response.status}`);
    return response.status === 204 ? null : response.json();
  };
  const comments = async () => {
    const items = [];
    for (let page = 1; page <= 10; page++) { const rows = await api(`issues/59/comments?per_page=100&page=${page}`); items.push(...rows); if (rows.length < 100) return items; }
    throw Error('Acceptance comments exceed bound');
  };
  const prior = await comments();
  if (phase === 'before-preparation' && prior.some(comment => {
    if (comment.user?.login !== 'github-actions[bot]' || comment.user.type !== 'Bot') return false;
    const matches = [...comment.body.matchAll(/<!-- lighthouse-dispatch:(\{[^\n]*\}) -->/g)];
    return matches.some(match => {
      try { const receipt = JSON.parse(match[1]); return receipt.stage === 'review' && String(receipt.eventRunId) === event.inputs.after_run; }
      catch { return false; }
    });
  })) return;
  const revision = (await api('commits/main')).sha;
  const observation = {schemaVersion:1,fixture:'541',phase,repository:env.GITHUB_REPOSITORY,issue:59,run:env.GITHUB_RUN_ID,routerRevision:env.GITHUB_SHA,currentRevision:revision,ci:event.inputs.after_run,...(request ? {requestComment:request.inputs['dispatch-request'],ref:request.ref} : {})};
  const marker = `<!-- lighthouse-541-gate:${JSON.stringify(observation)} -->`;
  if (!prior.some(comment => comment.user?.login === 'github-actions[bot]' && comment.body.includes(marker))) await api('issues/59/comments','POST',{body:`Acceptance gate reached: ${phase}. No stage effect is authorized by this marker.\n\n${marker}`});
  console.log(JSON.stringify(observation));
  if (env.LIGHTHOUSE_ACCEPTANCE_GATE_LOG) await appendFile(env.LIGHTHOUSE_ACCEPTANCE_GATE_LOG,JSON.stringify(observation)+'\n');
  const release = `<!-- lighthouse-actions:${JSON.stringify({acceptance541:phase,run:env.GITHUB_RUN_ID})} -->`;
  const until = Date.now()+10*60*1000;
  while (Date.now()<until) {
    if ((await comments()).some(comment => comment.user?.login === env.GITHUB_REPOSITORY_OWNER && comment.user.type === 'User' && comment.body.trim() === release)) {
      const released={...observation,released:true,currentRevision:(await api('commits/main')).sha};
      console.log(JSON.stringify(released));
      if(env.LIGHTHOUSE_ACCEPTANCE_GATE_LOG)await appendFile(env.LIGHTHOUSE_ACCEPTANCE_GATE_LOG,JSON.stringify(released)+'\n'); return;
    }
    await new Promise(resolve=>setTimeout(resolve,5000));
  }
  throw Error('Acceptance gate timed out without a release; original dispatch was not forwarded');
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await waitForAcceptanceGate(process.argv[2]);
