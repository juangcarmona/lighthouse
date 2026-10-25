#!/usr/bin/env bash
set -euo pipefail
engine_binary=${1:?Usage: build.sh /absolute/path/to/opencode}
[ "$("$engine_binary" --version)" = 'opencode v2.1.0' ] || { echo 'OpenCode 2.1.0 is required' >&2; exit 1; }
context=$(mktemp -d)
trap 'rm -rf "$context"' EXIT
cp "$(dirname "$0")"/{Dockerfile,entrypoint.sh,opencode.json} "$context/"
cp "$engine_binary" "$context/opencode"
docker build -t lighthouse-engine:2.1.0 "$context"
