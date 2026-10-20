---
kind: tip
id: 5-11
title: 'Tip 5-11: Show multiple levels of the building block view!'
section: '05'
category: building-block
source_url: https://docs.arc42.org/tips/5-11/
source_author: Dr. Gernot Starke
source_contributors: []
license: CC BY-SA 4.0
source_revision: 3cb35782b62d0cd4103aedcc75fc4ba748f043ad
tags:
  - building-block
  - hierarchy
---

> Source: [Tip 5-11: Show multiple levels of the building block view!](https://docs.arc42.org/tips/5-11/) — © 2016–2023 Dr. Gernot Starke; CC BY-SA 4.0.


Sometimes details from deeper levels of the building block
hierarchy are required for understanding and maintaining
the overall system. In such cases it might be useful
to refine (specify or document) building blocks from
level-1 down to the appropriate details (although that will surely
  create a lot of work, see below).

In such cases, obey the important consisteny rule shown in
[tip 5-12 (consistent refinement)](https://docs.arc42.org/tips/5-12).

See the following diagram for an (quite abstract...) example:
(taken from [tip 5-2 (building block hierarchy)](https://docs.arc42.org/tips/5-2)).


### Detailed building block hierarchy creates _huge_ effort
Several levels of the building block view will require
significant effort in creation and maintenance. You should invest
this effort only if there is a real demand for this information.

>In my (Gernot) experience, lots of effort could be saved in
real-world systems if building block details would be replaced by appropriate cross-cutting concepts. See [tip 5-10 (concepts to explain building block details)](https://docs.arc42.org/tips/5-10).
