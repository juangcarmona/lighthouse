# Worker model profiles

Profiles are opt-in settings, not permissions or proven presets. The existing operator `model` remains unchanged until the operator deliberately enables profiles. Authentication, billing and processing tier are not changed by this feature. A `fast` profile describes lightweight work; it never enables OpenAI Fast, Ultrafast, Flex or Batch processing.

## Project declaration

Create `.lighthouse/models.json` in the consuming repository after verifying identifiers and reasoning variants on its runner. Lighthouse's own file is a dogfood candidate; it has no effect until the operator enables profiles. The identifiers below are placeholders, not an available model catalog:

```json
{
  "schemaVersion": 1,
  "defaultProfile": "build",
  "workers": { "refine": "plan", "propose": "plan", "implement": "build", "review": "plan", "apply-review": "fast" },
  "profiles": {
    "plan": { "model": "openai/verified-planning-model", "reasoningEffort": "high" },
    "build": { "model": "openai/verified-building-model", "reasoningEffort": "medium" },
    "fast": { "model": "openai/verified-lightweight-model", "reasoningEffort": "high" }
  }
}
```

Schema version 1 supports the profile names `plan`, `build` and `fast`. Schema version 2 also supports other lowercase names and direct `{ "model": "openai/model", "reasoningEffort": "high" }` assignments for workers and defaults. Models must be OpenAI provider-qualified identifiers without an embedded variant. Effort is independent: `none`, `minimal`, `low`, `medium`, `high`, `xhigh` or `max`, but only values explicitly permitted for that model by the operator can run. The resolver rejects unknown configuration keys, providers, profile names, effort values and unsupported tier or transport fields. It never chooses an alternative on failure.

## Operator opt-in and precedence

Merge these fields into the existing operator engine configuration. Retain `image`, `implementationImage`, `uid`, `authVolume`, `lock` and the current `model`. Do not copy provider credentials into project files or evidence.

```json
{
  "modelProfiles": {
    "schemaVersion": 1,
    "enabled": true,
    "workers": { "review": "fast" },
    "profiles": { "build": { "reasoningEffort": "high" } }
  },
  "modelCapabilities": {
    "openai/verified-planning-model": { "available": true, "tools": true, "reasoningEfforts": ["high"] },
    "openai/verified-building-model": { "available": true, "tools": true, "reasoningEfforts": ["medium", "high"] },
    "openai/verified-lightweight-model": { "available": true, "tools": true, "reasoningEfforts": ["high"] }
  }
}
```

Selection precedence, highest first:

1. A delegated task's explicit profile; this still requires operator opt-in and capability permission.
2. Operator worker assignment.
3. Project worker assignment.
4. Operator default profile.
5. Project default profile.

For the selected profile, operator model and effort fields override project fields independently. An incomplete selected profile fails. The operator capability inventory must explicitly permit availability, tool use and the effort; absent or denied capability fails before startup. This inventory is an operator declaration, not proof of current provider access. Actual provider failures stop execution, with no fallback or processing-tier change.

Without `modelProfiles.enabled: true`, ordinary workers forward the existing `model` byte-for-byte. Project declarations alone cannot replace it. Disabling profiles restores that route; delegated profile launches are rejected instead of falling back to a legacy model. Remove opt-in to roll back. Existing OpenCode 2.1.0 entrypoints already forward `--model`; the adapter supplies `provider/model#effort` in profile mode. Verify the selected variant and authentication on the actual runner before adoption.

## Execution evidence

`runtime.json` retains its `model` field and adds `modelExecution`: requested settings, resolved settings and field provenance, capability-evidence classification, provider-reported fields and billing fields. The current adapter has no authenticated provider-settings receipt, so provider model and reasoning remain `null` with `unverified` status. Its resolved variant is configuration-derived only. Do not relabel an engine argument as provider confirmation.

Redacted OpenCode events retain any engine-exposed usage. Such token data is not necessarily account billing or subscription usage. Actual cost, API-equivalent estimates and subscription usage remain separate and unknown (`null`) unless independent evidence establishes them. An exit error or structured engine error fails the run, even if an envelope was produced.

## Bounded delegation — host API

Import `runDelegatedTasks` from `@juangcarmona/lighthouse-sdlc/profile-delegation`. A trusted host supplies `parent`, `controlPlane`, `project`, `operator`, `tasks`, `maxParallel`, `launch`, `verifyWave` and optionally an `AbortSignal`. No worker tool or workflow automatically enables delegation. The package schedules and validates; the existing host remains responsible for actual child execution and isolation.

