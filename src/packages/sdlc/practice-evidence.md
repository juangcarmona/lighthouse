# Engineering practice evidence

The package-owned catalog defines common cumulative L0–L3 criteria. Import `@juangcarmona/lighthouse-sdlc/practice-catalog` and `@juangcarmona/lighthouse-sdlc/practice-observation` for the definitions and observation validator.

An observation binds measurements, production module inventory, collection counts, exclusions and applicability to a SHA-256 digest. It identifies the numeric repository, exact commit, workflow/run/attempt/job, producer version, time and HTTPS source. Validation checks structure and integrity; it does not authenticate a producer or certify a practice. A source resolver must independently verify execution and configured CI/merge enforcement before current certification.

L1 requires actual passing security assessments and tests. L2 adds per-module coverage of 80% lines and 70% branches, executed Gherkin specifications, an SBOM and an explicit passing license policy. L3 adds method complexity of at most 15 cyclomatic and 30 CRAP, plus applicable DAST. A library or CLI without an HTTP application surface may justify DAST non-applicability through the shared profile. Missing tools or permission are gaps. Current evidence must match the assessed commit and definition and be no older than 14 days.

Mutation, hygiene, performance and restoration remain complementary. Mutation's covered-code target of 80% is informational; neither absence nor failure blocks a level. Historical aggregates cannot certify current code or authorize receipt deletion. No reporting API installs scanners, changes repository policy or activates gates.

## Evaluate current evidence

Import `evaluatePractices` from `@juangcarmona/lighthouse-sdlc/practice-evaluator`. Supply `context`, `observations`, an evaluation time and a trusted `resolveSource` callback. The callback must independently retrieve the execution report and return its exact `observationDigest`, `verified: true` and observed enforcement (`status`, `ci`, `merge`, HTTPS `sources`). It must never return verification merely because an input file says it passed. Unresolved authority is `unavailable`.

The GitHub adapter `collectGithubTests` supplies that resolver from authenticated read-only API and log collection. The CLI uses it through `lighthouse-sdlc practices github --input source-request.json`; see the [command guide](commands/practices.md). The committed workflow and command remain the producing repository's authority. The initial adapter supports direct Node test or npm test commands with a single Node TAP or spec summary; other report formats require a producer-owned adapter. It preserves skipped tests as incomplete execution and checks required-check integration identity. Rules with bypass actors do not establish universal mandatory enforcement.

A `validate --input observations.json` report can inspect local observations but cannot authenticate them. It consequently cannot certify their practices. The evaluator exposes measurement state and enforcement gaps separately: `met` with an unverified gate is not a certified mandatory control. L0 requires an independently verified L1 failure or below-standard measurement. Missing evidence alone remains `unverified`.
