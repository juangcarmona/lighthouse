import test from 'node:test';
import assert from 'node:assert/strict';
import { formatOpenCodeEvent, progressText } from '../packages/sdlc/src/opencode-progress.mjs';
import { redactLog } from '../packages/sdlc/src/opencode-execute.mjs';

const event = (type, part) => JSON.stringify({ type, part });

test('public progress is readable and every line is inert in Actions', () => {
  assert.equal(formatOpenCodeEvent(event('text', { text: 'Checking the scope.\nOwner answer resolves the ambiguity.' })), '[OpenCode] Checking the scope.\n[OpenCode] Owner answer resolves the ambiguity.');
  const text = formatOpenCodeEvent(event('text', { text: '::error::forged\n\r::add-mask::secret\n##[error]legacy' }));
  assert.ok(text.split('\n').every(line => line.startsWith('[OpenCode] ')));
  assert.ok(!text.includes('##['));
  assert.equal(formatOpenCodeEvent(event('reasoning', { text: 'private reasoning' })), null);
  assert.equal(formatOpenCodeEvent(event('step_finish', { tokens: { input: 200 } })), null);
});

test('tools show the operation and target without copying file contents or patches', () => {
  const line = formatOpenCodeEvent(event('tool_use', { tool: 'read', state: { status: 'completed', input: { path: '/workspace/src/App.tsx' }, output: 'a very large source file' } }));
  assert.equal(line, '[Tool] read /workspace/src/App.tsx — completed');
  assert.ok(!line.includes('large source'));
  assert.equal(formatOpenCodeEvent(event('tool_use', { tool: 'apply_patch', state: { status: 'completed', input: { patch: 'huge patch' } } })), '[Tool] apply_patch — completed');
  assert.match(formatOpenCodeEvent(event('tool_use', { tool: 'read', state: { status: 'error', error: 'Permission denied' } })), /Tool error.*Permission denied/);
});

test('errors remain visible, ordinary engine diagnostics stay in the event artifact', () => {
  assert.equal(formatOpenCodeEvent('INFO service=storage database initialized'), null);
  assert.match(formatOpenCodeEvent('ERROR service=provider request failed'), /Engine.*request failed/);
  assert.match(formatOpenCodeEvent(JSON.stringify({ type: 'error', error: { data: { message: 'Provider unavailable' } } })), /Engine error.*Provider unavailable/);
  assert.equal(formatOpenCodeEvent('null'), null);
  assert.equal(formatOpenCodeEvent('42'), null);
  const line = event('text', { text: 'Bearer private-token ghp_abcdefghijklmnop' });
  const rendered = formatOpenCodeEvent(redactLog(line));
  assert.ok(!rendered.includes('private-token'));
  assert.ok(!rendered.includes('ghp_abcdefghijklmnop'));
  assert.equal(progressText('Result', '\u001b[31mready\u001b[0m'), '[Result] ready');
});
