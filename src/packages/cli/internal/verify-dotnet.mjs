import { spawnSync } from 'node:child_process';
import { readdir, readFile, mkdir, mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';

const root = process.cwd();
const nestedSolution = resolve(root, 'src/dotnet/Lighthouse.slnx');
const rootSolutions = (await readdir(root)).filter((name) => name.endsWith('.slnx'));
const solutionPath = await readFile(nestedSolution).then(() => nestedSolution).catch(() => {
  if (rootSolutions.length !== 1) throw new Error('Expected src/dotnet/Lighthouse.slnx or one generated root solution.');
  return resolve(root, rootSolutions[0]);
});
const dotnetRoot = dirname(solutionPath);
const lighthouseSourceRoot = solutionPath === nestedSolution ? dotnetRoot : resolve(root, 'src/dotnet');
const solutionName = solutionPath.slice(dotnetRoot.length + 1);
function run(args, options = {}) {
  const result = spawnSync('dotnet', args, { cwd: dotnetRoot, encoding: 'utf8', ...options });
  if (result.error) throw result.error;
  return result;
}
for (const args of [
  ['restore', solutionName, '--locked-mode'],
  ['build', solutionName, '--no-restore', '-c', 'Release'],
  ['test', solutionName, '--no-build', '--no-restore', '-c', 'Release']
]) {
  const result = run(args, { stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

const sourceFiles = [];
async function collectSource(folder) {
  for (const entry of await readdir(resolve(dotnetRoot, folder), { withFileTypes: true })) {
    if (['bin', 'obj', 'node_modules'].includes(entry.name)) continue;
    const path = folder === '.' ? entry.name : `${folder}/${entry.name}`;
    if (entry.isDirectory()) await collectSource(path);
    else if (entry.isFile() && entry.name.endsWith('.cs')) sourceFiles.push(path);
  }
}
await collectSource('.');
const formatted = run(['format', 'whitespace', '.', '--folder', '--verify-no-changes',
  '--include', ...sourceFiles, '--verbosity', 'quiet'], { stdio: 'inherit' });
if (formatted.status !== 0) process.exit(formatted.status ?? 1);

const solution = await readFile(solutionPath, 'utf8');
for (const match of solution.matchAll(/<Project Path="([^"]+\.csproj)"/g)) {
  const result = run(['msbuild', resolve(dotnetRoot, match[1]), '-getProperty:AssemblyName,LighthouseModule', '-getItem:ProjectReference']);
  if (result.status !== 0) throw new Error(`Cannot evaluate project policy: ${match[1]}`);
  const evaluated = JSON.parse(result.stdout);
  const assembly = evaluated.Properties.AssemblyName;
  if (!assembly.includes('.Modules.') || assembly.endsWith('.Contracts') || assembly.endsWith('Tests')) continue;
  const active = evaluated.Properties.LighthouseModule === 'true';
  const attached = evaluated.Items.ProjectReference.some((item) => item.Identity.endsWith('Lighthouse.Analyzers.csproj')
    && item.OutputItemType === 'Analyzer' && item.ReferenceOutputAssembly === 'false');
  if (!active || !attached) throw new Error(`Module ${assembly} must activate and reference the Lighthouse analyzer.`);
}
process.stdout.write('Every implementation module in the solution activates the analyzer.\n');

const probe = await mkdtemp(join(tmpdir(), 'lighthouse-rejection-'));
const xml = (value) => value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;');
try {
  await mkdir(resolve(probe, 'Sibling'));
  await mkdir(resolve(probe, 'Invalid'));
  await writeFile(resolve(probe, 'Sibling/Sibling.csproj'), '<Project Sdk="Microsoft.NET.Sdk"><PropertyGroup><TargetFramework>net10.0</TargetFramework><ImplicitUsings>enable</ImplicitUsings><AssemblyName>JuanGCarmona.Probe.Modules.Sibling</AssemblyName></PropertyGroup></Project>');
  await writeFile(resolve(probe, 'Sibling/Sibling.cs'), 'namespace JuanGCarmona.Probe.Modules.Sibling; public sealed class SiblingExport {}');
  await writeFile(resolve(probe, 'Invalid/Invalid.csproj'), `<Project Sdk="Microsoft.NET.Sdk">
    <PropertyGroup><TargetFramework>net10.0</TargetFramework><ImplicitUsings>enable</ImplicitUsings><AssemblyName>JuanGCarmona.Probe.Modules.Invalid</AssemblyName><LighthouseModule>true</LighthouseModule></PropertyGroup>
    <ItemGroup>
      <CompilerVisibleProperty Include="LighthouseModule" />
      <ProjectReference Include="../Sibling/Sibling.csproj" />
      <ProjectReference Include="${xml(resolve(lighthouseSourceRoot, 'Lighthouse.Cqrs/Lighthouse.Cqrs.csproj'))}" />
      <ProjectReference Include="${xml(resolve(lighthouseSourceRoot, 'Lighthouse.Analyzers/Lighthouse.Analyzers.csproj'))}" OutputItemType="Analyzer" ReferenceOutputAssembly="false" />
    </ItemGroup></Project>`);
  await writeFile(resolve(probe, 'Invalid/Invalid.cs'), `using JuanGCarmona.Lighthouse.Cqrs;
    namespace JuanGCarmona.Probe.Modules.Invalid;
    public class ExposedHandler : ICommandHandler<string, string> {
      public Task<string> Handle(string request, CancellationToken token) => Task.FromResult(request);
    }`);
  const result = run(['build', resolve(probe, 'Invalid/Invalid.csproj'), '-c', 'Release']);
  const output = result.stdout + result.stderr;
  if (result.status === 0 || !/error LH1001\b/.test(output) || !/error LH1002\b/.test(output)) {
    process.stderr.write(output);
    throw new Error('The real build must reject both the exposed handler and sibling implementation reference.');
  }
  process.stdout.write('Build rejection rehearsal passed: LH1001 and LH1002 blocked the invalid module.\n');
} finally { await rm(probe, { recursive: true, force: true }); }
