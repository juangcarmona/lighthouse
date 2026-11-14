#!/bin/bash
set -euo pipefail

if [[ "${GITHUB_WORKFLOW_REF:-}" == */.github/workflows/lighthouse-sdlc-unattended.yml@* && "${GITHUB_JOB:-}" == deliver ]]; then
  echo 'Native unattended composition does not reserve the gh-aw gateway port'
  exit 0
fi

limit=${LIGHTHOUSE_HOST_SLOT_WAIT_SECONDS:-1800}
[[ "$limit" =~ ^[1-9][0-9]{0,3}$ && "$limit" -le 7200 ]] || { echo 'Host slot wait must be between 1 and 7200 seconds' >&2; exit 1; }
lock=${LIGHTHOUSE_HOST_GATEWAY_LOCK:?Set the shared absolute gateway lock path}
[[ "$lock" == /* ]] || { echo 'Gateway lock path must be absolute' >&2; exit 1; }
worker=$PPID
while [[ "$worker" -gt 1 && "$(cat /proc/"$worker"/comm)" != Runner.Worker ]]; do
  worker=$(awk '/^PPid:/ {print $2}' /proc/"$worker"/status)
done
[[ "$worker" -gt 1 ]] || { echo 'Cannot identify the Actions worker' >&2; exit 1; }
state=$(mktemp -d "${RUNNER_TEMP:?}/host-job-lock.XXXXXX")

# The detached holder releases its lock when the Actions worker exits, including cancellation.
setsid bash -c '
  worker=$1; state=$2; lock=$3
  cleanup() { rm -rf -- "$state"; }
  trap cleanup EXIT
  exec 9>"$lock"
  while ! flock -n 9; do
    kill -0 "$worker" 2>/dev/null || exit 1
    sleep 1
  done
  kill -0 "$worker" 2>/dev/null || exit 1
  touch "$state/acquired"
  while kill -0 "$worker" 2>/dev/null; do sleep 1; done
' host-job-lock "$worker" "$state" "$lock" </dev/null >"$state/holder.log" 2>&1 &
holder=$!
echo "Waiting for the shared gh-aw host slot (limit: $limit seconds)"
for ((i=0; i<limit; i++)); do
  [[ -f "$state/acquired" ]] && { echo 'Host slot acquired'; exit 0; }
  kill -0 "$holder" 2>/dev/null || { echo 'Host slot holder exited; check lock access and worker identity' >&2; exit 1; }
  (( i == 0 || i % 60 != 0 )) || echo "Still waiting for the shared host slot: $i seconds"
  sleep 1
done
kill -- -"$holder" 2>/dev/null || true
rm -rf "$state"
echo "Host slot unavailable after $limit seconds" >&2
exit 1
