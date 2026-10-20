---
kind: tip
id: 3-11
title: 'Tip 3-11: In the business context, show data flows (instead of dependencies)!'
section: '03'
category: context
source_url: https://docs.arc42.org/tips/3-11/
source_author: Dr. Gernot Starke
source_contributors: []
license: CC BY-SA 4.0
source_revision: 3cb35782b62d0cd4103aedcc75fc4ba748f043ad
tags:
  - context
  - business-context
---

> Source: [Tip 3-11: In the business context, show data flows (instead of dependencies)!](https://docs.arc42.org/tips/3-11/) — © 2016–2023 Dr. Gernot Starke; CC BY-SA 4.0.


>This tip is valid primarily for information systems, less for real-time, embedded- or hardware-oriented systems.

You will be using the context for discussions with various stakeholders, who will likely have limited modeling skills and limited (or no!) knowledge of UML or other (formal) modeling languages.

>Intuitively, many people understand an arrow between software systems as data flow. 
>(Directed) UML relationships like dependency, association, etc. might be rather confusing for such individuals.

Therefore: within the context, use data flows by reversing the direction of the usual dependency- or method-/service call arrows from UML.

Note: this advice is controversial in some teams, because we so explicitly do not comply with the standard UML notation, and also doing that only in the context. 
However, we found that data flows are often easier to communicate with (non-technical) stakeholders.

For the formalists among you: use the normal, dotted UML dependency arrow and annotate it with the stereotype `<< flow >>` to indicate it as data flow and not as a control flow.

For less puristic UML users: invent a new arrow (e.g., solid line with arrowhead) and declare it - as suggested above - in the legend as data flow. 

(IT veterans recognize here the good old context diagrams from the structured analysis.)
