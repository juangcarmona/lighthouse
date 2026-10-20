---
kind: tip
id: 7-5
title: 'Tip 7-5: Document the mapping of building-blocks to hardware!'
section: '07'
category: deployment
source_url: https://docs.arc42.org/tips/7-5/
source_author: Dr. Gernot Starke
source_contributors: []
license: CC BY-SA 4.0
source_revision: 3cb35782b62d0cd4103aedcc75fc4ba748f043ad
tags:
  - deployment-view
  - mapping
---

> Source: [Tip 7-5: Document the mapping of building-blocks to hardware!](https://docs.arc42.org/tips/7-5/) — © 2016–2023 Dr. Gernot Starke; CC BY-SA 4.0.


In case your system requires different nodes or processors to execute, you should explain
the mapping of your building blocks to that hardware.

Document or specify the mapping of the building blocks (see arc42 section 5)
onto the hardware (more specifically - the mapping of the _artifacts_ generated/compiled/created
  from the actual source code building blocks.). That is called _deployment_.  
In many cases that can be an m:n mapping, with several variants of deployment artifacts

Remember to explain these deployment variants.

In the following diagram you find three different variants how the
three architecture building blocks `A`, `B` and `C` can be deployed on
different hardware environments.

![three different variants how the three architecture building blocks A, B and C can be deployed](https://docs.arc42.org/assets/images/sections/07/deployment-options.webp)
