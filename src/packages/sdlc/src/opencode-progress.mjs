// Human-facing projection; the redacted event stream remains the diagnostic record.
export function progressText(label, text) {
  return String(text).replace(/\u001b\[[0-?]*[ -/]*[@-~]/g, '').replaceAll('##[', '# #[ ').replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, '').split('\n').map(line => `[${label}] ${line}`).join('\n');
}

export function formatOpenCodeEvent(line) {
  let event;
  try { event = JSON.parse(line); }
  catch {
    if (/\b(error|warn|fatal)\b/i.test(line)) return progressText('Engine', line.slice(0, 500));
    return null;
  }
  if (!event || typeof event !== 'object') return null;
  const part = event.part ?? {};
  if (event.type === 'text' && typeof part.text === 'string') return progressText('OpenCode', part.text);
  if (event.type === 'tool_use') {
    const state = part.state ?? {}, input = state.input ?? {};
    const target = input.path ?? input.filePath ?? input.file_path;
    const description = `${part.tool ?? 'tool'}${typeof target === 'string' ? ` ${target}` : ''}`.slice(0, 240);
    if (state.status === 'completed') return progressText('Tool', `${description} — completed`);
    if (state.status === 'error') return progressText('Tool error', `${description}: ${String(state.error ?? 'see diagnostic events').slice(0, 500)}`);
    if (state.status === 'running') return progressText('Tool', `${description} — running`);
  }
  if (event.type === 'error') return progressText('Engine error', String(event.error?.data?.message ?? event.error?.message ?? 'OpenCode reported an error; see diagnostic events.').slice(0, 500));
  return null;
}
