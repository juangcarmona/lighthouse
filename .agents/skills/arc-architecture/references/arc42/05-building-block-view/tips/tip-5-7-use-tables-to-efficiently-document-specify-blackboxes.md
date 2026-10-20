---
kind: tip
id: 5-7
title: 'Tip 5-7: Use tables to efficiently document/specify blackboxes!'
section: '05'
category: building-block
source_url: https://docs.arc42.org/tips/5-7/
source_author: Dr. Gernot Starke
source_contributors: []
license: CC BY-SA 4.0
source_revision: 3cb35782b62d0cd4103aedcc75fc4ba748f043ad
tags:
  - building-block
  - table
  - blackbox
---

> Source: [Tip 5-7: Use tables to efficiently document/specify blackboxes!](https://docs.arc42.org/tips/5-7/) — © 2016–2023 Dr. Gernot Starke; CC BY-SA 4.0.


A simple and efficient way to document or specify blackboxes
are tables, like shown in the following sections.

### Minimal Blackbox Template

|Purpose/Responsibility | &lt;short description of purpose> |
|Interface(s)           | &lt;short description of interface(s)> |

### Full Blackbox Template


|Purpose/Responsibility | &lt;short description of purpose> |
|Interface(s)           | &lt;short description of interface(s)> |
|(optional) Quality-/performance characteristics | &lt;short description or links to quality requirements> |
|(optional) directory/file location | where to find the source code of this blackbox. |
|(optional) Fulfilled requirements| &lt;short description or links to requirements documentation>|
|(optional) Open issues | &lt;list of known problems/risks, links to arc42-section 11>

### Remarks

* Interfaces: describe those only when they are **not** extracted as separate paragraphs.
Interfaces may include qualities and performance characteristics.

* Quality-/performance characteristics might be topics like availability, run time behavior,
flexibility or similar.
* Directory/file location: This might be a single file/directory, or a list of sources making up this blackbox.
* Add fulfilled requirements only if you **really** need traceability. It's expensive and creates huge effort... Think twice.
