---
id: BR-PUBLIC-SITE-PROJECTION
type: business-rule
title: Generate the public story from canonical sources
status: draft
applies-to: [BC-FOUNDATION, UC-BUILD-PUBLIC-STORY]
uses-terms: [TERM-PUBLIC-SITE-PROJECTION, TERM-MANAGED-PROJECTION, TERM-AUTHORITY-MAP]
---

## Rule

The public site MUST be generated from ProductShape intent, ArcShape architecture and declared workflow projection data. It MUST keep source references, Mermaid diagrams and generated architecture readers aligned with those authorities, and MUST report drift instead of silently maintaining a second narrative.

## Rationale

The site should explain the product and its delivery flow without becoming another place where product or architecture meaning is edited.

## Examples

ProductShape supplies the product boundary and lifecycle capabilities, ArcShape supplies architecture context and sequence diagrams, and the site build composes those inputs into the public overview and adoption routes.

## Exceptions

Brand copy and navigation labels may remain site-owned presentation content when they do not redefine product intent, architecture or workflow semantics.
