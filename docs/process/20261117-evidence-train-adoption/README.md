# Evidence delivery adoption

This repository adopts the published SDLC 0.28.0 delivery train after source changes #741, #745 and #747. Source-mode workers use the immutable release revision recorded in their installed workflows. Maintenance retains its existing registry distribution. Compiler generation stays on gh-aw v0.93.2; existing automation, delegation and client-control settings retain their reviewed values.

The optional [owner decision producer](../../../.github/workflows/lighthouse-delivery-acceptance.yml) is explicitly adopted through its numeric repository/owner identities and reviewed workflow blob in `.lighthouse/delivery-acceptance.json`. It runs only on owner dispatch and creates a receipt only for a new, unedited, source-bound owner decision. This adoption creates no acceptance decision.

## Native qualification

The owner manually dispatches [Lighthouse evidence qualification](../../../.github/workflows/lighthouse-evidence-qualification.yml). Its [driver](../../../src/tests/qualify-delivery-evidence.mjs) installs the exact published SDK in an isolated consumer and verifies its registry source revision and package integrity.

The capture job has read-only GitHub permissions. It verifies published acceptance, metric and collector fixtures; reads a bounded real repository/window; independently reconciles failed publication, blocked review and unavailable usage; and checks deterministic offline rendering. Browser checks cover light/dark, desktop/narrow, keyboard, page bounds, no external requests and WCAG 2.2 A/AA. A separate publisher with Contents/write revalidates the small manifests and separately downloaded PNGs before retaining source-bound visual evidence on the existing protected evidence branch. No model worker is launched.

The first owner acceptance route must report pending when its adopted producer is healthy but no distinct owner decision exists. A product-approval/status comment is verified as an ineligible delivery source. Accepted throughput remains unavailable without a qualifying accepted decision. Shipping, publishing, adoption, native verification and owner acceptance retain separate meanings.

Execution receipts and immutable visual links are recorded on [#590](https://github.com/juangcarmona/lighthouse/issues/590), [#220](https://github.com/juangcarmona/lighthouse/issues/220), [#221](https://github.com/juangcarmona/lighthouse/issues/221) and [#642](https://github.com/juangcarmona/lighthouse/issues/642). The workflow retains frozen observations, report, metrics, package lock, source qualification and publication receipt as separate artifacts. These source records establish the bounded outcome of their exact run; this procedure does not assert that a future run has succeeded.
