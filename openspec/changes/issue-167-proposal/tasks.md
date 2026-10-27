# Tasks

<!-- pdac-scope: cited -->

The documentation preserves the existing human-decision boundary; it does not authorize merge.

<!-- pdac:cite id="BR-HUMAN-AUTHORITY" digest="sha256:c26daacd93dfc059f9ff99cdac179a2ee0d136d5c02cd146b92b3c46e49752e8" -->

## 1. Documentation clarification

- [x] 1.1 Add one concise sentence to the SDLC README's draft-policy paragraph and verify the diff preserves all existing text and leaves readiness with the maintainer.

## 2. Candidate verification

- [ ] 2.1 Run the configured installation, repository verification and strict OpenSpec validation, plus ProductShape citation verification; retain check receipts and a retrospective under `/output/evidence/`.

All configured checks passed. Citation verification ran but remains blocked by eight existing unclassified documents under `issue-125-proposal` and `issue-145-proposal`; this change's three documents are bound and their citations current. Evidence and the retrospective are retained, but this verification task remains incomplete until the repository-wide policy check passes.

## Workflow follow-up

- After publication, the owner can exercise draft/ready and correction tracing for #155, then close the fixture PR without merging. This is not an engine check or merge authorization.
