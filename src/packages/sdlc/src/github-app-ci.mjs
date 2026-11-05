import { createPrivateKey, sign } from 'node:crypto';
import { pathToFileURL } from 'node:url';

// This credential is used only by the trusted host to create a verification ref.
// Mint just before the effect: model execution can outlast an installation token.
export function githubAppCiTrigger(env, { fetchImpl = fetch, now = Date.now } = {}) {
  const client = env.LIGHTHOUSE_CI_APP_CLIENT_ID, key = env.LIGHTHOUSE_CI_APP_PRIVATE_KEY;
  if (!client && !key) return null;
  if (!/^[A-Za-z0-9_.-]{1,100}$/.test(client ?? '') || typeof key !== 'string' || !key || !/^[A-Za-z0-9][A-Za-z0-9-]*\/[\w.-]+$/.test(env.GITHUB_REPOSITORY ?? '') || ['.', '..'].includes(env.GITHUB_REPOSITORY?.split('/')[1])) throw Object.assign(Error('Configure LIGHTHOUSE_CI_APP_CLIENT_ID and LIGHTHOUSE_CI_APP_PRIVATE_KEY for this repository.'), { ciAppSetupRequired: true });
  const repository = env.GITHUB_REPOSITORY, name = repository.split('/')[1];
  return async ({ branch, head, probe = false, beforeWrite = async () => {} }) => {
    if (typeof probe !== 'boolean' || !probe && (!/^lighthouse\/verification-[1-9][0-9]*-[a-f0-9]{40}$/.test(branch ?? '') || !/^[a-f0-9]{40}$/.test(head ?? '') || !branch.endsWith('-' + head))) throw Error('Invalid CI verification reference');
    let token, attempted = false, result, checkingAuthority = false;
    const request = async (path, credential, method = 'GET', body) => {
      const response = await fetchImpl('https://api.github.com/' + path, { method, headers: { authorization: 'Bearer ' + credential, accept: 'application/vnd.github+json', 'content-type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(30000) });
      if (!response.ok) throw Object.assign(Error('GitHub App CI request rejected'), { status: response.status });
      return response.status === 204 ? null : response.json();
    };
    try {
      const timestamp = Math.floor(now() / 1000), encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
      const unsigned = encode({ alg: 'RS256', typ: 'JWT' }) + '.' + encode({ iat: timestamp - 60, exp: timestamp + 540, iss: client });
      const privateKey = createPrivateKey(key);
      if (privateKey.asymmetricKeyType !== 'rsa') throw Error('CI App requires an RSA key');
      const jwt = unsigned + '.' + sign('RSA-SHA256', Buffer.from(unsigned), privateKey).toString('base64url');
      const installation = await request('repos/' + repository + '/installation', jwt);
      if (!Number.isSafeInteger(installation?.id) || installation.id < 1) throw Error('CI App installation is unavailable');
      const scope = await request(`app/installations/${installation.id}/access_tokens`, jwt, 'POST', { repositories: [name], permissions: { contents: 'write' } });
      if (typeof scope?.token === 'string' && scope.token.length > 0 && scope.token.length < 8192) token = scope.token;
      if (!token || scope.permissions?.contents !== 'write' || Object.keys(scope.permissions).some(permission => !['contents', 'metadata'].includes(permission)) || scope.permissions.metadata && scope.permissions.metadata !== 'read' || !Array.isArray(scope.repositories) || scope.repositories.length !== 1 || scope.repositories[0].full_name !== repository || !Number.isFinite(Date.parse(scope.expires_at)) || Date.parse(scope.expires_at) <= now() || Date.parse(scope.expires_at) > now() + 3660000) throw Error('CI App token scope is unavailable or exceeds this repository');
      checkingAuthority = true;
      await beforeWrite();
      checkingAuthority = false;
      result = { repository, installation: installation.id, client, permissions: { ...scope.permissions }, expiresAt: new Date(Date.parse(scope.expires_at)).toISOString(), tokenRevoked: false };
      if (!probe) {
        attempted = true;
        const reference = await request('repos/' + repository + '/git/refs', token, 'POST', { ref: 'refs/heads/' + branch, sha: head });
        if (reference?.ref !== 'refs/heads/' + branch || reference.object?.sha !== head || reference.object.type !== 'commit') throw Error('CI App reference creation is unconfirmed');
        Object.assign(result, { ref: reference.ref, head });
      }
    } catch (error) {
      throw Object.assign(Error(checkingAuthority ? 'CI authority changed; no verification reference was written.' : `GitHub App CI ${attempted ? 'reference creation is unconfirmed' : 'setup or authorization failed'}${Number.isInteger(error.status) ? ` (HTTP ${error.status})` : ''}. Inspect the App installation and retained verification reference before retrying.`), { ...(Number.isInteger(error.status) ? { status: error.status } : {}), referenceAttempted: attempted, authorityChanged: checkingAuthority });
    } finally {
      if (token) {
        try { await request('installation/token', token, 'DELETE'); if (result) result.tokenRevoked = true; }
        catch { /* The repository-scoped token still expires at its provider-issued deadline. */ }
      }
    }
    return result;
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    if (process.argv[2] !== 'check') throw Error('Expected: github-app-ci.mjs check');
    const trigger = githubAppCiTrigger(process.env);
    if (!trigger) throw Error('Configure LIGHTHOUSE_CI_APP_CLIENT_ID and LIGHTHOUSE_CI_APP_PRIVATE_KEY.');
    console.log(JSON.stringify(await trigger({ probe: true })));
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
