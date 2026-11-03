# Runtime and evidence boundary

<!-- pdac-scope: cited -->

## Decision

The workload exits before the trusted host reclaims ownership of its unique temporary tree. Shared credential volumes and unrelated operator storage are outside that mount. Required evidence still obeys existing file, byte, regular-file and symlink limits. Evidence is copied into a temporary sibling and renamed only after every file succeeds; failures leave no completed collection.

The adapter retains the validated raw candidate envelope and bounded changes separately from the final publishable envelope. Independent host checks and successful completion remain necessary for publication. Runtime phases identify preflight, execution, evidence, verification and completion without claiming that the separate publisher ran.

## Prerequisites and scratch

The existing environment preflight also checks legacy images. It probes required image executables with no source, credential or Docker-socket mounts and no network. Relative project-installed tools remain checked when the actual candidate commands run after installation. Scratch and npm/XDG caches use the container's temporary filesystem; Node compile caching is disabled for engine and host checks.

## Verification

Reproduce private mode-0700 directories and mode-0600 files created by UID 20003 under a different host UID. Verify successful collection after scoped ownership recovery, mode-000 failure, symlink/oversize rejection, atomic partial-copy failure, preflight rejection before agent work and candidate retention. Exercise the actual adapter with a deterministic container worker and independent checks; this proves process boundaries without claiming a provider/model evaluation.

<!-- pdac:cite id="BR-BOUNDED-WORKFLOW" digest="sha256:d67762bd448033970425c077d560dd2749e26200676953cd64aa1c09b31d803d" -->
<!-- pdac:cite id="BR-FAIL-CLOSED" digest="sha256:1a8bdc2e330fb683bd1354d898b1072d4a5fe30aeab26d3c02b2036352a7fc8d" -->
<!-- pdac:cite id="FR-CHANGE-EVIDENCE" digest="sha256:9207c491167fcdb5cebf14dc750bb0ac5441f847c4607cd94111385128b692f0" -->
<!-- pdac:cite id="QR-AGENT-ISOLATION" digest="sha256:731985a0bf28b2715a594b54342c254017eabe0e41fc14e3d12144b82240208b" -->
