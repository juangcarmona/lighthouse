import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { readFile } from 'node:fs/promises';

test('the UI artifact contains the complete visual contract', () => {
  const root = fileURLToPath(new URL('../../', import.meta.url));
  const packages = [
    ['@juangcarmona/lighthouse', [
      'README.md',
      'assets/command-aliases.json',
      'assets/dotnet-template/Directory.Build.props',
      'assets/dotnet-template/Directory.Packages.props',
      'assets/dotnet-template/Lighthouse.Analyzers/BackendContractAnalyzer.cs',
      'assets/dotnet-template/Lighthouse.Analyzers/Lighthouse.Analyzers.csproj',
      'assets/dotnet-template/Lighthouse.Analyzers/packages.lock.json',
      'assets/dotnet-template/Lighthouse.Cqrs/Handlers.cs',
      'assets/dotnet-template/Lighthouse.Cqrs/Lighthouse.Cqrs.csproj',
      'assets/dotnet-template/Lighthouse.Cqrs/packages.lock.json',
      'assets/dotnet-template/Lighthouse.slnx',
      'assets/dotnet-template/examples/src/modules/Lighthouse.Example.Modules.Catalog/CatalogModule.cs',
      'assets/dotnet-template/examples/src/modules/Lighthouse.Example.Modules.Catalog/Features/Entries/CreateEntry.cs',
      'assets/dotnet-template/examples/src/modules/Lighthouse.Example.Modules.Catalog/Features/Entries/EntryStore.cs',
      'assets/dotnet-template/examples/src/modules/Lighthouse.Example.Modules.Catalog/Features/Entries/GetEntry.cs',
      'assets/dotnet-template/examples/src/modules/Lighthouse.Example.Modules.Catalog/Lighthouse.Example.Modules.Catalog.csproj',
      'assets/dotnet-template/examples/src/modules/Lighthouse.Example.Modules.Catalog/packages.lock.json',
      'assets/dotnet-template/examples/src/root/Lighthouse.Example.Api/Lighthouse.Example.Api.csproj',
      'assets/dotnet-template/examples/src/root/Lighthouse.Example.Api/Program.cs',
      'assets/dotnet-template/examples/src/root/Lighthouse.Example.Api/Properties/launchSettings.json',
      'assets/dotnet-template/examples/src/root/Lighthouse.Example.Api/packages.lock.json',
      'assets/dotnet-template/examples/src/root/Lighthouse.Example.AppHost/Lighthouse.Example.AppHost.csproj',
      'assets/dotnet-template/examples/src/root/Lighthouse.Example.AppHost/Program.cs',
      'assets/dotnet-template/examples/src/root/Lighthouse.Example.AppHost/Properties/launchSettings.json',
      'assets/dotnet-template/examples/src/root/Lighthouse.Example.AppHost/aspire.config.json',
      'assets/dotnet-template/examples/src/root/Lighthouse.Example.AppHost/packages.lock.json',
      'assets/dotnet-template/global.json',
      'assets/dotnet-template/tests/Lighthouse.Analyzers.Tests/BackendContractTests.cs',
      'assets/dotnet-template/tests/Lighthouse.Analyzers.Tests/Lighthouse.Analyzers.Tests.csproj',
      'assets/dotnet-template/tests/Lighthouse.Analyzers.Tests/packages.lock.json',
      'assets/dotnet-template/tests/Lighthouse.Example.Tests/CatalogTests.cs',
      'assets/dotnet-template/tests/Lighthouse.Example.Tests/Lighthouse.Example.Tests.csproj',
      'assets/dotnet-template/tests/Lighthouse.Example.Tests/packages.lock.json',
      'assets/guardrails/catalog.json',
      'assets/guardrails/semantic-tokens.json',
      'assets/profiles/catalog.json',
      'assets/profiles/dotnet/README.md',
      'assets/profiles/dotnet/SKILL.md',
      'assets/profiles/dotnet/adoption.md',
      'assets/profiles/dotnet/architecture.md',
      'assets/profiles/dotnet/guardrails.md',
      'assets/profiles/dotnet/practices.md',
      'assets/profiles/dotnet/testing-and-development.md',
      'assets/profiles/dotnet/use-cases.md',
      'assets/profiles/identity.md',
      'assets/profiles/mobile-expo/README.md',
      'assets/profiles/mobile-expo/SKILL.md',
      'assets/profiles/mobile-expo/adoption.md',
      'assets/profiles/mobile-expo/guardrails.md',
      'assets/profiles/mobile-expo/testing.md',
      'assets/profiles/mobile-maui/README.md',
      'assets/profiles/mobile-maui/SKILL.md',
      'assets/profiles/mobile-maui/adoption.md',
      'assets/profiles/mobile-maui/guardrails.md',
      'assets/profiles/mobile-maui/testing.md',
      'assets/profiles/pwa-capability/README.md',
      'assets/profiles/pwa-capability/SKILL.md',
      'assets/profiles/pwa-capability/adoption.md',
      'assets/profiles/pwa-capability/guardrails.md',
      'assets/profiles/pwa-capability/offline.md',
      'assets/profiles/pwa-capability/testing.md',
      'assets/profiles/react-web-platform/README.md',
      'assets/profiles/react-web-platform/SKILL.md',
      'assets/profiles/react-web-platform/adoption.md',
      'assets/profiles/react-web-platform/guardrails.md',
      'assets/profiles/react-web-platform/structure.md',
      'assets/profiles/react-web-platform/testing.md',
      'assets/profiles/web-bff/README.md',
      'assets/profiles/web-bff/SKILL.md',
      'assets/profiles/web-bff/adoption.md',
      'assets/profiles/web-bff/security.md',
      'assets/profiles/web-bff/testing.md',
      'assets/schemas/command-aliases.schema.json',
      'assets/schemas/github-profile.schema.json',
      'assets/schemas/guardrails.schema.json',
      'assets/schemas/init-plan.schema.json',
      'assets/schemas/lighthouse-manifest.schema.json',
      'assets/schemas/lighthouse-upgrade.schema.json',
      'assets/schemas/profile-catalog.schema.json',
      'assets/schemas/semantic-tokens.schema.json',
      'assets/skills/init/SKILL.md',
      'github-profile.md',
      'package.json',
      'src/aliases.mjs',
      'src/create-dotnet.mjs',
      'src/github-profile.mjs',
      'src/guardrails.mjs',
      'src/init-plan.mjs',
      'src/lighthouse.mjs',
      'src/product-definition.mjs',
      'src/profiles.mjs',
      'src/semantic-tokens.mjs',
      'src/verify-dotnet.mjs',
      'upgrades/0.3.0.md',
      'upgrades/0.4.0.md',
      'upgrades/pdac-v1alpha2.md'
    ]],
    ['@juangcarmona/lighthouse-ui', ['DESIGN.md', 'README.md', 'components.css', 'index.css', 'package.json', 'skills/ui-design/SKILL.md', 'tokens.css']]
  ];
  for (const [name, files] of packages) {
    const packed = spawnSync('npm', ['pack', '--workspace', name, '--dry-run', '--json'], { cwd: root, encoding: 'utf8' });
    assert.equal(packed.status, 0, packed.stderr);
    const [artifact] = JSON.parse(packed.stdout);
    assert.equal(artifact.name, name);
    assert.deepEqual(artifact.files.map((file) => file.path).sort(), [...files, 'LICENSE', 'NOTICE'].sort());
  }
});

test('the installed visual guide declares canonical exported authority and separate consumer selection', async () => {
  const uiRoot = new URL('../packages/ui/', import.meta.url);
  const guide = await readFile(new URL('DESIGN.md', uiRoot), 'utf8');
  const tokens = await readFile(new URL('tokens.css', uiRoot), 'utf8');
  const pkg = JSON.parse(await readFile(new URL('package.json', uiRoot), 'utf8'));
  assert.match(guide, /^source: [.]\/tokens[.]css$/mu);
  assert.equal(pkg.exports['./tokens.css'], './tokens.css');
  assert.match(guide, /Consumer-source checking is separately opt-in/);
  const primitiveNames = guide.match(/^primitiveTokens: \[([^\]]+)\]$/mu)[1].split(',').map(name => name.trim());
  for (const name of primitiveNames) assert.ok(tokens.includes(`${name}:`));
  for (const role of ['--lh-canvas', '--lh-text', '--lh-action', '--lh-focus']) assert.ok(!primitiveNames.includes(role));
});
