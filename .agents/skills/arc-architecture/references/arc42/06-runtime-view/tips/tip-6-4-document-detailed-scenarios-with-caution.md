---
kind: tip
id: 6-4
title: 'Tip 6-4: Document detailed scenarios (with caution)!'
section: '06'
category: runtime
source_url: https://docs.arc42.org/tips/6-4/
source_author: Dr. Gernot Starke
source_contributors: []
license: CC BY-SA 4.0
source_revision: 3cb35782b62d0cd4103aedcc75fc4ba748f043ad
tags:
  - scenario
  - runtime-view
  - thorough
  - runtime-scenario
---

> Source: [Tip 6-4: Document detailed scenarios (with caution)!](https://docs.arc42.org/tips/6-4/) — © 2016–2023 Dr. Gernot Starke; CC BY-SA 4.0.


This tip contrasts to [tip 6-3 (schematic scenarios)](https://docs.arc42.org/tips/6-3).

The original intention of UML sequence diagrams was showing interactions
between concrete _instances_ of classes, with method invocations and parameters,
- the lowest level of detail you can have. In this level, we talk about
the instance 'Homer Simpson' instead of the class `Person`.

The advantages of such details are **thoroughness and accuracy**: You visualize
single executions of source code.

**Please document details with caution - and only if relevant stakeholders really
need them!**

### Heavy disadvantages:

The disadvantage of these details are the immense creation and maintenance effort,
and the potentially low readability of very detailed runtime diagrams.
