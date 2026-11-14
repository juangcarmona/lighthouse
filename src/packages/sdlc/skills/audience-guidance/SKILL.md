---
name: lighthouse-audience-guidance
description: Review human explanations, agent instructions and UI or visual work using the audience policy and offline fallbacks.
---

# Audience writing and review

Use this policy when drafting or reviewing issues, PR summaries, change overviews, proposals, reports, documentation, agent instructions or visual work. Read the relevant review below before editing; finish by comparing the result with its source.

## Choose the review

| Audience / artifact | Review order |
| --- | --- |
| Human explanations: issues, PR descriptions and summaries, change overviews, proposals, reports, product documentation | Plain English → Humanizer → evidence comparison |
| Agent instructions: AGENTS.md, skills, workflow prompts, documents reached through agent pointers | Writing for Agents → instruction comparison |
| UI and visual changes: layouts, components, themes, visual assets | Taste → accepted UI contract and visual evidence |

For mixed documents, apply the human reviews to explanatory prose and Writing for Agents to instructions, commands, constraints, ownership and completion criteria. Review UI copy as human prose; invoke Taste only when UI or visual work changes. Taste is not a general prose requirement. Preserve normative specification language; explain it separately rather than simplifying its obligations.

## Availability and source pins

The [source register](sources.json) identifies the canonical repositories, exact reviewed commits, skill paths, SHA-256 digests, versions where declared and license findings. A matching name alone does not establish the reviewed version. Use an installed helper only when its source matches that register and its execution is permitted by the host. Otherwise use the corresponding fallback below. Do not fetch or install helpers during a delivery run merely to satisfy this policy.

These Lighthouse-authored fallbacks ship in the source checkout and the SDLC npm package under `skills/audience-guidance/`; workers read the same files under `/harness/skills/audience-guidance/`. They require no global skill discovery, network access or host-specific installation. They are manual reviews, not bundled copies or claims that upstream skills ran. Record the helper revision used or the fallback method in `result.output` or the review evidence; keep routine method details out of public summaries.

When updating a pin, review the source, referenced requirements, license and compatibility again, update the digest and review notes, then run the audience-guidance and package tests. Do not follow a mutable branch or silently substitute another skill named Taste or Humanizer.

## Human explanations

### Plain English fallback

1. Identify the reader, the decision they need and the source facts. Lead with the outcome or blocker; explain unfamiliar technical behavior only where needed.
2. Retain evidence, uncertainty, technical terms, delivery state, obligations, scope, negation, exceptions, numbers, owners and next actions. Keep facts, links, commands, frontmatter, code, identifiers and quoted errors exact. Explain exact artifacts alongside them.
3. Replace vague abstractions with a supported actor and action. Cut background the reader already knows, but keep failures, skipped checks and remaining risk. Completion means the reader can act without guessing and every source claim retains its strength and scope.

### Humanizer fallback

1. Read the Plain English draft for filler, repetition, stock praise, inflated claims, mechanical headings and forced sentence patterns. Rewrite only where it improves this reader's understanding.
2. Preserve the author's useful voice and supported uncertainty. Keep factual reference text neutral; invent no opinion, testimonial, evidence or human reaction. Do not use word bans or AI-detector claims as quality criteria.
3. Compare the final wording with the source again. Completion means no facts were lost or invented and no claim became more certain, mandatory, complete, tested, deployed or accepted. Plain English and Humanizer overlap on clarity; the second pass refines the same draft, not a second competing account.

## Agent instructions

### Writing for Agents fallback

1. State the trigger and intended reader at each pointer. Resolve required pointers before claiming the instruction is usable; give paths relative to the document or name the installed root.
2. Put actions in dependency order. Name inputs, exact commands, constraints, ownership, permitted effects, failure handling and observable completion criteria. Completion means each step distinguishes done from not done.
3. Keep shared rules in one owning source and link them where needed. Put branch-specific references behind clear triggers. Preserve exact flags, paths, schemas and guardrails; remove duplicate or stale instructions only after checking ownership and callers.

Use Matt Pocock's Writing for Agents source in the register. Human prose smoothing must not weaken an instruction or remove the conditions that make an agent follow its pointer.

## UI and visual changes

### Taste fallback

1. Read the accepted UI contract first. In Lighthouse source this is `src/packages/ui/DESIGN.md`; adopters use their accepted projected `DESIGN.md` and recorded overrides. Compare visual hierarchy, typography, spacing, alignment, density, consistency and interaction states with the task's intent.
2. Review real rendered evidence in the required appearances and viewports. Check contrast, keyboard access, visible focus, labels, narrow layouts and reduced motion using the UI contract's checks. Record findings and anything not inspected; a prose-only change needs no Taste review.
3. Report concrete visual findings against that contract. Keep accepted semantic tokens, native semantics and accessibility requirements. Completion means required visual evidence and any required human acceptance are recorded, or explicitly pending and blocking; a Taste recommendation is not acceptance.

The reviewed Taste source is Leonxlnx's `design-taste-frontend` skill. Its website-generation rules, replacement palettes, mandatory animation, assets, scripts and hooks are not adopted. Use its critique only where compatible with the accepted UI contract. Do not execute external hooks as part of writing review.

## Authority and final comparison

Product intent, accepted architecture, source evidence and lifecycle policy remain authoritative. Writing and design helpers guide presentation only; skill output cannot override product or architecture authority, change scope, waive evidence or human approval, or grant merge, release or deployment permission. Report conflicts to the responsible owner and preserve the accepted contract.

Before finishing, compare the reviewed artifact with its source. Keep missing evidence, failed checks, unavailable checks and pending required review distinct. If the fallback itself cannot be completed, report that limitation; never mark an unperformed required review as passed.
