## What went well
- Both entry paths have genuine behavioral RED, unchanged frozen tests and GREEN. Adjacent checks preserve explicit/inherited settings, owner files, previews and parent repositories (F1/F2; `src/tests/lighthouse.test.mjs:71-155`).
- Independent review, explicit bounded merge delegation and a retained merge receipt remain separate from post-merge CI. Adopted `ci.yml` passed at the actual integrated revision (`github-check:127493421089`).

## What went wrong
- Hook files were installed without Git selecting them: legacy init conflated an absent key with failure, and semantic init omitted activation (issue #395; retained RED). This actual source defect is fixed by PR #458.
- Prior coverage did not assert effective activation. That verification gap is now fixed; no unresolved current-stage process failure or affected-guidance drift was established. One issue's RED/GREEN sequence is not recurrence across work items.

## Start doing
- Keep configuration-state and ownership assertions alongside file-generation assertions when maintaining initialization. Owner: CLI test maintainer, juangcarmona; reference: F2 / PR #458.

## Stop doing
- Do not use installed executable hook files, a generic green check or a passed assessment alone as proof of active Git hooks, merge, release or deployment. The retained evidence here distinguishes those claims. Owner: CLI and delivery maintainers, juangcarmona.

## Improvement candidates
- **Retain the delivered real-Git matrix as the smallest useful guard (already implemented, F2).** Observed failure: installed hooks were inactive. Evidence: the exact assertion failed for both initializers before production repair, then passed with frozen test digest `cf75f66a7552c8bbe530935aad28cbf28b7885c62f550fd35e551e6004723f93`. Owner: juangcarmona, CLI test maintainer; follow-up: PR #458 / issue #395. Reproduce before correction with the admitted activation command against unchanged production and isolated fresh Git fixtures, require the named assertion failure, then run the same bytes against the correction plus preservation checks. The host already retained this proof; no rerun or new policy change is requested here.
- No additional product, architecture or policy guard is justified by a demonstrated unresolved failure in this review. Any future guard or provider-owned guidance change needs its own reviewed scope and regression proof; this review grants no permission, opens no issue and starts no stage.