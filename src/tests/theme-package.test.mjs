import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

test('the UI artifact contains the complete visual contract', () => {
  const root = fileURLToPath(new URL('../../', import.meta.url));
  const packages = [
    ['@juangcarmona/lighthouse', [
      'README.md',
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
      'assets/profiles/catalog.json',
      'assets/profiles/dotnet/README.md',
      'assets/profiles/dotnet/SKILL.md',
      'assets/profiles/dotnet/adoption.md',
      'assets/profiles/dotnet/architecture.md',
      'assets/profiles/dotnet/guardrails.md',
      'assets/profiles/dotnet/practices.md',
      'assets/profiles/dotnet/testing-and-development.md',
      'assets/profiles/dotnet/use-cases.md',
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
      'assets/schemas/guardrails.schema.json',
      'assets/schemas/lighthouse-manifest.schema.json',
      'assets/schemas/lighthouse-upgrade.schema.json',
      'assets/schemas/profile-catalog.schema.json',
      'package.json',
      'src/create-dotnet.mjs',
      'src/guardrails.mjs',
      'src/lighthouse.mjs',
      'src/profiles.mjs',
      'src/verify-dotnet.mjs',
      'upgrades/0.3.0.md',
      'upgrades/0.4.0.md'
    ]],
    ['@juangcarmona/lighthouse-ui', ['DESIGN.md', 'README.md', 'components.css', 'index.css', 'package.json', 'skills/ui-design/SKILL.md', 'tokens.css']]
  ];
  for (const [name, files] of packages) {
    const packed = spawnSync('npm', ['pack', '--workspace', name, '--dry-run', '--json'], { cwd: root, encoding: 'utf8' });
    assert.equal(packed.status, 0, packed.stderr);
    const [artifact] = JSON.parse(packed.stdout);
    assert.equal(artifact.name, name);
    assert.deepEqual(artifact.files.map((file) => file.path).sort(), files);
  }
});
