# evidence

Validate one evidence record or an evidence index without writing repository or provider state.

Use `lighthouse-sdlc evidence --input <record-or-index.json> --format json` to validate an existing artifact.

Use `lighthouse-sdlc evidence --input <records.json> --build --output .lighthouse/evidence/index.json` to build a deterministic index from full records and write the compact record files beside it. The input object must contain `records` and may contain `indexId`, `runId`, `repository`, `revision` and `subjects`.

The index reports evidence coverage for ProductShape, ArcShape, Lighthouse or other explicitly referenced subjects. It does not decide product scope, architecture ownership or quality policy.

`valid` checks structure, and index coverage reflects declared record statuses. Neither authenticates an arbitrary producer claim. For implementation acceptance, use the host-verified command observations described in [completion evidence](../completion.md#host-command-evidence); preserve unavailable or failed results when their inputs or provenance do not verify.
