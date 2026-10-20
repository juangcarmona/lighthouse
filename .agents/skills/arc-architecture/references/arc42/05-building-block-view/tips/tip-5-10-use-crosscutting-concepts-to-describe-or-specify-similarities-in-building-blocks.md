---
kind: tip
id: 5-10
title: 'Tip 5-10: Use crosscutting concepts to describe or specify similarities in building blocks!'
section: '05'
category: building-block
source_url: https://docs.arc42.org/tips/5-10/
source_author: Dr. Gernot Starke
source_contributors: []
license: CC BY-SA 4.0
source_revision: 3cb35782b62d0cd4103aedcc75fc4ba748f043ad
tags:
  - building-block
  - concept
  - lean
---

> Source: [Tip 5-10: Use crosscutting concepts to describe or specify similarities in building blocks!](https://docs.arc42.org/tips/5-10/) — © 2016–2023 Dr. Gernot Starke; CC BY-SA 4.0.


In short: instead of repeating recurring building-block substructures,
factor those out into a crosscutting concepts.

## Troublesome redundancy
See the following building block diagrams: The top-level (whitebox X)
consists of blackboxes A, B and D - which are refined in three diagrams.

All those refinements look strikingly similar - that's too much
redundancy.

![building blocks diagram with too much redundancy](https://docs.arc42.org/assets/images/sections/05/similar-building-blocks.webp){:width="85%"}


## Crosscutting Concepts to the rescue

A somewhat leaner approach, based upon crosscutting concepts, avoids
this redundancy. In the following diagram, the whitebox contains
blackboxes A, B and D - but there's no refinement for those. Instead,
they all carry the stereotype «X-service», refering to a crosscutting
concept that explains how elements of type X-service» shall be constructed,
build or implemented.

![building blocks diagram, leaner approach](https://docs.arc42.org/assets/images/sections/05/concepts-instead.webp){:width="85%"}


>Crosscutting concepts might describe principles, rules or implementation
restrictions that must hold for specific kinds of building blocks. See
[section 8](https://docs.arc42.org/section-8/) for details.

## Related tips

* Explain concepts instead of too many building block details, see [tip 5-28](https://docs.arc42.org/tips/5-28).
* You should name important concepts, and use these names in building blocks, see [tip 8-11](https://docs.arc42.org/tips/8-11).
