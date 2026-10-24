<!-- pdac-scope: cited -->

# Workflow authorization

<!-- pdac-drift ids="BR-ROUTE-CONTRACT,BR-TRIAGE-CONTRACT,BR-STAGE-GATES,UC-RUN-SDLC,UC-IMPLEMENT-CHANGE" summary="Direct engineering entry and event-driven continuation require CHG-AUTHORIZED-WORKFLOW-ENTRY-001; current mandatory triage and stop semantics remain in the baseline." -->

## ADDED Requirements

### Requirement: Preserve attributable authority across workflow entry and continuation

The system SHALL evaluate verified capabilities, recorded scope and repository policy before entering or continuing work and SHALL retain separate integration authority. The proposed Product Change defines the new entry semantics; this specification does not claim that the unchanged baseline already permits them.

<!-- pdac:cite id="BR-HUMAN-AUTHORITY" digest="sha256:c26daacd93dfc059f9ff99cdac179a2ee0d136d5c02cd146b92b3c46e49752e8" -->

#### Scenario: Engineer entry

- **WHEN** an actor with verified engineering capability requests refine
- **THEN** refinement is selected without requiring or inventing a triage predecessor.

#### Scenario: Requester intake

- **WHEN** an admitted requester submits a new issue
- **THEN** triage is selected and any continuation remains bounded by the standing intake policy.

#### Scenario: No implicit launch

- **WHEN** an engineer opens an issue without a work request and automatic intake is not enabled for that actor
- **THEN** no agent starts.

#### Scenario: Unauthorized actor

- **WHEN** identity or repository permission is unknown, unavailable or insufficient
- **THEN** no model execution or privileged publication is admitted.

#### Scenario: Separate autonomy

- **WHEN** the same engineer selects supervised or permitted unattended execution
- **THEN** only configured human stops differ and merge authority does not change.

#### Scenario: Planning only

- **WHEN** the grant permits only planning
- **THEN** proposal artifacts may be produced but code application and merge are denied.

#### Scenario: Direct implementation

- **WHEN** an engineer requests implement
- **THEN** the harness validates definition and risk and produces any missing required OpenSpec artifacts before code application.

#### Scenario: Scoped clarification

- **WHEN** a permitted respondent answers the matching pending question
- **THEN** one refinement resumes under the unchanged bounded authorization.

#### Scenario: Unrelated reply

- **WHEN** a different actor, bot or unrelated comment arrives
- **THEN** no clarification is resolved and no new authority is granted.

#### Scenario: Duplicate delivery

- **WHEN** the same event is delivered twice
- **THEN** one durable execution identity and one publication are retained.

#### Scenario: Trusted continuation

- **WHEN** a bot requests the next workflow
- **THEN** the previous validated result and effective grant are checked; bot identity alone is insufficient.

#### Scenario: Revocation and drift

- **WHEN** source, scope or policy changes or authority is revoked
- **THEN** dependent dispatch and stale publication stop until valid authority is established.

#### Scenario: Refinement outcomes

- **WHEN** refinement completes, needs clarification or splits work
- **THEN** validated effects produce the matching issue and label transition and preserve child dependency order.

#### Scenario: Bounded PR repair

- **WHEN** CI or review requires a correction
- **THEN** the same PR is updated within the allowed attempts; exhausted limits report a stop.

#### Scenario: Integration boundary

- **WHEN** implementation and checks pass
- **THEN** only a separate current-head integration authorization permits merge.
