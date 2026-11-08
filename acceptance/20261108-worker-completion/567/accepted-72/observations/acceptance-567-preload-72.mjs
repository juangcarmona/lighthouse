import { readFile, appendFile } from 'node:fs/promises';
const nativeFetch = globalThis.fetch;
let held = false;
globalThis.fetch = async (url, options) => {
  const env = process.env;
  if (!held && env.LIGHTHOUSE_ACCEPTANCE_567_ISSUE === '72' && env.LIGHTHOUSE_ISSUE === '72' && env.GITHUB_EVENT_NAME === 'workflow_dispatch' && env.GITHUB_ACTOR === 'github-actions[bot]' && env.GITHUB_TRIGGERING_ACTOR === 'github-actions[bot]' && options?.method === 'POST' && url === `https://api.github.com/repos/${env.GITHUB_REPOSITORY}/actions/workflows/lighthouse-sdlc-review.lock.yml/dispatches`) {
    const event = JSON.parse(await readFile(env.GITHUB_EVENT_PATH, 'utf8')), request = JSON.parse(options.body);
    if (event.inputs?.stage === 'review' && event.inputs?.workflow === 'stage' && request.inputs?.issue === '72') {
      held = true;
      const base = `https://api.github.com/repos/${env.GITHUB_REPOSITORY}`;
      const api = async (path, method = 'GET', body) => {
        const response = await nativeFetch(`${base}/${path}`, { method, headers: { authorization: `Bearer ${env.GH_TOKEN}`, accept: 'application/vnd.github+json', 'content-type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(30000) });
        if (!response.ok) throw Error(`Acceptance transport gate: ${method} ${response.status}`);
        return response.status === 204 ? null : response.json();
      };
      const started = new Date().toISOString(), revision = (await api('commits/main')).sha;
      const observation = { schemaVersion: 1, fixture: 567, issue: 72, phase: 'before-post', run: env.GITHUB_RUN_ID, ci: event.inputs.after_run, requestComment: request.inputs['dispatch-request'], routerRevision: env.GITHUB_SHA, preparedRevision: revision, started, transportDeadlineStartsAfterGate: true };
      await api('issues/72/comments', 'POST', { body: `Controlled transport pause; admission and original request remain unchanged.\n\n<!-- lighthouse-567-gate:${JSON.stringify(observation)} -->` });
      const release = `<!-- lighthouse-actions:${JSON.stringify({ acceptance567: 'before-post', run: env.GITHUB_RUN_ID })} -->`;
      for (const deadline = Date.now() + 600000; Date.now() < deadline;) {
        const comments = await api('issues/72/comments?per_page=100');
        if (comments.some(c => c.user?.login === env.GITHUB_REPOSITORY_OWNER && c.user.type === 'User' && c.body.trim() === release)) {
          const proof = { ...observation, released: new Date().toISOString(), resolvedRevision: (await api('commits/main')).sha };
          await appendFile(env.LIGHTHOUSE_ACCEPTANCE_GATE_LOG, JSON.stringify(proof) + '\n');
          console.log(JSON.stringify(proof));
          // The fixture pauses before HTTP delivery; keep its pause outside the production HTTP deadline.
          return nativeFetch(url, { ...options, signal: AbortSignal.timeout(30000) });
        }
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
      throw Error('Controlled transport pause expired; no request was forwarded');
    }
  }
  return nativeFetch(url, options);
};
