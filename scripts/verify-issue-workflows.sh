#!/usr/bin/env bash
set -euo pipefail
validation_dir=$(mktemp -d)
trap 'rm -rf "$validation_dir"' EXIT
curl --fail --silent --show-error --location https://github.com/rhysd/actionlint/releases/download/v1.7.12/actionlint_1.7.12_linux_amd64.tar.gz -o "$validation_dir/actionlint.tar.gz"
printf '%s  %s\n' 8aca8db96f1b94770f1b0d72b6dddcb1ebb8123cb3712530b08cc387b349a3d8 "$validation_dir/actionlint.tar.gz" | sha256sum --check
tar -xzf "$validation_dir/actionlint.tar.gz" -C "$validation_dir" actionlint
git init -q "$validation_dir/consumer"
mkdir -p "$validation_dir/consumer/tools"
printf 'adopter tool\n' > "$validation_dir/consumer/tools/adopter.txt"
git -C "$validation_dir/consumer" add tools/adopter.txt
export XDG_DATA_HOME="$validation_dir/xdg"
gh extension install github/gh-aw --pin v0.93.2
gh aw --version
npm pack --workspace @juangcarmona/lighthouse-sdlc --pack-destination "$validation_dir" --json > "$validation_dir/pack.json"
archive=$(node -e 'console.log(JSON.parse(require("fs").readFileSync(process.argv[1], "utf8"))[0].filename)' "$validation_dir/pack.json")
tar -xzf "$validation_dir/$archive" -C "$validation_dir"
installer="$validation_dir/package/src/install-workflows.mjs"
# Compile templates at their installed paths and check packaged lock drift.
git init -q "$validation_dir/templates"
mkdir -p "$validation_dir/templates/.github"
cp -R "$validation_dir/package/workflows" "$validation_dir/templates/.github/workflows"
(cd "$validation_dir/templates" && gh aw compile)
for compiled in "$validation_dir/templates/.github/workflows/"*.lock.yml; do
  diff -u "$validation_dir/package/workflows/$(basename "$compiled")" "$compiled"
done
node "$installer" "$validation_dir/consumer" "$(git rev-parse HEAD)" --apply
test ! -f "$validation_dir/consumer/.github/workflows/lighthouse-sdlc-propose.md"
test -f "$validation_dir/consumer/.github/workflows/lighthouse-sdlc-triage.lock.yml"
test -f "$validation_dir/consumer/.github/ISSUE_TEMPLATE/change-request.yml"
grep -qx '  LIGHTHOUSE_ENABLED_STAGES: triage,refine' "$validation_dir/consumer/.github/workflows/lighthouse-sdlc-router.yml"
node "$installer" "$validation_dir/consumer" "$(git rev-parse HEAD)" --apply --replace-reviewed --with-implement
test ! -f "$validation_dir/consumer/.github/workflows/lighthouse-sdlc-integrate.md"
grep -qx '  LIGHTHOUSE_ENABLED_STAGES: triage,refine,propose,implement' "$validation_dir/consumer/.github/workflows/lighthouse-sdlc-router.yml"
node "$installer" "$validation_dir/consumer" "$(git rev-parse HEAD)" --apply --replace-reviewed --with-completion --with-maintenance
# Updating an old display name requires explicit replacement.
sed -i 's/^name: router$/name: Lighthouse SDLC router/' "$validation_dir/consumer/.github/workflows/lighthouse-sdlc-router.yml"
if node "$installer" "$validation_dir/consumer" "$(git rev-parse HEAD)" --with-completion --with-maintenance --apply > "$validation_dir/upgrade.log" 2>&1; then
  echo 'Expected a differing installation to require --replace-reviewed' >&2
  exit 1
fi
grep -q 'Existing workflow differs' "$validation_dir/upgrade.log"
node "$installer" "$validation_dir/consumer" "$(git rev-parse HEAD)" --with-completion --with-maintenance --apply --replace-reviewed
for stage in router triage refine propose implement integrate review apply-review; do
  display="$stage"
  if [ "$stage" = apply-review ]; then display='apply review'; fi
  if [ "$stage" = router ]; then
    grep -qx "name: $display" "$validation_dir/consumer/.github/workflows/lighthouse-sdlc-$stage.yml"
  else
    grep -qx "name: $display" "$validation_dir/consumer/.github/workflows/lighthouse-sdlc-$stage.md"
    grep -qx "name: \"$display\"" "$validation_dir/consumer/.github/workflows/lighthouse-sdlc-$stage.lock.yml"
  fi
