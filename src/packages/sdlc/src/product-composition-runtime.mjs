// Host-owned projection. No model-provided server command or policy is admitted.
export function configureProductCompositionWorker(config) {
  if (!Array.isArray(config?.policies) || !Array.isArray(config?.permissions)) throw Error('Unsupported OpenCode composition policy; update and qualify the pinned planning image');
  config.mcp ??= {};
  config.mcp.servers ??= {};
  if (config.mcp.servers.productcomposition) throw Error('Conflicting Product Change composition integration');
  config.mcp.servers.productcomposition = { type: 'local', command: ['node', '/harness/src/product-composition-server.mjs'], codemode: false };
  config.policies.push({ action: 'integration.use', resource: 'mcp:productcomposition', effect: 'allow' });
  for (const tool of ['productcomposition_inspect', 'productcomposition_compose']) {
    config.policies.push({ action: 'tool.use', resource: `${tool}:*`, effect: 'allow' });
    config.permissions.push({ action: tool, resource: '*', effect: 'allow' });
  }
  return config;
}
