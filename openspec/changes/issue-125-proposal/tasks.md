# Tasks

<!-- pdac-scope: cited -->

## 1. Repository environment contract

- [x] 1.1 Resolve and validate repository-selected environments at the source revision, preserving legacy consumers; verify selection and rejection tests and ship the schema and configuration guide.

<!-- pdac:cite id="BR-BOUNDED-WORKFLOW" digest="sha256:d67762bd448033970425c077d560dd2749e26200676953cd64aa1c09b31d803d" -->

## 2. Host execution lifecycle

- [x] 2.1 Add fixed prerequisite probes, isolated PostgreSQL lifecycle and image provenance to agent and independent checks; verify failure, cleanup and credential-free command construction with tests and document recovery.
- [x] 2.2 Include the pinned agent binary in preflight and test missing tools and incompatible versions; verify the focused environment tests and update the prerequisite guide.

## 3. Reproducible images

- [x] 3.1 Supply pinned-input base and .NET recipes and local installation/update instructions; verify build-input validation and recipe contracts with tests.

## 4. Integration evidence

- [x] 4.1 Run repository checks and strict OpenSpec validation against the final candidate; retain logs and retrospective.
- [x] 4.2 Build both profiles and run clean SoFa verification, including browser and database tests, with separate Docker-host engine checks. The original baseline exposed its host-only tests; SoFa PR #64 adds explicit suite selection without changing default verification. Retain image, source revision and cleanup receipts on the process evidence branch.

## Workflow follow-up

- Obtain owner approval before merge; this implementation assessment does not grant it.