```js
const report = await runDelegatedTasks({
  parent, controlPlane, project, operator, maxParallel: 2,
  tasks: [
    { id: 'edit', specialist: 'editor', profile: 'fast', dependencies: [], affectedFiles: ['src/copy.md'], input: { instruction: 'Apply the approved copy edit.' } },
    { id: 'review', specialist: 'reviewer', profile: 'plan', dependencies: ['edit'], affectedFiles: ['src/copy.md'], input: { instruction: 'Check the accepted edit.' } },
  ],
  launch: child => host.launch(child),
  verifyWave: wave => host.verifyWave(wave),
});
```

The example host callbacks are integration points, not included runtime services. Parent and child launches use the existing role contract: declared tools, output schema, allowed write scope, stop conditions and limits. Roles must be object contracts, not opaque provider strings. The existing role validator requires each child write-scope entry to appear explicitly in its specialist contract. The parent scope can be an exact file, directory prefix or `*`; affected files must be canonical relative files or trailing-slash directories. Globs, traversal, protected configuration and unknown scope syntax are rejected. Scope aliases and symlinks require host enforcement against actual changed files.

Task IDs and specialists are lowercase names; every task declares a profile, dependencies and affected files. At most 100 tasks, 100 distinct affected paths per task, 64 KiB of JSON task context and 1–8 simultaneous launches are accepted. Host `maxParallel` is authoritative. Parent limits require integer `timeoutSeconds` from 1–1800 and `maxAttempts: 1`; this first executor does not retry. Child limits can only tighten the deadline and retain one attempt. Other host limits, such as token budgets, are inherited unchanged and remain the host’s responsibility to enforce. Each child receives a unique run ID, parent identity, cloned task-only input, permitted tools and the resolved model argument. The host must construct fresh model context, enforce scope and tools, kill child execution on abort and retain its own evidence. The scheduler does not expand model permissions or publish results.

All profiles, launch contracts and the entire dependency graph are preflighted before any launch. Stable waves contain only verified-dependency-ready tasks with disjoint scopes. A directory conflicts with its descendants. Launch and verification callbacks must return `{ status: 'passed', evidence: [...] }` with nonempty evidence. The host must validate child output against its output schema, check actual modified paths and run repository checks during wave verification. A failed launch or wave blocks dependants transitively; independent tasks can continue. A deadline or cancellation stops new waves and signals all callbacks. This scheduling report cannot approve a lifecycle gate or merge.

## Repeatable candidate evaluation

The issue's Sol High / Sol Medium / Luna High preset is a candidate only. No candidate identifiers or prices are installed as defaults. Compare Sol Medium with Terra on bounded implementation; evaluate Luna on selected lightweight tasks. Include GPT-5.6 when subscription terms make it relevant, rather than assuming API prices describe subscription economics. Astra is outside the default candidate set.

Use the same immutable source revision, task inputs, harness/image versions, checks, context regime and processing mode for each candidate. Declare the bar before running: all required checks pass, scope remains bounded, intended task acceptance passes and a reviewer accepts the result without unrecorded corrections. Use at least these four cases:

| Case | Fixed task | Acceptance |
| --- | --- | --- |
| Planning | Produce a dependency-ordered plan for a bounded resolver change | Required cases, scope and risks covered; no code changes |
| Implementation | Add one resolver validation case and its regression test | Identical targeted and repository checks pass; no unrelated edits |
| Review | Review a fixed fixture with a known precedence defect | Identify the seeded defect with a correct explanation and no false permission claim |
| Lightweight edit | Apply a fixed documentation correction | Exact requested diff, links and Markdown checks pass |

For every task/candidate record revision, exact prompt or fixture, model, effort, configured variant, provider-reported settings or unverified status, outcome, attempts/retries, human corrections, elapsed time, available usage and acceptance reviewer. Run two workers with distinct profiles and retain their runtime receipts. Keep deterministic routing/checks outside model usage.

Record the account route as operator-confirmed subscription, API or unknown; do not inspect credentials or switch routes. For API evaluations record uncached input, cached input, applicable cache writes, output/reasoning as actually billed, context regime and processing tier. Avoid counting reasoning twice when it is included in billed output. Record dated rate sources and compute API-equivalent estimates separately from actual charges. For subscriptions report only exposed usage; unknown is neither free nor unlimited. Flex and Batch are different transports and neither is implemented here.

Choose the least costly setting that meets the declared bar only when comparable accepted-task and account evidence supports that decision. Otherwise report selection as unresolved. This delivery supplies deterministic configuration and scheduling tests; it does not claim live candidate results or preset acceptance.

## Individual executions

With operator schema version 2 and `allowExecutionSelection: true`, an owner can set the router's optional `model_selection` input to JSON such as `{"profile":"plan"}` or `{"model":"openai/verified-planning-model","reasoningEffort":"high"}`. The choice applies only to that direct manual stage dispatch. Automated continuations, recovery and Product Change workers do not inherit it. Operator capabilities still constrain the selection; an unavailable model or effort fails without fallback. Leave the input empty to use normal worker and default precedence.
