import { realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

export const codegraphTools = ['codegraph_symbol_search', 'codegraph_get_ai_context'];

export function codegraphCall(params, root = '/workspace') {
  if (!codegraphTools.includes(params?.name)) throw Error('MCP method denied');
  const args = params.arguments ?? {};
  if (params.name === 'codegraph_symbol_search') {
    if (typeof args.query !== 'string' || !args.query.trim() || args.query.length > 200) throw Error('Invalid query');
    return { name: params.name, arguments: { query: args.query, limit: Math.min(Number.isInteger(args.limit) && args.limit > 0 ? args.limit : 5, 10), compact: true } };
  } else {
    const uri = new URL(args.uri);
    if (uri.protocol !== 'file:' || uri.hostname || !Number.isInteger(args.line) || args.line < 0 || !resolve(fileURLToPath(uri)).startsWith(`${realpathSync(root)}/`) || !realpathSync(uri).startsWith(`${realpathSync(root)}/`)) throw Error('Location outside workspace');
    return { name: params.name, arguments: { uri: args.uri, line: args.line, maxTokens: Math.min(Number.isInteger(args.maxTokens) && args.maxTokens > 0 ? args.maxTokens : 500, 500) } };
  }
}
