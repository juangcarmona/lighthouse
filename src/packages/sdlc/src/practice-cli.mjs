import { aggregatePracticeHistory } from './practice-history.mjs';
import { readFileSync, statSync } from 'node:fs';
import { practiceCatalog } from './practice-catalog.mjs';
import { evaluatePractices } from './practice-evaluator.mjs';
import { collectGithubTests } from './practice-github.mjs';

const usage = 'Usage: lighthouse-sdlc practices catalog | validate --input <file> | history --input <file> | github --input <source-request.json>';
export async function practiceCli(args) {
  const [command, ...flags] = args;
  if (!['catalog', 'validate', 'history', 'github'].includes(command)) throw Error(usage);
  if (command === 'catalog') { if (flags.length) throw Error(usage); return practiceCatalog; }
  if (flags.length !== 2 || flags[0] !== '--input' || !flags[1]) throw Error(usage);
  if (statSync(flags[1]).size > 16 * 1024 * 1024) throw Error('Practice input exceeds 16 MiB');
  const input = JSON.parse(readFileSync(flags[1], 'utf8'));
  if (command === 'history') return aggregatePracticeHistory(input);
  if (command === 'validate') return evaluatePractices({ context: input.context, observations: input.observations, now: input.now });
  if (Object.keys(input).some(k => !['context', 'runId', 'attempt', 'jobId', 'workflow', 'stepName', 'command'].includes(k))) throw Error('Unknown native source request field');
  const collected = await collectGithubTests(input);
  const report = await evaluatePractices({ context: input.context, observations: collected.observations, resolveSource: collected.resolveSource });
  return { ...report, authority: collected.authority };
}
