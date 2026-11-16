<!-- pdac-scope: cited -->

# Engineering practice evidence

Implement the owner-approved CHG-ENGINEERING-PRACTICE-EVIDENCE-001 for #594. ProductShape applies the accepted definition before implementation. Package-owned reporting stays in `src/packages/sdlc`; it never installs scanners or changes CI/hosting policy.

## Product grounding

- FR-PRACTICE-EVIDENCE defines the complete catalog, cumulative quality and enforcement rules, source identity, freshness and historical aggregation.
<!-- pdac:cite id="FR-PRACTICE-EVIDENCE" digest="sha256:6b99125c969f9ae2afe319b4a903dbc9bd1a28a036ace06c3833bb7b0e2ec2cc" -->

## Delivery train

1. Apply the approved Product Change.
2. Publish the versioned catalog and validated source observation contract.
3. Implement deterministic current evaluation, a read-only native collector and CLI.
4. Aggregate compatible historical assessments, deduplicating source attempts.
5. Publish packages and qualify the installed package in an existing adopter.

No level is inferred from absent evidence. Current evidence must match the repository, commit, catalog and 14-day window. Required controls need independently collected CI and merge enforcement. A native passing test report and its deliberately incomplete counterpart demonstrate collection without claiming an unsupported repository level.
