# Acceptance evidence

- Four model and reasoning combinations, operator and project precedence, opt-in, invalid settings and legacy rollback: `src/tests/model-profiles.test.mjs`.
- Authenticated dispatch, modified request rejection, non-owner origin, replay and continuation restrictions: `src/tests/implement-dispatch.test.mjs`.
- Two ordinary worker variants, selected execution, prelaunch denial, one provider failure without fallback and unverified receipts: `src/tests/opencode-execute.test.mjs`. These use a Docker command fixture, not a live provider.
- Delegated task compatibility and bounded execution: `src/tests/profile-delegation.test.mjs`.
- Repository and workflow projections: `npm run verify` and `bash scripts/verify-issue-workflows.sh`. Product citations: `npx prodshape citations verify`. OpenSpec: `npx openspec validate issue-210-proposal --strict`.

Provider-reported settings, account charges and live provider acceptance remain unverified. No credentials, billing route, processing tier or lifecycle authority are selected by this feature.
