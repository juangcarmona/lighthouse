<!-- pdac-scope: cited -->

# Bounded CI correction

## ADDED Requirements

### Requirement: Publication requires trusted applicable validation

The host SHALL validate proposed Markdown style and local links before successful publication, in addition to the owning provider and adopted implementation checks.

<!-- pdac:cite id="FR-AUTHORIZED-WORKFLOW-ENTRY" digest="sha256:b859ab077d989e855c187e1823492a04c2924fb27f7d4f59cf18822cc912ee09" -->
<!-- pdac:cite id="BR-ENTRY-AUTHORITY" digest="sha256:f57d0272ff0c5f7ce8bfc534d6d9adba6c294d9c00b8bc109d8243ccc90b2b33" -->
<!-- pdac:cite id="BR-BOUNDED-WORKFLOW" digest="sha256:d67762bd448033970425c077d560dd2749e26200676953cd64aa1c09b31d803d" -->
<!-- pdac:cite id="QR-BOUNDED-AUTOMATION" digest="sha256:bcc08b11d7ab7ebf52669319710f57c9b32ec6b1c17c89c7ae8df6452249450f" -->
<!-- pdac:cite id="FR-CHANGE-EVIDENCE" digest="sha256:9207c491167fcdb5cebf14dc750bb0ac5441f847c4607cd94111385128b692f0" -->
<!-- pdac:cite id="BR-PRODUCT-CHANGE-HANDOFF" digest="sha256:d7ddebbfaf4767d79f645d510806e446b7f81cca03e5f8650ea0fff072b225d1" -->

#### Scenario: Broken proposal without hooks

- **WHEN** a proposed Markdown file has an invalid local link or violates adopted style
- **THEN** trusted publication fails before signing or creating the candidate PR

### Requirement: Failed CI correction retains current authority and a finite budget

The router SHALL request correction only for explicitly selected issues with authenticated failed adopted CI on the current same-repository implementation PR and a matching original implementation grant. It SHALL consume at most two correction attempts for that PR identity across changing heads.

<!-- pdac:cite id="FR-AUTHORIZED-WORKFLOW-ENTRY" digest="sha256:b859ab077d989e855c187e1823492a04c2924fb27f7d4f59cf18822cc912ee09" -->
<!-- pdac:cite id="BR-ENTRY-AUTHORITY" digest="sha256:f57d0272ff0c5f7ce8bfc534d6d9adba6c294d9c00b8bc109d8243ccc90b2b33" -->
<!-- pdac:cite id="BR-BOUNDED-WORKFLOW" digest="sha256:d67762bd448033970425c077d560dd2749e26200676953cd64aa1c09b31d803d" -->
<!-- pdac:cite id="QR-BOUNDED-AUTOMATION" digest="sha256:bcc08b11d7ab7ebf52669319710f57c9b32ec6b1c17c89c7ae8df6452249450f" -->
<!-- pdac:cite id="FR-CHANGE-EVIDENCE" digest="sha256:9207c491167fcdb5cebf14dc750bb0ac5441f847c4607cd94111385128b692f0" -->
<!-- pdac:cite id="BR-PRODUCT-CHANGE-HANDOFF" digest="sha256:d7ddebbfaf4767d79f645d510806e446b7f81cca03e5f8650ea0fff072b225d1" -->

#### Scenario: Repairable current failure

- **WHEN** adopted CI fails on an eligible current candidate with unchanged intent, scope and checks
- **THEN** the existing correction worker updates that same PR and renews host checks and CI

#### Scenario: Duplicate or unknown effect

- **WHEN** a completion duplicates a handled head or an earlier dispatch has unconfirmed effects
- **THEN** no additional worker or candidate is created

#### Scenario: Exhausted correction chain

- **WHEN** two correction attempts have been consumed and the new current candidate still fails
- **THEN** the router retains the PR and identifies the failed CI and required maintainer action without another automatic correction

#### Scenario: Product decision is still required

- **WHEN** failed CI concerns a product proposal or current authority requires an owner decision
- **THEN** automatic implementation correction cannot approve, apply or silently rebind that proposal
