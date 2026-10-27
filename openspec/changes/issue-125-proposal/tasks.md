# Tasks

## 1. Repository environment contract

- [x] 1.1 Resolve and validate repository-selected environments at the source revision, preserving legacy consumers; verify selection and rejection tests and ship the schema and configuration guide.

## 2. Host execution lifecycle

- [x] 2.1 Add fixed prerequisite probes, isolated PostgreSQL lifecycle and image provenance to agent and independent checks; verify failure, cleanup and credential-free command construction with tests and document recovery.
- [x] 2.2 Include the pinned agent binary in preflight and test missing tools and incompatible versions; verify the focused environment tests and update the prerequisite guide.

## 3. Reproducible images

- [x] 3.1 Supply pinned-input base and .NET recipes and local installation/update instructions; verify build-input validation and recipe contracts with tests.

## 4. Integration evidence

- [x] 4.1 Run repository checks and strict OpenSpec validation against the final candidate; retain logs and retrospective.
- [ ] 4.2 On a Docker-capable host, build both profiles and run clean SoFa verification at the owner-supplied baseline, including browser and database tests; retain image and cleanup receipts.

## Workflow follow-up

- Obtain owner approval before merge; this implementation assessment does not grant it.
