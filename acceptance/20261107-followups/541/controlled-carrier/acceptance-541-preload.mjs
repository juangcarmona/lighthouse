import { waitForAcceptanceGate } from './acceptance-541-gates.mjs';
const nativeFetch = globalThis.fetch;
let held = false;
globalThis.fetch = async (url, options) => {
  if (!held && url === `https://api.github.com/repos/${process.env.GITHUB_REPOSITORY}/actions/workflows/lighthouse-sdlc-review.lock.yml/dispatches` && options?.method === 'POST') {
    const request = JSON.parse(options.body);
    if (request.inputs?.issue === '59') { held = true; await waitForAcceptanceGate('before-post',request,nativeFetch); }
  }
  return nativeFetch(url,options);
};
