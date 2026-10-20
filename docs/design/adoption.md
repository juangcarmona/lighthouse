# Adopt the visual system

Install the independent Lighthouse UI package. Its README and [`DESIGN.md`](../../src/packages/ui/DESIGN.md) are the distributed contract.

The release supplies the exact install command for this UI package.

Import the UI package, apply `lh-root` to the themed root and set `data-lh-theme` to `light`, `dark` or `system`. Check both appearances, keyboard behavior, labels, normal-text contrast, reduced motion and the smallest supported viewport in the product's own verification command.

Keep product overrides and application-specific components in the consuming repository. An upgrade changes the pinned tarball and lockfile, then reruns the visual and interaction checks.
