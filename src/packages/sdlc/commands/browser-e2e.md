# Browser E2E

Use this command during `integrate` and `review` when the selected application exposes a browser journey.

1. Read the ProductShape journey and its bounded context before choosing the test.
2. Run the adopter's Playwright command and keep the report, screenshots, traces or videos under the repository's evidence path.
3. Create a browser evidence JSON document with `runner: playwright`, the journey identity, evidence statuses, relative artifact paths and the next action.
4. Run `lighthouse-sdlc browser-e2e --input <evidence.json>` and stop when the report is invalid or the journey is not passed.

The command validates evidence; it does not start Playwright, invent product journeys or make browser tests mandatory for applications without a browser surface.
