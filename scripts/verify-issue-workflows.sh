#!/usr/bin/env bash
set -euo pipefail
validation_dir=$(mktemp -d)
trap 'rm -rf "$validation_dir"' EXIT
curl --fail --silent --show-error --location https://github.com/rhysd/actionlint/releases/download/v1.7.12/actionlint_1.7.12_linux_amd64.tar.gz -o "$validation_dir/actionlint.tar.gz"
printf '%s  %s\n' 8aca8db96f1b94770f1b0d72b6dddcb1ebb8123cb3712530b08cc387b349a3d8 "$validation_dir/actionlint.tar.gz" | sha256sum --check
tar -xzf "$validation_dir/actionlint.tar.gz" -C "$validation_dir" actionlint
mkdir -p "$validation_dir/consumer/.git"
node src/packages/sdlc/src/install-issue-workflows.mjs "$validation_dir/consumer" "$(git rev-parse HEAD)" --apply
printf 'self-hosted-runner:\n  labels: [lighthouse-workflow]\n' > "$validation_dir/consumer/.github/actionlint.yaml"
"$validation_dir/actionlint" -shellcheck='' -config-file "$validation_dir/consumer/.github/actionlint.yaml" "$validation_dir/consumer/.github/workflows/lighthouse-issue-router.yml" "$validation_dir/consumer/.github/workflows/lighthouse-issue-refine.yml"
