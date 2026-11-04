// Render the existing managed projection with an exact published package instead of a source checkout.
export function registryWorkflow(content, version) {
  if (!/^\d+\.\d+\.\d+(?:-[\w.-]+)?$/.test(version)) throw Error('Registry workflows require an exact package version');
  const checkout = /^([ ]*)- (?:name: [^\n]+\n\1  )?uses: actions\/checkout@v5\n\1  with:\n\1    repository: juangcarmona\/lighthouse\n\1    ref: [^\n]+\n(?:\1    path: \.lighthouse-harness\n)?\1    persist-credentials: false/gm;
  content = content.replace(checkout, (_match, indent) => `${indent}- name: Select Node for the published harness\n${indent}  uses: actions/setup-node@v5\n${indent}  with:\n${indent}    node-version: 24\n${indent}- name: Install the published Lighthouse harness\n${indent}  run: npm install --prefix .lighthouse-harness --ignore-scripts --no-audit --no-fund --package-lock=true --save-exact @juangcarmona/lighthouse-sdlc@${version}`);
  if (/repository: juangcarmona\/lighthouse\s*\n/.test(content)) throw Error('Unrecognized source harness checkout; registry projection refused');
  content = content.replaceAll('.lighthouse-harness/src/packages/sdlc', '.lighthouse-harness/node_modules/@juangcarmona/lighthouse-sdlc');
  content = content.replace(/src\/packages\/sdlc\//g, '.lighthouse-harness/node_modules/@juangcarmona/lighthouse-sdlc/');
  // Source-root preparation previously installed the monorepo. Provider dependencies now belong to the isolated harness prefix.
  content = content.replace(/(^([ ]*)- name: Install provider integration when the adopter configured it\n)(\2  run: \|)/m, '$1$2  working-directory: .lighthouse-harness\n$3');
  return content;
}
