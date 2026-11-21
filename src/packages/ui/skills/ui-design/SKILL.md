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
6. If `semanticTokens.enabled` is explicitly true in `lighthouse.json`, run `lighthouse verify --format json` and inspect its standalone CSS inventory, excluded paths and coverage limitations. Use the installed CLI guide for supported syntax and exact reviewed exceptions. Do not enable the check merely because the visual profile is selected, treat a root design file as replacement authority, or report uninspected content as verified.

Done means the changed interface uses the declared design roles, preserves the required interaction states and has fresh verification evidence.
