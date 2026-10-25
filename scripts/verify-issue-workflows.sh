#!/usr/bin/env bash
set -euo pipefail
validation_dir=$(mktemp -d)
trap 'rm -rf "$validation_dir"' EXIT
curl --fail --silent --show-error --location https://github.com/rhysd/actionlint/releases/download/v1.7.12/actionlint_1.7.12_linux_amd64.tar.gz -o "$validation_dir/actionlint.tar.gz"
printf '%s  %s\n' 8aca8db96f1b94770f1b0d72b6dddcb1ebb8123cb3712530b08cc387b349a3d8 "$validation_dir/actionlint.tar.gz" | sha256sum --check
tar -xzf "$validation_dir/actionlint.tar.gz" -C "$validation_dir" actionlint
git init -q "$validation_dir/consumer"
export XDG_DATA_HOME="$validation_dir/xdg"
gh extension install github/gh-aw --pin v0.93.2
gh aw --version
node src/packages/sdlc/src/install-workflows.mjs "$validation_dir/consumer" "$(git rev-parse HEAD)" --apply
test ! -f "$validation_dir/consumer/.github/workflows/lighthouse-sdlc-propose.md"
if rg -q '^  propose:' "$validation_dir/consumer/.github/workflows/lighthouse-sdlc-router.yml"; then exit 1; fi
node src/packages/sdlc/src/install-workflows.mjs "$validation_dir/consumer" "$(git rev-parse HEAD)" --apply --replace-reviewed --with-implement
test ! -f "$validation_dir/consumer/.github/workflows/lighthouse-sdlc-integrate.md"
if rg -q '^  integrate:' "$validation_dir/consumer/.github/workflows/lighthouse-sdlc-router.yml"; then exit 1; fi
node src/packages/sdlc/src/install-workflows.mjs "$validation_dir/consumer" "$(git rev-parse HEAD)" --apply --replace-reviewed --with-completion
printf 'self-hosted-runner:\n  labels: [lighthouse-workflow]\n' > "$validation_dir/consumer/.github/actionlint.yaml"
"$validation_dir/actionlint" -shellcheck='' -config-file "$validation_dir/consumer/.github/actionlint.yaml" "$validation_dir/consumer/.github/workflows/lighthouse-sdlc-router.yml"
# gh-aw 0.93.2 emits new Actions contexts/queue and optional empty outputs that
# actionlint 1.7.12 cannot resolve. Scope these exceptions to compiler output only.
"$validation_dir/actionlint" -shellcheck='' -config-file "$validation_dir/consumer/.github/actionlint.yaml" \
  -ignore 'unexpected key "queue" for "concurrency" section' \
  -ignore 'property "workflow_(repository|sha|ref|file_path)" is not defined' \
  -ignore 'property "admission-(result|max-ai-credits(-threat-detection|-evals)?)" is not defined' \
  -ignore 'property "start-mcp-gateway" is not defined' \
  "$validation_dir/consumer/.github/workflows/lighthouse-sdlc-refine.lock.yml" \
  "$validation_dir/consumer/.github/workflows/lighthouse-sdlc-propose.lock.yml" \
  "$validation_dir/consumer/.github/workflows/lighthouse-sdlc-implement.lock.yml" \
  "$validation_dir/consumer/.github/workflows/lighthouse-sdlc-integrate.lock.yml" \
  "$validation_dir/consumer/.github/workflows/lighthouse-sdlc-review.lock.yml"
