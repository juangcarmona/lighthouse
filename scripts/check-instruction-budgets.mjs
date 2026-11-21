import { measureInstructionBudgets } from '../src/packages/sdlc/src/instruction-budgets.mjs';

try {
  const report = await measureInstructionBudgets();
  console.log(JSON.stringify(report, null, 2));
  process.exitCode = report.status === 'passed' ? 0 : 1;
} catch {
  console.error('Instruction budget verification failed: inventory is missing, unreadable or invalid JSON.');
  process.exitCode = 1;
}
