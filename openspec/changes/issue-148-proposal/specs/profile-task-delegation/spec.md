# Profile task delegation

<!-- pdac-scope: cited -->

## Purpose

Allow trusted hosts to execute scoped specialist tasks in verified, bounded waves without changing lifecycle authority.

## ADDED Requirements

### Requirement: Explicit delegated selection and scope

Tasks MUST declare specialist, profile, dependencies and files. Hosts MUST resolve profiles, validate bounded launch contracts and use fresh child context and identity.

<!-- pdac:cite id="FR-PROFILE-DELEGATION" digest="sha256:dfe2874654b6e78de96b24d146fb944d966c6773a69d5a1d93a3f5eaadc8eb1b" -->
<!-- pdac:cite id="BR-AGENT-LAUNCH" digest="sha256:10c5293cdbafffda987b287968e141daceed8a063da166faa339793ebe10c1ed" -->

#### Scenario: Specialist profile

- **WHEN** a permitted specialist task declares fast
- **THEN** its launch receives the resolved fast model and independent reasoning within the parent's tools and scope

#### Scenario: Invalid graph or scope

- **WHEN** a task has an unknown dependency, a cycle, an unavailable profile or out-of-parent affected files
- **THEN** the batch fails validation before any child launches

### Requirement: Verified bounded parallel waves

The executor MUST run only eligible tasks within the configured host parallel limit. Overlapping file or directory scopes MUST NOT run concurrently. Every wave MUST be verified before its successful tasks release dependants; failed execution or verification MUST expose blocked dependants.

<!-- pdac:cite id="FR-PROFILE-DELEGATION" digest="sha256:dfe2874654b6e78de96b24d146fb944d966c6773a69d5a1d93a3f5eaadc8eb1b" -->

#### Scenario: Conflicting scopes

- **WHEN** two eligible tasks affect the same file or one affects its containing directory
- **THEN** they execute in separate waves even when parallel capacity remains

#### Scenario: Failed wave

- **WHEN** a task fails or its wave fails verification
- **THEN** its dependants remain blocked with evidence and no lifecycle gate advances

#### Scenario: Parallel bound

- **WHEN** more disjoint tasks are eligible than the host limit allows
- **THEN** no wave exceeds that limit

### Requirement: Delegation preserves authority

Profile metadata MUST NOT enlarge tools, scope or authority or bypass review, publication or merge gates.

<!-- pdac:cite id="FR-PROFILE-DELEGATION" digest="sha256:dfe2874654b6e78de96b24d146fb944d966c6773a69d5a1d93a3f5eaadc8eb1b" -->
<!-- pdac:cite id="BR-HUMAN-AUTHORITY" digest="sha256:c26daacd93dfc059f9ff99cdac179a2ee0d136d5c02cd146b92b3c46e49752e8" -->

#### Scenario: Profile requests broader authority

- **WHEN** a task requests a tool or file beyond its parent or specialist contract
- **THEN** validation rejects the task before launch regardless of profile
