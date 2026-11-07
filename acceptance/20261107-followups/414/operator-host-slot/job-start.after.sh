#!/bin/bash
set -euo pipefail
# Native unattended composition never starts the shared gh-aw MCP gateway.
# Its individual engines retain their separate authenticated engine-slot lock.
if [[ "${GITHUB_WORKFLOW_REF:-}" == */.github/workflows/lighthouse-sdlc-unattended.yml@* && "${GITHUB_JOB:-}" == deliver ]]; then
  echo 'Native unattended composition does not reserve the gh-aw gateway port'
  exit 0
fi
# The lock covers the whole job because gh-aw's gateway uses a shared host port.
worker=$PPID
while [[ "$worker" -gt 1 && "$(cat /proc/"$worker"/comm)" != Runner.Worker ]]; do
  worker=$(awk '/^PPid:/ {print $2}' /proc/"$worker"/status)
done
[[ "$worker" -gt 1 ]] || { echo 'Cannot identify the Actions worker'; exit 1; }
state=$(mktemp -d "${RUNNER_TEMP:?}/host-job-lock.XXXXXX")
lock=/home/juan/.local/share/lighthouse-runtime/job-hooks/gateway.lock
# The detached holder exits if this worker dies, so cancellation cannot leave a stale lock.
setsid bash -c '
  worker=$1; state=$2; lock=$3
  exec 9>"$lock"
  while ! flock -n 9; do
    kill -0 "$worker" 2>/dev/null || exit 1
    sleep 1
  done
  touch "$state/acquired"
  while kill -0 "$worker" 2>/dev/null; do sleep 1; done
  rm -rf "$state"
' host-job-lock "$worker" "$state" "$lock" </dev/null >"$state/holder.log" 2>&1 &
holder=$!
echo 'Waiting for the shared gh-aw host slot'
for ((i=0; i<1800; i++)); do
  [[ -f "$state/acquired" ]] && { echo 'Host slot acquired'; exit 0; }
  kill -0 "$holder" 2>/dev/null || { cat "$state/holder.log"; exit 1; }
  sleep 1
done
kill -- -"$holder" 2>/dev/null || true
rm -rf "$state"
echo 'Host slot unavailable after 30 minutes'
exit 1
