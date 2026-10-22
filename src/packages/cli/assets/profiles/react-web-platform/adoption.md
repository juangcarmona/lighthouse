# Adopt the Lighthouse React web profile

## New application

Select `react-web-platform` with `visual-theme`, set `application.shape` to `frontend` or `full-stack` and set `application.stacks` to include `react`.

Run `lighthouse profiles --format json` before writing application code and keep the reported commands in the repository's normal verification loop.

## Existing application

Inventory routing, session, API contracts, server state, feature boundaries, interaction states, accessibility evidence, tests and build output before moving files.

Map the existing implementation to the profile and record project-owned exceptions where a move would change behavior or ownership.

Adopt one user journey first: session, authenticated screen, query, mutation, loading, empty, error and authentication failure.

The application owns its source, tests, dependencies and build configuration after adoption; Lighthouse owns only the generated profile guidance and declared projections.
