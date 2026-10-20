---
kind: tip
id: 3-8
title: 'Tip 3-8: Aggregate (cluster) similar neighbour systems with ports!'
section: '03'
category: context
source_url: https://docs.arc42.org/tips/3-8/
source_author: Dr. Gernot Starke
source_contributors: []
license: CC BY-SA 4.0
source_revision: 3cb35782b62d0cd4103aedcc75fc4ba748f043ad
tags:
  - context
  - port
---

> Source: [Tip 3-8: Aggregate (cluster) similar neighbour systems with ports!](https://docs.arc42.org/tips/3-8/) — © 2016–2023 Dr. Gernot Starke; CC BY-SA 4.0.


If your system interacts with many external systems, you could use UML port symbols
at to denote categories (or clusters) of such neighbours,
instead of showing all external systems as separate symbols.

That looks similar to [tip 3-7 (categories of external systems)](https://docs.arc42.org/tips/3-7),
but doesn't require the use of stereotypes and might save some drawing effort.

Ports have the great advantage that they connect inside and outside:
You can depict which internal blackbox communicates with which of the external
neighbours.

See the examples below: First you see a context with ports, below you find the more extensive version with ports and explicit neighbour systems.

![](https://docs.arc42.org/assets/images/sections/03/context-with-ports.png)

![](https://docs.arc42.org/assets/images/sections/03/big-context.png)
