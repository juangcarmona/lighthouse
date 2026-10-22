# Capability adoption

The SDLC package publishes `capabilities.json` as the versioned catalog of adoptable provider capabilities.

The Lighthouse CLI reads this catalog during `upgrade`; package installation and upgrade never write to an external provider.

Use `lighthouse capabilities select --id labels --provider github` to make the default selection explicit, or `lighthouse capabilities decline --id labels --provider github` to record an intentional opt-out without contacting GitHub.

Use `lighthouse capabilities plan --id labels --provider github --repo <owner/repo> --plan-file .lighthouse/reconciliation/labels.plan.json` to read the current labels and produce a deterministic plan; pass `--input <capabilities.json>` when the adopter declares a mapping instead of using the catalog projection.

Use `lighthouse capabilities apply --plan-file .lighthouse/reconciliation/labels.plan.json --authorize <plan-hash>` only after reviewing the plan; the command rereads GitHub, creates missing labels, preserves existing values and records evidence.

The plan blocks modifications, renames, removals and ambiguous matches; rerunning the same plan is safe and a failed run can resume after a fresh read.
