import { readFile, writeFile } from 'node:fs/promises';
import { createIssueApi } from './github-rest.mjs';
import { collectGithubMeasurements } from './measurement-github.mjs';
import { deriveMeasurements, metricDefinitions, stableJson } from './measurement.mjs';

export async function measurementCli(args, env = process.env) {
  const operation = args[0], option = name => args[args.indexOf(name) + 1];
  if (operation === 'collect') {
    const repository = option('--repo');
    if (!args.includes('--repo') || !args.includes('--start') || !args.includes('--end') || !args.includes('--output') || !env.GH_TOKEN) throw Error('collect requires --repo owner/repo --start UTC --end UTC --output frozen.json and read-only GH_TOKEN');
    const bounds = Object.fromEntries([['--max-pages', 'maxPages'], ['--max-issues', 'maxIssues'], ['--max-prs', 'maxPullRequests'], ['--max-runs', 'maxRuns'], ['--max-requests', 'maxRequests']].filter(([flag]) => args.includes(flag)).map(([flag, key]) => [key, Number(option(flag))]));
    const result = await collectGithubMeasurements(repository, { start: option('--start'), end: option('--end') }, { api: createIssueApi(repository, env), bounds, workflows: args.includes('--workflows') ? option('--workflows').split(',') : [] });
    await writeFile(option('--output'), stableJson(result) + '\n', { flag: 'wx', mode: 0o600 });
    process.stdout.write(JSON.stringify({ status: 'collected', records: result.records.length, gaps: result.collections.filter(c => c.status !== 'complete').length }) + '\n');
    return result;
  }
  if (operation === 'render') {
    if (!args.includes('--input') || !args.includes('--output')) throw Error('render requires --input frozen.json --output report.html');
    const bytes = await readFile(option('--input'));
    if (bytes.length > 4 * 1024 * 1024) throw Error('Frozen measurement input exceeds 4 MiB');
    const { renderMeasurementReport } = await import('./measurement-report.mjs');
    const bundle = JSON.parse(bytes), html = renderMeasurementReport(bundle);
    await writeFile(option('--output'), html, { flag: 'wx', mode: 0o600 });
    process.stdout.write(JSON.stringify({ status: 'rendered', inputSha256: deriveMeasurements(bundle).inputSha256 }) + '\n');
    return html;
  }
  if (!['definitions', 'derive'].includes(operation) || operation === 'derive' && !args.includes('--input')) throw Error('Usage: lighthouse-sdlc measurements definitions | derive --input frozen.json [--output metrics.json] | collect --repo owner/repo --start UTC --end UTC --output frozen.json | render --input frozen.json --output report.html');
  let result;
  if (operation === 'definitions') result = { schemaVersion: 1, definitions: metricDefinitions };
  else {
    const bytes = await readFile(option('--input'));
    if (bytes.length > 4 * 1024 * 1024) throw Error('Frozen measurement input exceeds 4 MiB');
    result = deriveMeasurements(JSON.parse(bytes));
  }
  const text = stableJson(result) + '\n';
  if (args.includes('--output')) await writeFile(option('--output'), text, { flag: 'wx', mode: 0o600 });
  else process.stdout.write(text);
  return result;
}
