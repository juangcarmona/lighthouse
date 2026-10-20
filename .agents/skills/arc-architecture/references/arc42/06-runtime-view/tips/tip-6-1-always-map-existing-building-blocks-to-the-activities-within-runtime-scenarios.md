---
kind: tip
id: 6-1
title: 'Tip 6-1: Always map existing building blocks to the activities within runtime scenarios!'
section: '06'
category: runtime
source_url: https://docs.arc42.org/tips/6-1/
source_author: Dr. Gernot Starke
source_contributors: []
license: CC BY-SA 4.0
source_revision: 3cb35782b62d0cd4103aedcc75fc4ba748f043ad
tags:
  - scenario
  - runtime-view
  - essential
  - runtime-scenario
---

> Source: [Tip 6-1: Always map existing building blocks to the activities within runtime scenarios!](https://docs.arc42.org/tips/6-1/) — © 2016–2023 Dr. Gernot Starke; CC BY-SA 4.0.


Runtime scenarios show (document or specify) the interaction of building blocks
or their instances. You should always use elements from your
[building block view](https://docs.arc42.org/section-5)
(or their runtime counterparts, like instances of classes) within these
scenarios. They describe _how the system fulfills certain responsibilities_ or tasks,
what building blocks are involved.

Please contrast those runtime scenarios with _required functions_: Those
describe a required process or sequence of steps that the system somehow needs
to execute or perform (but regardless what element of the systems actually does it).

It's an important architecture task to map from the latter (requirements) to
the building blocks. In other words: You need to assign responsibilities to
your building blocks.

For this mapping you have several options:

* UML sequence diagrams, which immediately show the mapping of activities to
building blocks (see [tip (sequence diagrams)](https://docs.arc42.org/tips/6-11)).
* Activity diagrams or flowcharts with _swimlanes_ showing this mapping.
* Textual descriptions or numbered lists: There you have to manually care for the
mapping...
