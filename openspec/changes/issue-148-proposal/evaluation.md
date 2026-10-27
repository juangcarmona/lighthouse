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

The committed Lighthouse `.lighthouse/models.json` is an inactive dogfood candidate until the operator opts in. Direct CLI calls proved that this host accepts Luna high, Sol medium/high, Terra medium and GPT-5.6 Sol medium. A native workflow receipt with two distinct worker profiles is still required.

## Delegated host callback

At the same source revision, `scripts/dogfood-profile-delegation.mjs` used the production `runDelegatedTasks` API and four authenticated OpenCode calls. The trusted host accepted only exact one-line outputs and wrote only each child's declared fixture path. Two calls ran concurrently in wave 1 (`a`, `b`); wave 2 contained `c`, which depended on both, and `d`, which conflicted with `a` on `src/a.txt`. Peak active calls were 2, the configured limit. The profile resolver selected Luna high for `a` and `d`, Sol medium for `b`, and Sol high for `c`. Both waves passed host content checks. In a separate injected failure, `x` failed and dependent `y` was blocked without launch.

This proves the package's host callback contract against real model calls and scoped host writes. It does not make delegation available inside a GitHub worker automatically, confirm the provider's internal effort setting, or establish billing. The host example retains no raw provider sessions in the repository.
