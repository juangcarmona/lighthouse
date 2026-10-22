---
name: lighthouse-ui-design
description: Use when creating or reviewing interface code under a selected Lighthouse visual theme profile.
---

# Lighthouse UI design

1. Read the adopter's projected `docs/design/DESIGN.md` before changing interface code.
2. Use semantic `--lh-*` roles from the installed Lighthouse UI package instead of copying primitive colors or spacing values.
3. Keep native HTML semantics, visible focus, keyboard behavior, readable status text and narrow viewport behavior.
4. Design loading, empty, success, error, disabled and validation states for every interaction.
5. Run the project's visual and accessibility checks, then report any unavailable or pending review separately from failures.

Done means the changed interface uses the declared design roles, preserves the required interaction states and has fresh verification evidence.
