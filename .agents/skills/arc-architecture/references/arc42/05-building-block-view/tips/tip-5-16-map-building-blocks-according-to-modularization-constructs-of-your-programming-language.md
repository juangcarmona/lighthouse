---
kind: tip
id: 5-16
title: 'Tip 5-16: Map building blocks according to modularization constructs of your programming language!'
section: '05'
category: building-block
source_url: https://docs.arc42.org/tips/5-16/
source_author: Dr. Gernot Starke
source_contributors: []
license: CC BY-SA 4.0
source_revision: 3cb35782b62d0cd4103aedcc75fc4ba748f043ad
tags:
  - building-block
  - source-code
  - mapping
---

> Source: [Tip 5-16: Map building blocks according to modularization constructs of your programming language!](https://docs.arc42.org/tips/5-16/) — © 2016–2023 Dr. Gernot Starke; CC BY-SA 4.0.


In case you apply the modularization constructs of your programming language
when designing or specifying architecture building blocks, you'll get
the optimal mapping of source code to the architecture.

For development of Java systems, for example, architecture building blocks
(i.e. level-1 blackboxes) shall correspond to Java packages.

## When to deviate from this rule

* In _historically_ grown systems it might be useful to deviate
from this rule if the code is (seemingly) disorganized...
* If you use various programming languages for implementing otherwise
cohesive building blocks (i.e. you implement parts of the building block
  in Java, other parts in JavaScript, even other parts in Python)
* If some of your frameworks/libraries or even used-products enforce
_other_ structuring of code... then you should comply to the suggestions
of your tools ("don't fight the platform"), but nevertheless create
meaningful architectural building blocks.
* If the stuff located in the package/namespace/module is not cohesive
(see [tip 5-17 (cohesion is king)](https://docs.arc42.org/tips/5-17))
