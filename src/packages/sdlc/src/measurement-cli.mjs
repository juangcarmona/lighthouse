import { readFile, writeFile } from 'node:fs/promises';
import { deriveMeasurements, metricDefinitions, stableJson } from './measurement.mjs';

export async function measurementCli(args) {
  const operation = args[0], option = name => args[args.indexOf(name) + 1];
  if (!['definitions', 'derive'].includes(operation) || operation === 'derive' && !args.includes('--input')) throw Error('Usage: lighthouse-sdlc measurements definitions | derive --input frozen.json [--output metrics.json]');
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
