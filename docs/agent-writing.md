# Agent-facing writing

Use this guide when editing `AGENTS.md`, skills, commands, prompts, specifications or any other document an agent reads.

## Write for execution

- Put the action first. Order steps the way the agent must perform them.
- End each step with a checkable completion condition.
- State the branch that triggers a reference or another document. Keep always-loaded pointers short.
- Keep branch-specific detail behind a pointer and leave the main route readable.
- Use one authoritative location for each rule. Point to it instead of restating it.
- Prefer a familiar compact term over a paragraph that repeats the same idea.
- Delete sentences that do not change what the agent does or checks.

## Review the document

Before committing an agent-facing document:

1. Read it once as an ordered procedure.
2. Mark every branch and confirm its pointer names the trigger.
3. Check that each step has a completion condition.
4. Remove duplicated rules, stale environment facts and no-op instructions.
5. Confirm that commands, paths, frontmatter and link targets remain exact.

The maintainer environment provides the `writing-for-agents` reference skill for this review. This file keeps Lighthouse's local policy small; it does not vendor that skill or replace provider-owned agent instructions.
