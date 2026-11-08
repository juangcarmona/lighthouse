# Issue-control contract

<!-- pdac-scope: cited -->

## ADDED Requirements

### Requirement: Source-owned read-only eligibility

The SDK SHALL expose versioned Refine/Propose eligibility using the same canonical source checks as admission, with authenticated actor, current inputs/policy, required evidence, reservation provenance and explicit unknown/denied reasons. Preflight SHALL neither reserve work nor dispatch a workflow.

#### Scenario: Inputs change after preflight

- **WHEN** source inputs, actor authority, policy or reservation changes before admission
- **THEN** source admission rechecks the canonical facts and rejects or limits the stale request without executing it

<!-- pdac:cite id="FR-AUTHORIZED-WORKFLOW-ENTRY" digest="sha256:b859ab077d989e855c187e1823492a04c2924fb27f7d4f59cf18822cc912ee09" -->

### Requirement: Immutable intent and source execution reconciliation

The source SHALL bind repository, issue, authenticated actor and stable client identifier to one immutable payload and retained admission or rejection. Identical repetitions SHALL resolve the original result; changed payloads SHALL conflict. No uncertain outcome SHALL trigger an automatic resend.

#### Scenario: A client restarts after losing a response

- **WHEN** it reconciles the retained identifier and payload
- **THEN** it receives the exact authenticated source receipt or an explicit unresolved state, without selecting a run by time

<!-- pdac:cite id="QR-AUTHORITY-TRACEABILITY" digest="sha256:f2f309f40b61461ae3af2ef87e81769a5efed5be2696d5ca729aed42e9926079" -->

### Requirement: Stage-only request authority

A typed Refine or Propose request SHALL authorize only that stage. Existing source concurrency, reservations, independent checks, human decisions and direct GitHub entry SHALL remain enforced.

#### Scenario: Global automatic implementation is enabled

- **WHEN** a typed stage-only refinement succeeds
- **THEN** its snapshot and publisher preserve that restriction and do not request implementation or merge

<!-- pdac:cite id="BR-ENTRY-AUTHORITY" digest="sha256:f57d0272ff0c5f7ce8bfc534d6d9adba6c294d9c00b8bc109d8243ccc90b2b33" -->

### Requirement: Exact run and outcome identity

Request receipts SHALL distinguish router dispatch, worker admission and validated stage outcome and retain exact run/attempt identities with the client payload binding. A successful HTTP response alone SHALL NOT establish worker execution or stage success.

#### Scenario: Dispatch succeeds but worker admission is not observed

- **WHEN** the API returns the exact router run identifier
- **THEN** the client shows that source admission is pending or unknown until authenticated worker evidence is observed

<!-- pdac:cite id="QR-AUTHORITY-TRACEABILITY" digest="sha256:f2f309f40b61461ae3af2ef87e81769a5efed5be2696d5ca729aed42e9926079" -->

### Requirement: Attributable ordinary comments

Client comments SHALL be posted as the authenticated GitHub user with bounded typed intent and payload binding. Ordinary comments SHALL NOT request continuation, execute command-looking text or approve product/lifecycle decisions. Publication uncertainty SHALL remain unresolved until exact-source reconciliation.

#### Scenario: Ordinary comment on a pending question

- **WHEN** the owner submits ordinary text, including text resembling a command or approval
- **THEN** source routing treats it as input only, preserves the pending wait and evaluates any input-freshness consequences

<!-- pdac:cite id="BR-HUMAN-AUTHORITY" digest="sha256:c26daacd93dfc059f9ff99cdac179a2ee0d136d5c02cd146b92b3c46e49752e8" -->

### Requirement: Explicit current continuation

Reply-and-continue SHALL be a separate intent bound to the current authenticated question, actor and original grant. Changed or unsupported evidence SHALL reject continuation. The source SHALL acknowledge consumption before a client treats the wait as resolved.

#### Scenario: The question changes before the explicit reply arrives

- **WHEN** source admission observes a different question or grant
- **THEN** it records rejection or unsupported status without resuming another question or granting new work

<!-- pdac:cite id="UC-CONTINUE-AGENT-RUN" digest="sha256:6544c612ba2690454c06dd305b5888a637cf3b8b7d3d9cdb2fc7d3eaea79fa6b" -->

### Requirement: Explicit compatibility and live qualification

Unknown or incompatible contracts SHALL expose an explicit limitation without untyped fallback. Acceptance SHALL require packaged qualification with actual user-authorized dispatch, source races, duplicate identifiers, lost-response/restart reconciliation, ordinary comments and explicit continuation.

#### Scenario: Only fixture evidence is available

- **WHEN** deterministic tests pass but actual authorized-source qualification has not run
- **THEN** delivery remains incomplete and the evidence names that limitation

<!-- pdac:cite id="BR-ROUTE-CONTRACT" digest="sha256:477e145dfa2a1e4aecc6fcaab72909269a3f41b23486d0ebe59ec90c908d10a9" -->
