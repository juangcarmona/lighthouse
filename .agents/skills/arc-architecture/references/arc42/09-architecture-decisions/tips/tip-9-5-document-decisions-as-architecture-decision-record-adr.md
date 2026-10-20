---
kind: tip
id: 9-5
title: 'Tip 9-5: Document decisions as `Architecture Decision Record` (ADR)!'
section: '09'
category: decisions
source_url: https://docs.arc42.org/tips/9-5/
source_author: Dr. Gernot Starke
source_contributors: []
license: CC BY-SA 4.0
source_revision: 3cb35782b62d0cd4103aedcc75fc4ba748f043ad
tags:
  - decision
---

> Source: [Tip 9-5: Document decisions as `Architecture Decision Record` (ADR)!](https://docs.arc42.org/tips/9-5/) — © 2016–2023 Dr. Gernot Starke; CC BY-SA 4.0.


<a target="_blank" rel="noopener noreferrer nofollow" href="https://thinkrelevance.com/blog/2011/11/15/documenting-architecture-decisions">Michael Nygard</a> has written
a blogpost about documenting important architecture decisions in a _pattern_ form:

>We will use a format with just a few parts, so each document is easy to digest. The format has just a few parts.
>
>**Title** These documents have names that are short noun phrases. For example, "ADR 1: Deployment on Ruby on Rails 3.0.10" or "ADR 9: LDAP for Multitenant Integration"<br>
>**Context** This section describes the forces at play, including technological, political, social, and project local. These forces are probably in tension, and should be called out as such. The language in this section is value-neutral. It is simply describing facts.<br>
>**Decision** This section describes our response to these forces. It is stated in full sentences, with active voice. "We will ..."<br>
>**Status** A decision may be "proposed" if the project stakeholders haven't agreed with it yet, or "accepted" once it is agreed. If a later ADR changes or reverses a decision, it may be marked as "deprecated" or "superseded" with a reference to its replacement.<br>
>**Consequences** This section describes the resulting context, after applying the decision. All consequences should be listed here, not just the "positive" ones. A particular decision may have positive, negative, and neutral consequences, but all of them affect the team and project in the future.<br>
quoted from <a target="_blank" rel="noopener noreferrer nofollow" href="https://thinkrelevance.com/blog/2011/11/15/documenting-architecture-decisions">Michael Nygard</a>

You could describe this ADR format as tables.

## (These) ADR are missing _criteria_

I (Gernot) am missing the decision criteria (see [tip 9-2 (document decision criteria)](https://docs.arc42.org/tips/9-2)) - but maybe
I'm overly peculiar in that aspect...
