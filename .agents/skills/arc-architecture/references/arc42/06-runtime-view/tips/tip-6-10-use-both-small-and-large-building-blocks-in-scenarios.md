---
kind: tip
id: 6-10
title: 'Tip 6-10: Use both small and large building blocks in scenarios!'
section: '06'
category: runtime
source_url: https://docs.arc42.org/tips/6-10/
source_author: Dr. Gernot Starke
source_contributors: []
license: CC BY-SA 4.0
source_revision: 3cb35782b62d0cd4103aedcc75fc4ba748f043ad
tags:
  - runtime-view
  - scenario
  - building-block
  - lean
---

> Source: [Tip 6-10: Use both small and large building blocks in scenarios!](https://docs.arc42.org/tips/6-10/) — © 2016–2023 Dr. Gernot Starke; CC BY-SA 4.0.


To save effort, you can mix building blocks of various abstraction
levels (or sizes)
in single scenarios, instead of showing all low-level interactions.

See the following example (building block hierarchy on the left,
  one scenario on the right)

![building block hierarchy on the left, one scenario on the right](https://docs.arc42.org/assets/images/sections/06/mixed-abstraction-levels.webp){:width="70%"}


## Mixing abstraction levels saves effort

As you show some large or more abstract building blocks, you hide their internal working
or internal processes within the scenario. In the example above, you completely
hide the internal working of building block `B`... you simply don't describe or
specify what and how `B` is performing its tasks.
