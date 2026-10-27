import { spawnSync } from 'node:child_process';

const image = process.env.LH_MODEL_EVAL_IMAGE;
const volume = process.env.LH_MODEL_EVAL_VOLUME;
const uid = process.env.LH_MODEL_EVAL_UID;
if (process.argv[2] !== '--run' || !/^sha256:[a-f0-9]{64}$/.test(image ?? '') || !/^[\w-]+$/.test(volume ?? '') || !/^\d+$/.test(uid ?? '')) {
  console.error('Set LH_MODEL_EVAL_IMAGE, LH_MODEL_EVAL_VOLUME and LH_MODEL_EVAL_UID; then pass --run. This makes authenticated model calls.');
  process.exit(2);
}

const fixtures = {
  plan: 'Plan a two-step change to a model-profile resolver so operator worker assignments take precedence over project worker assignments. Name the tests and one rollback check. Do not write code. Reply in at most 120 words.',
  build: 'Return only JavaScript source for function chooseProfile(worker, operator, project, fallback). Use an own worker key from operator first, then an own worker key from project, then fallback. An explicit empty string is a value, not absence. No imports, prose or code fence.',
  review: 'Review this code for exactly one seeded precedence defect and explain a concrete failing example in at most 80 words: function choose(worker, operator, project, fallback) { return project.workers?.[worker] ?? operator.workers?.[worker] ?? fallback; } The contract says operator worker assignment wins over project assignment.',
  lightweight: 'Improve this documentation sentence. Return only the corrected sentence, preserving its meaning: "The operator can change the model for each worker and the project can also change it, but the operator setting wins."',
};
const cases = [
  ['plan', 'openai/gpt-6.1-sol#high'],
  ['build', 'openai/gpt-6.1-sol#medium'],
  ['build', 'openai/gpt-6.1-terra#medium'],
  ['build', 'openai/gpt-5.6-sol#medium'],
  ['review', 'openai/gpt-6.1-sol#high'],
  ['review', 'openai/gpt-6-luna#high'],
  ['lightweight', 'openai/gpt-6-luna#high'],
];

for (const [task, model] of cases) {
  const started = Date.now();
  const result = spawnSync('docker', [
    'run', '--rm', '--user', `${uid}:${uid}`,
    '--mount', `type=volume,src=${volume},dst=/home/engine/.local/share/opencode`,
    '--entrypoint', 'opencode', image, 'run', '--standalone', '--auto', '--model', model,
    '--format', 'json', fixtures[task],
  ], { encoding: 'utf8', timeout: 120000, maxBuffer: 4 * 1024 * 1024 });
  const events = (result.stdout ?? '').split('\n').filter(Boolean).flatMap(line => {
    try { return [JSON.parse(line)]; } catch { return []; }
  });
  const text = events.filter(event => event.type === 'text').map(event => event.part?.text ?? '').join('\n');
  const usage = events.filter(event => event.type === 'step_finish').map(event => event.part?.tokens ?? null).filter(Boolean);
  const errors = events.filter(event => event.type === 'error' || event.part?.state?.status === 'error');
  console.log(JSON.stringify({ task, model, elapsedMs: Date.now() - started, exitCode: result.status, text: text.slice(0, 2500), usage, errors: errors.length, stderr: result.status ? (result.stderr ?? '').slice(0, 300) : undefined }));
}
