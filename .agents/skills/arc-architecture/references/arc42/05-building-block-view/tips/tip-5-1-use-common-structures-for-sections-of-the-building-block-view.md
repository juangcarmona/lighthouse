---
kind: tip
id: 5-1
title: 'Tip 5-1: Use common structures for sections of the building block view!'
section: '05'
category: building-block
source_url: https://docs.arc42.org/tips/5-1/
source_author: Dr. Gernot Starke
source_contributors: []
license: CC BY-SA 4.0
source_revision: 3cb35782b62d0cd4103aedcc75fc4ba748f043ad
tags:
  - building-block
  - blackbox
  - whitebox
---

> Source: [Tip 5-1: Use common structures for sections of the building block view!](https://docs.arc42.org/tips/5-1/) — © 2016–2023 Dr. Gernot Starke; CC BY-SA 4.0.


TODO: insert links to specific tips for black-/whitebox

Regardless on the level-of-detail or abstraction level you're currently
documenting or specifying: Use uniform:

* **whitebox** representations to (graphically) explain structures
and inner workings
* **blackbox** representation to explain responsibiliy and interfaces
of single building blocks


#### Whitebox descriptions

Every whitebox explains the internal structure and internal interfaces
of a "higher-level blackbox", usually by a diagram and some textual explanation.

You might use UML or any box/arrow kind of diagram.

#### Blackbox descriptions

Blackbox descriptions:

* explain responsibilities and interfaces of a building block,
* respect the information-hiding principle, thus avoiding disclosure of internal details
* can be either tabular or graphical


Other [tips in this section](https://docs.arc42.org/section-5/) refer to both black- and whiteboxes.
