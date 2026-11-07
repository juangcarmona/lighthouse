const citations = "<!-- pdac:cite id=\"FR-SUMMARY-001\" digest=\"sha256:d422a7f0e7294b9ffbb099871260c2ac5c287609036e808fc160786f294971ac\" -->\n<!-- pdac:cite id=\"BR-SUMMARY-001\" digest=\"sha256:a21b966ff4747da8ee35ee1366ffeac16f6a6fa3da508ca04d3f0b31380677c4\" -->";
const scope = '---\npdac-scope: cited\n---\n\n';
export function rejectedPlan(root) {
 const requirement = 'The summary SHALL count only exact primitive passed and failed strings and classify all other statuses as unavailable. ' + 'Preserve existing input observations and the accepted four-counter result without adding any new product behavior. '.repeat(15);
 return [
  {path:root+'/proposal.md',content:scope+'# Proposal\n\n## Why\nCharacterize the existing summary rules with additional primitive status cases.\n'+citations+'\n\n## What Changes\n- Append numeric and boolean classification tests; preserve production code and all existing assertions.\n\n## Capabilities\n### New Capabilities\n- `summary-characterization`: Verification of existing summary behavior.\n### Modified Capabilities\nNone.\n\n## Impact\nOnly src/summary.test.mjs and this plan. No product-model changes.\n'},
  {path:root+'/design.md',content:scope+'# Design\n\nUse a frozen mixed inventory with exact literal expected counters, preserving scalar values, identity and nested contents.\n'+citations+'\n\nRun the declared independent checks before review. Roll back only the added test and this plan.\n'},
  {path:root+'/tasks.md',content:scope+'# Tasks\n\nThe tests characterize existing rules.\n'+citations+'\n\n- [ ] 1.1 Append the numeric and boolean status matrix without changing existing assertions.\n- [ ] 1.2 Run the declared checks and retain their results.\n'},
  {path:root+'/specs/summary-characterization/spec.md',content:scope+'## ADDED Requirements\n\n### Requirement: Existing summary classification\n'+requirement+'\n'+citations+'\n\n#### Scenario: Other primitive statuses\n- **WHEN** numeric and boolean status observations are mixed with primitive passed and failed controls\n- **THEN** only the two recognized controls are counted as passed or failed and all other statuses are unavailable\n'}
 ];
}
