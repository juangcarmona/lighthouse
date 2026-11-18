import { readFile, writeFile } from 'node:fs/promises';
import { createIssueApi } from './github-rest.mjs';
import { prepareAcceptance, produceAcceptance, verifyAcceptance } from './delivery-acceptance.mjs';

export async function acceptanceCli(args, env = process.env) {
  const operation = args[0], option = name => args[args.indexOf(name) + 1];
  const repository = args.includes('--repo') ? option('--repo') : env.GITHUB_REPOSITORY;
  if (!['prepare', 'produce', 'verify'].includes(operation) || !/^[\w.-]+\/[\w.-]+$/.test(repository ?? '') || !env.GH_TOKEN) throw Error('Usage: lighthouse-sdlc delivery-acceptance <prepare|produce|verify> --repo owner/name --input file [--output file]; requires GH_TOKEN with read-only source permissions');
  const api = createIssueApi(repository, env);
  let result;
  if (operation === 'produce') {
    result = await produceAcceptance(api, repository, Number(env.LIGHTHOUSE_DECISION_COMMENT), { runId: Number(env.GITHUB_RUN_ID), attempt: Number(env.GITHUB_RUN_ATTEMPT), revision: env.GITHUB_SHA });
  } else {
    if (!args.includes('--input')) throw Error('A bounded input JSON file is required');
    const bytes = await readFile(option('--input'));
    if (bytes.length > 1024 * 1024) throw Error('Acceptance input exceeds 1 MiB');
    const input = JSON.parse(bytes);
    result = operation === 'prepare' ? await prepareAcceptance(api, repository, input) : await verifyAcceptance(api, repository, input);
  }
  const text = JSON.stringify(result, null, 2) + '\n';
  if (args.includes('--output')) await writeFile(option('--output'), text, { flag: 'wx', mode: 0o600 });
  else process.stdout.write(text);
  if (operation === 'verify' && result.status === 'unavailable') process.exitCode = 1;
  return result;
}
