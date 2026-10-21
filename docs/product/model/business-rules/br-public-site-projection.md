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

When the public-site route is enabled, both ProductShape and ArcShape MUST validate before a deployment can proceed. If either authority is missing or invalid, the build MUST stop before deployment and report the authority-specific next action. A failed build MUST NOT replace the last successful publication with a partial site.

## Rationale

The site should explain the product and architecture without becoming another place where their meaning is edited. Requiring both authorities keeps the published story coherent.

## Examples

ProductShape supplies the product boundary and lifecycle capabilities, ArcShape supplies architecture context and sequence diagrams, and the site build composes those inputs into the public overview and adoption routes.

## Exceptions

Brand copy and navigation labels may remain site-owned presentation content when they do not redefine product intent, architecture or workflow semantics. A repository without the public-site route does not need to publish a site.
