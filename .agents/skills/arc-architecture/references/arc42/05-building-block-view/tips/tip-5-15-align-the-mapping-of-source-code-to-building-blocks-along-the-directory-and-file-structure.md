---
kind: tip
id: 5-15
title: 'Tip 5-15: Align the mapping of source-code to building-blocks along the directory and file structure!'
section: '05'
category: building-block
source_url: https://docs.arc42.org/tips/5-15/
source_author: Dr. Gernot Starke
source_contributors: []
license: CC BY-SA 4.0
source_revision: 3cb35782b62d0cd4103aedcc75fc4ba748f043ad
tags:
  - building-block
  - source-code
  - mapping
  - lean
---

> Source: [Tip 5-15: Align the mapping of source-code to building-blocks along the directory and file structure!](https://docs.arc42.org/tips/5-15/) — © 2016–2023 Dr. Gernot Starke; CC BY-SA 4.0.


You'll get the simplest mapping between source code to building blocks
if directories within your (source) file system corresponds directly
to your building blocks.

Consider the following example: On its left you find a hierarchy of building
blocks (`a`,`b`,`c` refined into level 1, `b2` and `c1` refined in level 2).
On the right hand side you see a snapshot of the corresponding file system,
with (higher-level) directories `a`,`b` and `c` and corresponding
subdirectories.


![simple mapping diagram](https://docs.arc42.org/assets/images/sections/05/simple-mapping.webp){:width="85%"}