done
git -C "$validation_dir/consumer" add .
node "$installer" "$validation_dir/consumer" "$(git rev-parse HEAD)" --with-completion --with-maintenance --apply
git -C "$validation_dir/consumer" diff --exit-code
test ! -f "$validation_dir/consumer/.github/workflows/lighthouse-sdlc-unattended.yml"
# Every installed worker uses the same reserved checkout on reinstall and upgrade.
node "$installer" "$validation_dir/consumer" "$(git rev-parse HEAD)" --with-completion --with-maintenance --with-product-change --with-unattended --apply --replace-reviewed
node "$installer" "$validation_dir/consumer" "$(git rev-parse HEAD)" --with-completion --with-maintenance --with-product-change --with-unattended --apply
if grep -R -E 'path: tools$|tools/src/packages/sdlc/' "$validation_dir/consumer/.github/workflows"; then
  echo 'Worker checkout still collides with adopter tools' >&2
  exit 1
fi
grep -q 'path: .lighthouse-harness' "$validation_dir/consumer/.github/workflows/lighthouse-sdlc-triage.lock.yml"
grep -q '.lighthouse-harness/src/packages/sdlc/src/opencode-execute.mjs' "$validation_dir/consumer/.github/workflows/lighthouse-sdlc-triage.lock.yml"
grep -qx 'adopter tool' "$validation_dir/consumer/tools/adopter.txt"
# Unattended is a separate opt-in; preserve the adopter-owned policy on reinstall.
node "$installer" "$validation_dir/consumer" "$(git rev-parse HEAD)" --with-unattended --with-maintenance --with-product-change --apply
node --input-type=module - "$validation_dir/consumer/.lighthouse/unattended.json" <<'JS'
import { readFileSync, writeFileSync } from 'node:fs';
const path = process.argv[2], policy = JSON.parse(readFileSync(path));
if (policy.enabled !== false || policy.merge !== false) throw Error('Installation must start disabled');
policy.timeoutSeconds = 120;
writeFileSync(path, JSON.stringify(policy));
JS
node "$installer" "$validation_dir/consumer" "$(git rev-parse HEAD)" --with-unattended --with-maintenance --with-product-change --apply
node -e 'if (JSON.parse(require("fs").readFileSync(process.argv[1])).timeoutSeconds !== 120) process.exit(1)' "$validation_dir/consumer/.lighthouse/unattended.json"
printf 'self-hosted-runner:\n  labels: [lighthouse-workflow]\n' > "$validation_dir/consumer/.github/actionlint.yaml"
"$validation_dir/actionlint" -shellcheck='' -ignore 'unexpected key "queue" for "concurrency" section' -config-file "$validation_dir/consumer/.github/actionlint.yaml" "$validation_dir/consumer/.github/workflows/lighthouse-sdlc-router.yml"
"$validation_dir/actionlint" -shellcheck='' -ignore 'unexpected key "queue" for "concurrency" section' -config-file "$validation_dir/consumer/.github/actionlint.yaml" "$validation_dir/package/workflows/lighthouse-sdlc-epic.yml"
"$validation_dir/actionlint" -shellcheck='' -ignore 'unexpected key "queue" for "concurrency" section' -config-file "$validation_dir/consumer/.github/actionlint.yaml" "$validation_dir/consumer/.github/workflows/lighthouse-worker-maintenance.yml"
"$validation_dir/actionlint" -shellcheck='' -ignore 'unexpected key "queue" for "concurrency" section' -config-file "$validation_dir/consumer/.github/actionlint.yaml" "$validation_dir/consumer/.github/workflows/lighthouse-sdlc-unattended.yml"
# gh-aw 0.93.2 emits new Actions contexts/queue and optional empty outputs that
# actionlint 1.7.12 cannot resolve. Scope these exceptions to compiler output only.
"$validation_dir/actionlint" -shellcheck='' -config-file "$validation_dir/consumer/.github/actionlint.yaml" \
  -ignore 'unexpected key "queue" for "concurrency" section' \
  -ignore 'property "workflow_(repository|sha|ref|file_path)" is not defined' \
  -ignore 'property "admission-(result|max-ai-credits(-threat-detection|-evals)?)" is not defined' \
  -ignore 'property "start-mcp-gateway" is not defined' \
  "$validation_dir/consumer/.github/workflows/lighthouse-sdlc-triage.lock.yml" \
  "$validation_dir/consumer/.github/workflows/lighthouse-sdlc-refine.lock.yml" \
  "$validation_dir/consumer/.github/workflows/lighthouse-sdlc-propose.lock.yml" \
  "$validation_dir/consumer/.github/workflows/lighthouse-sdlc-implement.lock.yml" \
  "$validation_dir/consumer/.github/workflows/lighthouse-sdlc-apply-review.lock.yml" \
  "$validation_dir/consumer/.github/workflows/lighthouse-sdlc-integrate.lock.yml" \
  "$validation_dir/consumer/.github/workflows/lighthouse-sdlc-review.lock.yml"
