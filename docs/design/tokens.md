# Token roles and themes

The canonical token contract is [`src/packages/ui/DESIGN.md`](../../src/packages/ui/DESIGN.md), backed by [`tokens.css`](../../src/packages/ui/tokens.css). This file remains a repository pointer so the root documentation index has a stable link.

Use semantic `--lh-*` roles in product UI. Primitive values belong to the theme implementation and should not appear in component code. The adopter owns palette overrides while preserving the role names, light/dark behavior and accessibility checks.
