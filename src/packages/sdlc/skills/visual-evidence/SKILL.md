---
name: lighthouse-visual-evidence
description: Assess visual scope during refinement and proposal, and capture actual before and candidate views when implementing UI changes.
---

# Visual evidence

Show the adopter's affected product views at the current stage. Read its accepted UI contract and the [audience policy](../audience-guidance/SKILL.md). A screenshot is review material; it does not approve a design or implementation.

## Assess applicability

Return `result.output.visualEvidence` for admitted requests containing `request.visualEvidence`. Use `schemaVersion: 1`, a concrete `reason`, `status` and `items`. Inspect the requested outcome and relevant sources; changes to screens, navigation, forms, layouts, interaction states and responsive behavior are applicable. An implementation of capture infrastructure itself can be nonvisual; explain why rather than capturing an unrelated page.

- `not-applicable`: no affected user-facing view or interaction; `items: []` and explain the inspected scope.
- `unavailable`: required current-stage examples or captures cannot be produced; `items: []`, explain the exact failure and return a blocked stage result with `missingEvidence` and a responsible role/action. A technical failure is not an owner question.
- `provided`: include one to six items covering the views and states relevant to this issue. Each item has a unique lowercase hyphenated `id`, `kind`, `view`, `state` and `viewport: {width, height}`. Dimensions range from 240 to 2560 pixels. Include narrow and wide layouts when responsive behavior changes; cover relevant loading, empty, error, authentication and interaction states. Do not invent states outside the issue.

## Refinement and proposal

Provide concrete proposed examples before the owner decides on the experience. In read-only planning, place a self-contained HTML wireframe or mockup in the item's `html` string with `kind: proposal`. Include specific product content, controls and layout informed by the inspected views and accepted design. Each HTML string is at most 16,000 UTF-8 bytes. Use inline CSS, system fonts and optional data images; no scripts, remote resources, forms or executable prototype logic. The host renders a PNG using isolated Chromium without network, repository or credentials. Do not install tools, run shell commands or change source to produce a planning example.

```json
{
  "schemaVersion": 1,
  "status": "provided",
  "reason": "The issue changes the empty list and its creation action.",
  "items": [{
    "id": "empty-list-wide",
    "kind": "proposal",
    "view": "Items list",
    "state": "Empty list with creation action",
    "viewport": {"width": 1280, "height": 720},
    "html": "<main style='font:18px system-ui;padding:32px'><h1>Items</h1><p>No items yet.</p><button>Create item</button></main>"
  }]
}
```

Refinement defines the views and later capture/acceptance criteria. Proposal makes the proposed layout and interaction decisions visible. Label both as proposed designs. These images are not screenshots of implemented behavior. Preserve unresolved current-stage design questions; planning never grants implementation or visual approval.

## Implementation

Use Playwright from the adopter's installed browser tooling. Reuse its existing capture scripts when applicable; otherwise use a small capture within the authorized implementation scope. Use the Chromium included in the worker image at `/usr/bin/chromium` when needed. Follow the [managed command slot](../implement/SKILL.md#workspace-command-slot), including starting and stopping the preview server inside the same command. Capture the actual running product, never a separate mock page standing in for it.

Save viewport PNGs under `/output/evidence/visual/`. Use `path: "visual/<file>.png"` relative to `/output/evidence`; never an absolute filesystem path or an invented public URL. Each PNG must be at most 2 MiB and match the declared viewport. Use `fullPage: false`. Keep the final candidate unchanged after capturing, except for host-owned OpenSpec metadata. Exclude credentials, private customer data and browser storage from evidence.

For each changed existing view, take a `before` capture from the admitted source before editing, with `revision: context.request.sourceRevision`. Take a matching `candidate` capture after implementation and set `baseline: existing`. Use identical `view`, `state` and `viewport` identities for each comparison. For a new view, set `baseline: new` and give a concrete `baselineReason` explaining why no before image exists. A visual implementation must include at least one candidate capture. A `proposal` image cannot satisfy that requirement. The host supplies the independently checked candidate tree; do not invent a candidate commit or assert independent capture verification.

```json
{
  "id": "empty-list-candidate-wide",
  "kind": "candidate",
  "view": "/items",
  "state": "Signed-in user, empty list",
  "baseline": "new",
  "baselineReason": "This issue introduces the items list; there is no corresponding admitted source view.",
  "viewport": {"width": 1280, "height": 720},
  "path": "visual/empty-list-candidate-wide.png"
}
```

## Publication and feedback

The trusted publisher verifies retained bytes and their request/candidate binding, then publishes content-addressed PNGs and a report on the adopter's explicitly adopted, protected evidence branch. The issue and delivery PR embed commit-pinned image URLs. Do not call `safeoutputs`, upload credentials or push an assets branch from the agent container. Missing publication configuration or permissions are concrete maintainer blockers; a runner path alone is not a delivered image.

Keep feedback on the same issue before a PR exists and on that PR afterward. A correction produces new evidence for its current candidate and preserves historical images. Required owner visual acceptance stays explicit in `pendingReview`; a generated image, test pass or hosted report cannot supply it. The host's integrity checks prove file identity and source binding, not that an agent's claimed screenshot independently establishes the running product's behavior.
