---
kind: tip
id: 5-26
title: 'Tip 5-26: Make the origin of lower-level building blocks explicit!'
section: '05'
category: building-block
source_url: https://docs.arc42.org/tips/5-26/
source_author: Dr. Gernot Starke
source_contributors: []
license: CC BY-SA 4.0
source_revision: 3cb35782b62d0cd4103aedcc75fc4ba748f043ad
tags:
  - building-block
  - hierarchy
---

> Source: [Tip 5-26: Make the origin of lower-level building blocks explicit!](https://docs.arc42.org/tips/5-26/) — © 2016–2023 Dr. Gernot Starke; CC BY-SA 4.0.


In case you mutually refine several building blocks at once
(as proposed in [tip 5-25 (mutually refine)](https://docs.arc42.org/tips/5-25)),
you should explicitly document the _origin_ (aka ancestor or root)
of the refined building blocks.

It should be explicit for every element within a _refined_ whitebox
where it's originating (that means, where it is refined from).

You find two examples below:

#### Document origin by naming convention


![whitebox with two blackboxes refined to single whitebox](https://docs.arc42.org/assets/images/sections/05/mutual-refinement.webp){:width="85%"}

#### Document origin by graphical means

In the next diagram the origin of the refined building blocks
is shown by a named rectangle around the refined blocks
(for illustration purposes shown in pink color...)

![refined building blocks](https://docs.arc42.org/assets/images/sections/05/mutual-refinement-graphical.png){:width="85%"}
