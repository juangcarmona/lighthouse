# Pragmatic engineering

Lighthouse prefers deliberate, small changes. The agent and the human should understand the needed outcome before code is written, then choose the smallest complete change that satisfies it.

## Working rules

- Define the outcome and the affected boundary before editing.
- Read the existing implementation, callers, configuration and checks before choosing a design.
- Reuse an existing helper, component, platform feature or dependency when it already fits.
- Add an abstraction when the same rule has repeated pressure or a clear changing boundary. Do not add a wrapper, option, generic type or framework for a possible future use.
- Remove duplication when the repeated text or code represents one rule. Keep separate code when the behaviours may change independently.
- Apply SOLID at real boundaries: one reason to change, explicit dependencies, substitutable contracts and small interfaces where they reduce coupling. A class per noun is not a design goal.
- Keep comments for the reason the code cannot show. Keep code and configuration free of prose editing passes.
- Add one focused check for non-trivial new logic, security boundaries, parsers, loops or data transformations. Trivial edits do not need ceremony.
- Measure the change by touched files, verification cost, repeated manual work removed and evidence produced. Prefer a smaller measured improvement to a larger speculative capability.

## Completion report

Report what changed, what was checked, what was deliberately left out and any risk that remains. The report should let a busy maintainer decide the next action in one read.

Human-facing prose follows the Humanizer pass when that skill is available. Preserve facts, links, commands, frontmatter and code exactly while editing prose.

The maintainer environment provides the `ponytail` reference skill for the smallest complete change discipline. Lighthouse keeps this local policy focused on its own engineering decisions instead of copying that skill.
