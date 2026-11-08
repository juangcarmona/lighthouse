# Opaque source-link tree identity

## ADDED Requirements

### Requirement: Checked identity preserves authenticated opaque source links

The trusted host SHALL bind unchanged tracked source-link path, mode and blob identity from the admitted revision into the complete checked candidate tree without following or materializing those links in the executable filesystem. The publisher SHALL continue to require equality with that complete tree.

#### Scenario: Candidate contains a regular change and a preserved ignored source link

- **WHEN** command checks validate a regular-file candidate derived from an authenticated source containing a tracked ignored source link
- **THEN** the complete checked Git tree includes that unchanged opaque entry and equals the publication overlay while the check filesystem contains no symlink

#### Scenario: Metadata is changed or collides with executable source

- **WHEN** source-link metadata has a changed revision, unsupported entry, duplicate or regular-file/directory collision
- **THEN** trusted preparation or evidence validation rejects the request before publication

#### Scenario: Artifact metadata and its digest are forged together

- **WHEN** retained evidence changes opaque entries and updates its own claimed metadata digest
- **THEN** the reader independently reconstructs the entries from the authenticated admitted source commit and rejects the mismatch before accepting command evidence

#### Scenario: Source contains no links

- **WHEN** no opaque source-link entries exist
- **THEN** the host preserves the existing candidate tree and evidence binding behavior
