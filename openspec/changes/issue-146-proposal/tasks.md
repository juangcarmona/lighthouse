# Tasks

<!-- pdac-scope: cited -->

<!-- pdac:cite id="BR-DECOMPOSITION" digest="sha256:35124f644d4b43927a3045d1fbfc63858a5d63347dd3c24c5053630e1cb768b1" -->

## 1. Authority and planning

- [x] 1.1 Record agreed product intent, validate overlay and explicitly apply it; verify provider validation and retained owner provenance.
- [x] 1.2 Complete proposal, design and scenarios before production edits; verify strict OpenSpec validation and current provider-emitted citations.

## 2. Refinement and shared-branch contracts

- [x] 2.1 Enforce the confirmed estimate boundary and safe-split outcome, harden malformed dependency input, and document refinement output; verify threshold, cycles and invalid-input tests.
- [x] 2.2 Add explicit shared epic-branch planning without breaking legacy nested plans; verify independent/dependent branch tests and packaged guidance.
- [x] 2.3 Add host-observation eligibility for intake, dependencies, capacity, changed bases, owner merge decisions and aggregate readiness; verify state and fail-closed tests with package documentation.

## 3. Native orchestration and reconciliation

- [ ] 3.1 Add authenticated versioned issue/PR correlation and serialized intent/receipt reconciliation with native sub-issue links; test duplicates, edited/copied markers, partial and uncertain creates.
- [ ] 3.2 Wire authorized child triage/refinement and implementation dispatch, epic-targeted publication and internal completion without closing the parent; test revoked authority, capacity, blocked questions and base changes.
- [ ] 3.3 Publish and reconcile one aggregate PR after accepted children, preserving final owner approval and parent lifetime; test retries, cancellations and stale head/check decisions.

The native host now supplies an authenticated artifact-backed journal, verifies the shared parent lease and rechecks authority before writes. It creates the epic branch at the authenticated source revision without forcing an existing ref and reconciles a lost response only at that exact revision. Its workflow is deliberately not installed until child delivery and aggregate publication are connected. Task 3.1 remains unchecked until native integration and interruption recovery are demonstrated on GitHub; passing fixtures do not establish live orchestration.

A controlled GitHub test with simulated refinement created [two native children](https://github.com/juangcarmona/lighthouse-p0-acceptance-20261031/issues/52), their dependency and the epic branch in [the first run](https://github.com/juangcarmona/lighthouse-p0-acceptance-20261031/actions/runs/41330128462). [A second run](https://github.com/juangcarmona/lighthouse-p0-acceptance-20261031/actions/runs/41330217623) authenticated the retained journal and preserved exactly those resources. This demonstrates native host reconciliation only, not authenticated refinement or end-to-end delivery.

Two controlled runs tested the proposed lease expressions: [the first](https://github.com/juangcarmona/lighthouse-p0-acceptance-20261031/actions/runs/41330356522) and [the second](https://github.com/juangcarmona/lighthouse-p0-acceptance-20261031/actions/runs/41330356528) ran their agent jobs concurrently while preparation and publication jobs were serialized. These synthetic runs do not establish child delivery.

In a separate test, GitHub created a child but the [simulated response was lost](https://github.com/juangcarmona/lighthouse-p0-acceptance-20261031/actions/runs/41330356584). The [next attempt](https://github.com/juangcarmona/lighthouse-p0-acceptance-20261031/actions/runs/41330471946) stopped on the uncertain receipt and left exactly one matching child. Both runs intentionally failed; the fixture does not establish automatic recovery of that uncertainty.

The current host revision repeated native creation and journal reconciliation in [two runs](https://github.com/juangcarmona/lighthouse-p0-acceptance-20261031/actions/runs/41330606435) and [41330699323](https://github.com/juangcarmona/lighthouse-p0-acceptance-20261031/actions/runs/41330699323). A further [controlled run](https://github.com/juangcarmona/lighthouse-p0-acceptance-20261031/actions/runs/41330897047) authenticated a child against the prior journal. With an intentionally lost create response, [the first run](https://github.com/juangcarmona/lighthouse-p0-acceptance-20261031/actions/runs/41330863251) and [its retry](https://github.com/juangcarmona/lighthouse-p0-acceptance-20261031/actions/runs/41330939789) both stopped, leaving one child and no duplicate. Refinement was simulated in all of these runs.

## 4. Candidate verification

- [x] 4.1 Run required install, repository checks, strict OpenSpec validation and citation verification; retain completed receipts, reports and retrospective, accurately recording incomplete work.

## Workflow follow-up

- Owner reviews plan and code together; neither product apply nor this assessment grants merge authority.
