# Tasks

<!-- pdac-scope: cited -->

This documentation clarification preserves the existing human merge authority.

<!-- pdac:cite id="BR-HUMAN-AUTHORITY" digest="sha256:c26daacd93dfc059f9ff99cdac179a2ee0d136d5c02cd146b92b3c46e49752e8" -->

## 1. Clarify Implementation Delivery

- [x] 1.1 Add one concise sentence stating that a PR becoming ready for review does not authorize merge; verify the README diff contains only that addition in the implementation delivery section.

## 2. Verify the Candidate

- [x] 2.1 Run the configured dependency installation, repository verification and strict OpenSpec validation, plus citation verification; retain command results and a concise retrospective in the evidence output.

## Workflow follow-up

- After host publication, observe draft PR → required CI success → automatic ready PR and the issue's `pr-ready` label; this is not a local implementation check.
- Close the fixture PR without merging after the trace is recorded. This engine does not publish, merge or close PRs.
