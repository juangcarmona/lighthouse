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
    const patchPaths = typeof input.patchText === 'string' ? [...input.patchText.matchAll(/^\*\*\* (?:Add|Update|Delete) File: (.+)$/gm)].map(m => m[1]) : [];
    const target = input.path ?? input.filePath ?? input.file_path ?? (part.tool === 'shell' ? input.command?.split('\n')[0] : patchPaths.length ? patchPaths.slice(0, 3).join(', ') + (patchPaths.length > 3 ? ` (+${patchPaths.length - 3} files)` : '') : undefined);
    const description = `${part.tool ?? 'tool'}${typeof target === 'string' ? ` ${target}` : ''}`.slice(0, 240);
    if (state.status === 'completed') return progressText('Tool', `${description} — completed`);
    if (state.status === 'error') return progressText('Tool error', `${description}: ${String(state.error ?? 'see diagnostic events').slice(0, 500)}`);
    if (state.status === 'running') return progressText('Tool', `${description} — running`);
  }
  if (event.type === 'error') return progressText('Engine error', String(event.error?.data?.message ?? event.error?.message ?? 'OpenCode reported an error; see diagnostic events.').slice(0, 500));
  return null;
}

// Bound diagnostics independently of the execution; a large patch event is not a failed task.
export function boundedEventLines(consume, omitted, limit = 8 * 1024 * 1024) {
  let pending = '', dropping = false;
  const finish = () => { if (dropping) omitted(); else if (pending) consume(pending); pending = ''; dropping = false; };
  return {
    write(chunk) {
      let start = 0;
      while (start < chunk.length) {
        const end = chunk.indexOf('\n', start), piece = chunk.slice(start, end < 0 ? undefined : end);
        if (!dropping) {
          if (pending.length + piece.length > limit) { pending = ''; dropping = true; }
          else pending += piece;
        }
        if (end < 0) break;
        finish(); start = end + 1;
      }
    },
    end: finish,
  };
}
