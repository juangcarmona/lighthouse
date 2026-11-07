export const repositoryApiUrl = (repository, path = '') => `https://api.github.com/repos/${repository}${path ? `/${path}` : ''}`;

async function denialMessage(response, token) {
  let reader;
  try {
    reader = response.body.getReader();
    const bytes = new Uint8Array(8192);
    let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (size + value.byteLength > bytes.length) return '';
      bytes.set(value, size);
      size += value.byteLength;
    }
    const payload = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes.subarray(0, size)));
    if (!payload || Array.isArray(payload) || typeof payload !== 'object' || typeof payload.message !== 'string') return '';
    const normalize = text => text.replace(/\x1b\[[0-?]*[ -/]*[@-~]/g, '').replace(/\s+/gu, ' ').replace(/[\p{Cc}\p{Cf}]/gu, '').trim();
    const redact = (text, secret) => (secret ? text.split(secret).join('REDACTED') : text)
      .replace(/Bearer\s+[^\s"']+/gi, 'Bearer REDACTED')
      .replace(/(?:sk-|gh[pousr]_|github_pat_)[A-Za-z0-9_-]+/g, 'REDACTED')
      .replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, 'REDACTED');
    const message = redact(normalize(redact(payload.message, token)), token ? normalize(token) : '');
    // Provider diagnostics are plain text, never markup, links or encoded commands.
    if (!message || /[<>`\[\]{}()\\&*_~#!|]|::|%[0-9a-f]{2}|https?:\/\//i.test(message)) return '';
    if (message.length <= 300) return message;
    const end = /[\uD800-\uDBFF]/.test(message[298]) ? 298 : 299;
    const bounded = message.slice(0, end) + '…';
    return redact(bounded, token ? normalize(token) : '') === bounded ? bounded : '';
  } catch { return ''; }
  finally {
    // Cancellation is best-effort: a broken provider stream cannot mask the HTTP error.
    if (reader) {
      try { void reader.cancel().catch(() => {}); } catch {}
      try { reader.releaseLock(); } catch {}
    }
  }
}

export function createIssueApi(repo, env, fetchRequest = fetch) {
  return async (path, method = 'GET', body, optional = false) => {
    const r = await fetchRequest(repositoryApiUrl(repo, path), { method, headers: { authorization: `Bearer ${env.GH_TOKEN}`, accept: 'application/vnd.github+json', 'content-type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(30000) });
    if (optional && r.status === 404) return null;
    if (!r.ok) {
      const error = Object.assign(Error(`GitHub ${method} ${path}: ${r.status}`), { status: r.status });
      const message = await denialMessage(r, env.GH_TOKEN);
      if (message) error.message += `: ${message}`;
      throw error;
    }
    if (/^actions\/jobs\/[1-9][0-9]*\/logs$/.test(path)) {
      const log = await r.text();
      if (Buffer.byteLength(log) > 4 * 1024 * 1024) throw Error('Job log exceeds recovery bounds');
      return log;
    }
    return r.status === 204 ? null : r.json();
  };
}
