# Bounded unattended delivery

Install the opt-in composition with `node node_modules/@juangcarmona/lighthouse-sdlc/src/install-workflows.mjs . <immutable-lighthouse-commit> --with-unattended`. Preview first; add `--apply` after reviewing the plan. This also installs completion workers. Existing policy is preserved. The initial `.lighthouse/unattended.json` template has execution and merge disabled.

Use the existing adopted GitHub completion profile, enforced checks, evidence branch and provisioned OpenCode runner. Configure implementation and reviewer profiles to distinct available model identifiers. Different profile names can resolve to the same model; admission rejects that combination. The runtime records requested/resolved configuration separately from provider-reported settings, which may remain unverified.

## Configure and request work

Edit the project-owned policy using [the template](templates/unattended.json). Replace the example paths and module map with actual repository boundaries, choose enabled routes and a finite time/correction budget, then explicitly enable execution. `merge: true` is a separate bounded delegation of integration; `merge: false` leaves the reviewed PR for owner authorization. The policy cannot change itself through a candidate.

For hotfix, declare trusted setup commands (an empty list when unnecessary), the regression command and assertion-failure signals in project policy. The model must use that command; it cannot authorize a custom shell script or choose an arbitrary failure as regression proof. Setup runs before the distinct regression check in each clean verification workspace. Test authoring remains limited to the declared test paths. The reviewer inspects the actual test and RED/GREEN evidence against the reported behavior.

Run either composition from the repository's default branch:

```sh
gh workflow run lighthouse-sdlc-unattended.yml -f issue=<number> -f route=ff
gh workflow run lighthouse-sdlc-unattended.yml -f issue=<number> -f route=hotfix
```

Only an authenticated owner dispatch is admitted initially. The issue must be open, authored by the owner, and free of human reservations, pauses and pending answer/review gates. External intake uses the existing owner-admission route before it can become eligible; this composition does not broaden that route. Installation and workflow availability are separate from successful execution.

## Verification inputs and test corrections

Upgraded unattended execution requires `verification` in the adopted `.lighthouse/implement.json` policy. Declare every test entrypoint, transitive wrapper, manifest/lockfile and relevant runner configuration; paths are exact files or directory prefixes, without globs. The host protects complete bytes and modes, including newly added files under a declared prefix. This declaration is an operator inventory, not automatic dependency discovery.

```json
"verification": {
  "paths": ["package.json", "package-lock.json", "scripts/", "tests/"],
  "corrections": {
    "tests/boundary.test.mjs": "Correct the equality assertion and add the adjacent lower value."
  }
}
```

`corrections` names exact files with an admitted reason; use `{}` normally. Candidate changes outside those exceptions stop before host checks. Every allowed correction, original file and executed check enters a fresh independent review binding. The reviewer must assess behavior against the issue even when all candidate tests pass. Verification-time source edits fail acceptance regardless of commits or hidden Git index flags. Required missing checks and stale review findings stop publication.

Source admission authenticates existing committed symbolic-link metadata against the admitted Git tree and omits those links from the agent's regular-file snapshot without following their targets. Changed, missing or replaced source links and newly introduced unignored links are rejected. Candidate publication still accepts regular files only; unsupported Git members remain an admission failure.

Hotfix RED authoring may change only the independently planned test files. Repair freezes those assertions. If RED itself needs correction, stop and record why in a fresh owner-authorized request, then reproduce and verify again; a repair round cannot rewrite RED. Supervised policies without this declaration remain compatible and report integrity as unconfigured. Runtime/user-journey checks remain the adopted profile's responsibility. A supervised human-reviewed path is sufficient when its configured risk and gate policy permit it; this adds no universal multi-agent requirement.

Unattended reviewers return only the bound verdict and findings in `/output/envelope.json`; the trusted host validates that payload and builds the stage envelope. An untouched template stays blocked. Raw model decisions and execution identities are retained for audit. Legacy review executions keep the envelope protocol. Canonical artifact JSON reads allow at most 2 MiB compressed per archive and 2 MiB decompressed per selected member, with size and CRC validation; diagnostics remain separate.

## Fast-forward

Before a read-only FF planning worker runs, the trusted host prepares the committed adopter's OpenSpec configuration, schemas and baseline specifications in an isolated provider directory. The pinned CLI supplies the source-bound specification inventory and artifact instructions in the planning context. The worker returns proposed files; the host materializes and strictly validates them against the same baseline before independent review. Missing or malformed provider discovery stops planning. The worker is not asked to execute unavailable shell commands, and a host receipt is never presented as a command the model ran.

Concrete engineering-plan corrections may return to the proposal worker before implementation. Planning and candidate repairs share `maxCorrections`; every revised plan requires provider validation and a fresh independent review. Escalation and changed authority stop delivery. Hotfix planning retains its existing terminal review behavior.

Refinement must establish low risk, known reversible scope, resolved dependencies, no missing product decision and an explained numeric estimate of 1, 2 or 3. Five points requires `allowFivePoint: true`; legacy size labels are not converted into points. A separate read-only reviewer checks readiness and the real provider-generated engineering plan before code changes. The implementation and required host checks are then reviewed independently against the original issue, owner answers and actual before/after source.

At most the configured correction rounds are permitted, with two as the maximum. Changed scope, failed or unavailable evidence, human-only decisions, cancellation, revoked authority or exhausted corrections stop dependent advancement and retain the candidate. Required checks cannot be waived by a reviewer verdict.

## Hotfix

The expedited route assesses the confirmed defect and root cause, records a compact correction plan and authors regression tests before changing production code. The trusted host runs the declared command against unchanged production code and requires both the identified assertion and an owner-declared assertion-failure signal. An environment/compilation failure is not acceptable proof. Independent review must confirm that the test exercises the actual failing behavior.

The complete candidate is limited to 100 added plus deleted production-code lines, 10 files including tests and two declared modules. Test lines are excluded only from the production-code cap. The host measures the actual diff and rejects ambiguous module ownership, binary changes and unassessed scope. The regression-test bytes from RED must survive the repair unchanged. GREEN and adjacent/required checks precede independent candidate review. The RED receipt and test snapshot are part of that review's binding.

## Integration and recovery

Provider work, authority rechecks and the CI/mergeability wait share one absolute deadline established at admission. CI may complete after ten minutes when the original route window still has time; waiting never starts a new allowance. Expiry or cancellation during an observation stops before draft promotion or returning a mergeable candidate.

The host rechecks source, policy, owner intent, reservations, the exact PR head, required CI and hosting rules before a delegated merge. Required GitHub checks must actually pass. A merge queue requires a supported queue-aware adapter; protected decisions retain their configured owners.

The trusted host retains the integration bundle on the adopted evidence branch for existing post-merge review. Release, deployment, smoke checks and rollback continue only through their existing separately authorized paths. A merge does not establish deployment.

Each request receives an immutable identity before execution. A rerun with an existing receipt stops for inspection rather than repeating uncertain effects. Failed/blocked attempts retain candidate and host execution artifacts; resolve the named blocker before a fresh owner request. GitHub issue concurrency is shared with the stage workers and reservations are released on completion. No runner stays allocated while waiting for a new human decision.
