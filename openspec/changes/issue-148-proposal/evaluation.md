# Model-profile dogfood, 2026-10-27

The fixed cases in `scripts/evaluate-model-profiles.mjs` ran from source `d61825499252a3748b252c7822294b63899dc9a6` with OpenCode 2.1.0 and the existing operator authentication volume. Every case used the same prompt and container image for its comparators. The account's billing route and actual charges were not exposed; the container's configured model and effort are not an authenticated provider-settings receipt.

| Case | Configured model and effort | Result | Elapsed | Exposed usage |
| --- | --- | --- | ---: | --- |
| Plan | GPT-6.1 Sol, high | Named precedence, regression tests and rollback check | 9.7 s | Not reported |
| Build | GPT-6.1 Sol, medium | Correct own-key precedence and fallback | 7.2 s | Not reported |
| Build | GPT-6.1 Terra, medium | Correct own-key precedence and fallback | 4.4 s | Not reported |
| Build | GPT-5.6 Sol, medium | Correct own-key precedence and fallback for supplied objects | 3.2 s | Not reported |
| Review | GPT-6.1 Sol, high | Found the seeded precedence defect | 7.3 s | Not reported |
| Review | GPT-6 Luna, high | Found the seeded precedence defect | 4.4 s | Not reported |
| Light edit | GPT-6 Luna, high | Preserved the meaning in one sentence | 2.7 s | Not reported |

There were no retries or human corrections in these seven runs. Each process exited successfully and emitted no structured error. The build prompt supplied objects; Sol and Terra also handled absent objects, while GPT-5.6's answer did not. One tiny case per setting does not establish a quality or latency ranking. [OpenAI's model catalog](https://developers.openai.com/api/docs/models) and [standard API prices](https://developers.openai.com/api/docs/pricing) inform candidates, but API rates cannot establish this account's cost per accepted task. No cost winner or permanent preset is accepted from these observations.

The committed Lighthouse `.lighthouse/models.json` needs operator opt-in; the operator enabled it for native dogfood. Direct CLI calls showed this host accepts Luna high, Sol medium/high, Terra medium and GPT-5.6 Sol medium. The two native worker receipts below show the adapter's actual profile resolution.

The first native triage attempt for [#157](https://github.com/juangcarmona/lighthouse/issues/157) passed using the old single-model route: its worker container retained an earlier read-only bind mount of the operator file. After restarting the idle runner, [#158's run](https://github.com/juangcarmona/lighthouse/actions/runs/40591496516) resolved `fast` to Luna high in `runtime.json`, then failed because the agent wrote malformed JSON. That test request also presumed a release-notes page which the repository does not have. This is a failed triage candidate, not proof that Luna is reliable for a full worker. The Lighthouse dogfood mapping now uses `build` for triage and apply-review; `fast` remains available for bounded delegated tasks and explicit experiments.

| Native worker | Profile resolution in `runtime.json` | Outcome | Receipt |
| --- | --- | --- | --- |
| Refine #157 | `plan` → `openai/gpt-6.1-sol#high`, from `project.workers` | Passed; one-point README scope confirmed | [run 40592102781](https://github.com/juangcarmona/lighthouse/actions/runs/40592102781) |
| Triage #160 | `build` → `openai/gpt-6.1-sol#medium`, from `operator.workers` | Passed; one-point estimate and no blocking question | [run 40592738559](https://github.com/juangcarmona/lighthouse/actions/runs/40592738559) |

Both used product revision `6342022c0026e1b0bca6d836d4738da3b7d327f4` and harness source `4da2e733ec0e6caa7247c95aee2a466346503432`. The receipts confirm the host's selected arguments, not provider-internal settings. Provider-reported model and effort remain `unverified`; actual billing and subscription usage remain unknown. No human correction or retry was needed for these two passing workers. Refine's automatic implementation continuation was cancelled before a worker started because #157 was only a test. Both test issues are closed without implementation.

Repository verification passed with 241 tests and 3 optional skips; strict OpenSpec validation also passed. `prodshape citations verify --provider openspec` returned nonzero for eight unclassified documents from issues #125 and #145. All 53 recorded citations are current, including this change's citations. [Issue #161](https://github.com/juangcarmona/lighthouse/issues/161) tracks their product-scope classification; this run does not treat the verifier's failure as a pass.

## Delegated host callback

At the same source revision, `scripts/dogfood-profile-delegation.mjs` used the production `runDelegatedTasks` API and four authenticated OpenCode calls. The trusted host accepted only exact one-line outputs and wrote only each child's declared fixture path. Two calls ran concurrently in wave 1 (`a`, `b`); wave 2 contained `c`, which depended on both, and `d`, which conflicted with `a` on `src/a.txt`. Peak active calls were 2, the configured limit. The profile resolver selected Luna high for `a` and `d`, Sol medium for `b`, and Sol high for `c`. Both waves passed host content checks. In a separate injected failure, `x` failed and dependent `y` was blocked without launch.

This proves the package's host callback contract against real model calls and scoped host writes. It does not make delegation available inside a GitHub worker automatically, confirm the provider's internal effort setting, or establish billing. The host example retains no raw provider sessions in the repository.
