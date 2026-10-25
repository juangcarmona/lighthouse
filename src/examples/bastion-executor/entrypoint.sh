#!/bin/sh
set -eu
if [ "${1:-}" = cleanup-session ]; then
  session=${2:?Session identity required}
  if response=$(opencode session delete "$session" --standalone 2>&1); then exit 0; fi
  # A run can fail before session creation or be cleaned again during recovery.
  [ "$response" = "Session not found: $session" ] && exit 0
  echo 'OpenCode session cleanup failed' >&2
  exit 1
fi
if [ "$#" -gt 0 ]; then exec opencode "$@"; fi
: "${ENGINE_SESSION:?}" "${ENGINE_MODEL:?}"
opencode run --standalone --auto --session "$ENGINE_SESSION" --model "$ENGINE_MODEL" --file /input/context.json 'Execute the single Lighthouse stage described in the attached trusted context. Read source only under /workspace. Write the complete JSON envelope to /output/envelope.json. Report missing context honestly and stop at the declared gate.' >/dev/null
