# Lighthouse UI

The independent Lighthouse UI package contains semantic CSS tokens, native recipes, the `DESIGN.md` guide and the visual design skill. It has no JavaScript runtime, font download or framework dependency.

[`DESIGN.md`](./DESIGN.md) is the distributed human guide for the visual contract. [`skills/ui-design/SKILL.md`](./skills/ui-design/SKILL.md) gives agents the same contract in an executable sequence. `tokens.css` remains its machine-readable source of truth. `components.css` contains optional recipes built on those tokens.

From the repository root, create a local artifact:

```sh
npm pack --workspace @juangcarmona/lighthouse-ui --pack-destination dist
```

Install this package in an adopter and import `@juangcarmona/lighthouse-ui` through its CSS bundler. For an existing component system, import only `@juangcarmona/lighthouse-ui/tokens.css` and map its roles to `--lh-*` variables. For plain HTML, load the package's `index.css`.

Apply `class="lh-root"` to the body or themed container and set `data-lh-theme="light"`, `"dark"` or `"system"` on the root. The token implementation uses CSS `light-dark()`; products targeting browsers without it need a separately reviewed compatibility build.

The package contains the tokens, native recipes, the design guide, the agent skill, its package manifest and this README. The gallery remains in the source checkout as a maintainer reference.

```css
@import "@juangcarmona/lighthouse-ui";
```

The recipes use the `--lh-*` tokens and native HTML semantics. Products retain markup, state, routing and accessible behavior.
