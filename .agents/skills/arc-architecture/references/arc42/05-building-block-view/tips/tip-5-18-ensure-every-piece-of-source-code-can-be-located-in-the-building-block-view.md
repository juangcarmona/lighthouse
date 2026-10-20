---
kind: tip
id: 5-18
title: 'Tip 5-18: Ensure **every** piece of source code can be located in the building block view!'
section: '05'
category: building-block
source_url: https://docs.arc42.org/tips/5-18/
source_author: Dr. Gernot Starke
source_contributors: []
license: CC BY-SA 4.0
source_revision: 3cb35782b62d0cd4103aedcc75fc4ba748f043ad
tags:
  - building-block
  - source-code
---

> Source: [Tip 5-18: Ensure **every** piece of source code can be located in the building block view!](https://docs.arc42.org/tips/5-18/) — © 2016–2023 Dr. Gernot Starke; CC BY-SA 4.0.


The building block view shall have an appropriate _place_ for
**every** piece of source code. In other words:

There shall be an architecture building block for every single line
of source code that is created specifically for that system.

You might defer infrastructure tools (like specific build systems,
  code generators or similar stuff) to section 8 (crosscutting concepts) -
  but it's often a good idea to at least mention them on level-1
  of the building block view.

This is the only call-for-completeness we ever propose for
documentation (as completeness is otherwise overly expensive
  to achieve - and you should **not** strive for completeness in anything
  else)

See the following diagram for an example:


![infrastructure in building block view](https://docs.arc42.org/assets/images/sections/05/infrastructure-in-building-block-view.jpg)


The `Code Generator` (shaded in yellow color in the lower left corner)
generates another architectural building block („Campaign Data Management“).
