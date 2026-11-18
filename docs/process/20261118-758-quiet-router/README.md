# Quiet informational routing

Issue [#758](https://github.com/juangcarmona/lighthouse/issues/758) records informational owner comments being reported as blocked work. The router now publishes issue-comment continuation feedback only for an answer to a current pending stage question. It also limits acknowledgement reactions to those answers. Routing reasons remain in execution output, telemetry and the job summary.

The publication change preserves stage-label requests, PR review feedback and the existing authorization checks. A pending answer still receives an actionable stop when its issue is reserved or closed, or its requested worker is not installed. An old question without a current waiting label does not turn a delivery update into a continuation request.

## Verification

The wired CLI regression uses the real adapter with synthetic GitHub responses. Against unchanged base `d1ea33d45b92e6d784e8662773c3f7e96fbbeefb`, its first informational scenario fails because the adapter makes two unwanted writes. With the correction, all nine scenarios pass and all 29 issue-action tests pass. These observations establish adapter behavior, not deployed workflow behavior; adoption and a native router observation remain separate.

Ponytail guided the caller and publication review. Human prose received the packaged Plain English and Humanizer fallback reviews, followed by comparison with the test results. No agent instructions, public policy, credentials, dispatch grants or merge authority change.
