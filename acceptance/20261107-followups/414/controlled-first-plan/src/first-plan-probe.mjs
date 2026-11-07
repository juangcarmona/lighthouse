import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import { rejectedPlan } from './rejected-plan.mjs';
const original = ["/usr/local/bin/lighthouse-engine"];
if (process.env.ENGINE_STAGE === 'propose' && process.argv[2] !== 'cleanup-session') {
 const context = JSON.parse(fs.readFileSync('/input/context.json','utf8'));
 if (context.request.issue === 54 && !context.correction) {
  const envelope = structuredClone(context.contract.envelope);
  envelope.result.status = 'passed';
  envelope.result.evidence = [{id:'controlled-first-plan',status:'passed'}];
  envelope.result.output = {files:rejectedPlan(context.proposal.root)};
  envelope.effect.body = 'Controlled first-plan validation fixture; no production edit or model invocation.';
  fs.writeFileSync('/output/envelope.json',JSON.stringify(envelope));
  console.log(JSON.stringify({type:'text',part:{text:'Controlled initial-plan defect injected; no model invoked.'}}));
  process.exit(0);
 }
}
const result = spawnSync(original[0],[...original.slice(1),...process.argv.slice(2)],{stdio:'inherit',env:process.env});
if(result.error)console.error('Base engine could not start.');
process.exit(result.status ?? 1);
