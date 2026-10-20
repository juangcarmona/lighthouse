---
name: Lighthouse UI design system
description: Shared semantic tokens and native CSS recipes for Lighthouse interfaces.
source: ./tokens.css
packages:
  ui: '@juangcarmona/lighthouse-ui'
tokenPrefix: '--lh-'
modes: [light, dark, system]
framework: framework-neutral CSS
---

# Design

This document is the design contract installed with the Lighthouse visual delivery. `tokens.css` is the machine-readable source of truth; this file explains how an adopter and its agents use those tokens and the optional native recipes.

During `init`, Lighthouse projects this guide into the adopter, creates the soft design-system skill and creates a deterministic token verifier when the selected stack can support one.

## Visual intent

Lighthouse uses a calm, information-dense interface with a night canvas, clear surfaces, thin boundaries and a signal blue for actions and focus. Status colors support readable labels and never carry meaning by themselves.

The default palette is the Lighthouse blue and night palette in `tokens.css`. An adopter may override the palette during initialization or through a product stylesheet while keeping the semantic roles and accessibility checks unchanged.

## Token rules

- Use semantic roles such as `--lh-canvas`, `--lh-surface`, `--lh-text`, `--lh-action`, `--lh-border` and `--lh-focus` in interface code.
- Treat primitive values as theme implementation details; do not copy raw colors into components.
- Use the four-pixel spacing rhythm and the provided control and panel radii before adding a new value.
- Use `--lh-font-sans` for interface text and `--lh-font-mono` for commands, identifiers and compact technical labels.
- Use the feedback pairs `--lh-positive`, `--lh-caution` and `--lh-negative` with their matching surfaces and readable text.

## Appearance

Set `data-lh-theme="light"`, `"dark"` or `"system"` on the themed root. The theme owns the color mapping; application code owns the user's preference and persistence. Light and dark appearances keep the same information hierarchy.

## Components

This package styles native HTML through small `.lh-*` recipes. Products keep markup, state, routing, business behavior and application-specific components in the product repository.

| Recipe | Required semantics | Check |
| --- | --- | --- |
| Button | Native `button`, explicit `type`, real disabled state | Keyboard activation, focus and disabled behavior |
| Field | Associated `label`, input/select, hint or error relation | Accessible name and validation feedback |
| Badge | Short readable status with a declared tone | Meaning survives without color |
| Alert | Concrete result and next useful action | Contrast and announcement behavior when dynamic |
| Table | Caption, scoped headers and a bounded scroll container when needed | Header association and narrow-viewport behavior |
| Dialog | Native `dialog`, labelled heading, deliberate focus and cancel path | Open, close, Escape and focus return |
| Panel | Real heading hierarchy around grouped content | Structure remains meaningful without decoration |

Copy a recipe only when the product needs it, and preserve its native semantics. A shared runtime component needs a separate decision after the same behavior has proved useful in multiple products.

## Layout and states

Use hierarchy, alignment and spacing to separate content. Design loading, empty, success, error, disabled and validation states for each interaction before considering the screen complete. Keep the smallest supported viewport usable without horizontal page overflow.

## Motion and elevation

Transition color, background-color, border-color, opacity and transform with the supplied motion token. Keep the transition short and stop motion when `prefers-reduced-motion: reduce` is active. Do not animate layout dimensions or rely on motion to communicate status.

Use a border and a different surface to express elevation. Reserve the overlay shadow token for temporary dialogs and other transient layers. Focus indicators remain visible in every appearance.

## Accessibility and verification

Meet WCAG 2.2 AA for normal text, keep every interactive element keyboard reachable, label form controls, preserve visible focus and communicate status with text. Check light, dark and system appearance, keyboard and dialog focus, literal user input, narrow viewports and reduced motion.

The Lighthouse gallery is the executable visual reference. Maintainers run `npm run test:visual`; an adopter wires the equivalent browser and accessibility checks into its own verification command. Stack-specific hard checks belong to the selected Lighthouse profile.

## Boundaries

The UI package owns tokens, this guide and optional CSS recipes. The gallery demonstrates composition and stays outside the distributed artifact. Product code owns brand content, application shells, domain components, routing, state and behavior.
