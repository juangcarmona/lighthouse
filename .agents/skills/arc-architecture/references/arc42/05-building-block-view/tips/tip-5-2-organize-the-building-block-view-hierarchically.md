---
kind: tip
id: 5-2
title: 'Tip 5-2: Organize the building block view hierarchically!'
section: '05'
category: building-block
source_url: https://docs.arc42.org/tips/5-2/
source_author: Dr. Gernot Starke
source_contributors: []
license: CC BY-SA 4.0
source_revision: 3cb35782b62d0cd4103aedcc75fc4ba748f043ad
tags:
  - building-block
  - hierarchy
  - source-code
  - essential
---

> Source: [Tip 5-2: Organize the building block view hierarchically!](https://docs.arc42.org/tips/5-2/) — © 2016–2023 Dr. Gernot Starke; CC BY-SA 4.0.


Explain the structure of your source code as a hierarchy of white- and blackboxes,
starting from the context view (arc42 section 3).

The context shows the complete system as a blackbox, which the building block
view level-1 refines as whitebox.

The diagram below schematically shows this hierarchy:

![hierarchical building block diagram](https://docs.arc42.org/assets/images/sections/05/building-block-hierarchy.webp)

* **Level 1** is the white box description of the overall system together with black box descriptions of all contained building blocks.
* **Level 2** zooms into some building blocks of level 1.
Thus it contains the white box description of selected building blocks of level 1, together with black box descriptions of their internal building blocks.
* **Level 3** zooms into selected building blocks of level 2, and so on.

> In the diagram above, each **rounded rectangle** represents a single whitebox,
which shall be documented by an instance of the whitebox template.
You will not have the hierarchy in a single diagram in your concrete documentation!
