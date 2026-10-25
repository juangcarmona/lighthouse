# OpenCode engine on a single Linux host

Use a dedicated self-hosted Actions runner with the `lighthouse-workflow` label. GitHub queues jobs; each invocation starts one temporary Docker container. No Lighthouse daemon, database or SoFa service is required. Register repository runners according to your account's scope and restrict them to trusted workflows.

Build with `bash src/examples/opencode-engine/build.sh /absolute/path/to/opencode` using OpenCode 2.1.0. Pin the resulting image ID from `docker image inspect lighthouse-engine:2.1.0 --format '{{.Id}}'`. Authorize OpenCode separately in an operator-owned Docker volume; do not put credentials in Git or in the configuration below.

The included `Dockerfile.runner` supplies Node, GitHub CLI, Docker CLI and Linux runtime dependencies. Build it with `docker build -f src/examples/opencode-engine/Dockerfile.runner -t lighthouse-runner:gh-aw src/examples/opencode-engine`. Register the Actions runner in an operator-owned directory, then mount that directory into the runner container **at the same absolute path as on the host**. Its work directory must also be beneath this mount: sibling engine containers resolve bind mounts through the host Docker daemon. Give the runner its own `HOME` and `/tmp`, the host Docker socket and the socket's group; run it as the directory's non-root owner. On Linux, run the runner container with `--network host`: gh-aw starts its authenticated MCP gateway on host port 8080 and the runner must reach it through localhost. Reserve that port and allow only one gh-aw agent job on this host at a time; the engine lock covers model execution, not gateway startup. Start `run.sh` in the registered runner directory. Never mount the operator's normal home directory.

Set `LIGHTHOUSE_ENGINE_CONFIG` in the runner service environment to a private JSON file:

```json
{
  "image": "sha256:<64 lowercase hexadecimal characters>",
  "uid": 20003,
  "authVolume": "lighthouse-engine-auth",
  "model": "openai/gpt-6.1-sol",
  "lock": "/absolute/operator/state/engine.lock"
}
```

Create the lock's parent directory before starting the runner. Every runner on this physical host must use the same lock path. The standard Linux `flock` serializes engines and releases capacity when the adapter process exits. Waiting longer than four minutes fails visibly; an engine has ten minutes to finish. Docker limits it to two CPUs, 2 GiB memory and 128 processes. Cancellation removes its container, and normal cleanup deletes its OpenCode session.

The adapter mounts tracked regular source files read-only, excludes `.git`, untracked files and symlinks, and bounds the snapshot to 5,000 files and 32 MiB. It mounts the pinned harness package read-only at `/harness`, with skills discovered by OpenCode. The agent can write only its result through the configured tools. The provider volume persists authentication; session cleanup does not claim to erase all provider logs or cache.

The runner owns Docker access and can control the host. The agent container receives neither that socket nor GitHub credentials. This subscription profile does not use AWF network filtering or an external credential proxy: outbound networking is available and provider authentication lives inside the engine container. Use a separate host for mutually untrusted workloads. Additional parallel capacity requires separate authentication/workspace handling and isolation review.

Install the package's selected gh-aw workflows, review their immutable implementation pin, then enable `LIGHTHOUSE_AUTOMATION_ENABLED` on the consuming repository. Stop any older router/executor only after its active run has finished. Follow `refine / agent` → `OpenCode progress and result` for public progress messages, concise tool activity and the validated result. During quiet intervals the step reports elapsed time without claiming new progress. The result also appears in the job summary. The separate `opencode-events` artifact keeps the redacted structured stream used by gh-aw to build session and usage evidence. Preparation and conclusion jobs are framework infrastructure; the host keeps no competing lifecycle database.
