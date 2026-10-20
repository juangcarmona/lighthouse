---
kind: tip
id: 5-25
title: 'Tip 5-25: If useful, refine several building blocks at once!'
section: '05'
category: building-block
source_url: https://docs.arc42.org/tips/5-25/
source_author: Dr. Gernot Starke
source_contributors: []
license: CC BY-SA 4.0
source_revision: 3cb35782b62d0cd4103aedcc75fc4ba748f043ad
tags:
  - building-block
  - hierarchy
---

> Source: [Tip 5-25: If useful, refine several building blocks at once!](https://docs.arc42.org/tips/5-25/) — © 2016–2023 Dr. Gernot Starke; CC BY-SA 4.0.


You can refine several blackboxes at once in a mutual whitebox. That
might be useful if these building blocks intensively interact,
cooperate or provide similar interfaces.

You find an example in the diagram below: On the left part of this diagram you find a whitebox (level-1) which contains two blackboxes
`Foo` and `Bar`.

Both of these are refined in a single whitebox on the right side
of the diagram. Consistently, all interfaces of level-1 are
contained in level-2.

The _origin_ of the refined (level-2) blackboxes is given
by prefixes.

![whitebox with two blackboxes refined to single whitebox](https://docs.arc42.org/assets/images/sections/05/mutual-refinement.webp){:width="85%"}


>Apply this tip with care, as it violates the clean hierarchical
decomposition usually applied in the building block view.
