# Engineering practice evidence

The package-owned catalog defines common cumulative L0–L3 criteria. Import `@juangcarmona/lighthouse-sdlc/practice-catalog` and `@juangcarmona/lighthouse-sdlc/practice-observation` for the definitions and observation validator.

An observation binds measurements, production module inventory, collection counts, exclusions and applicability to a SHA-256 digest. It identifies the numeric repository, exact commit, workflow/run/attempt/job, producer version, time and HTTPS source. Validation checks structure and integrity; it does not authenticate a producer or certify a practice. A source resolver must independently verify execution and configured CI/merge enforcement before current certification.

L1 requires actual passing security assessments and tests. L2 adds per-module coverage of 80% lines and 70% branches, executed Gherkin specifications, an SBOM and an explicit passing license policy. L3 adds method complexity of at most 15 cyclomatic and 30 CRAP, plus applicable DAST. A library or CLI without an HTTP application surface may justify DAST non-applicability through the shared profile. Missing tools or permission are gaps. Current evidence must match the assessed commit and definition and be no older than 14 days.

Mutation, hygiene, performance and restoration remain complementary. Mutation's covered-code target of 80% is informational; neither absence nor failure blocks a level. Historical aggregates cannot certify current code or authorize receipt deletion. No reporting API installs scanners, changes repository policy or activates gates.
