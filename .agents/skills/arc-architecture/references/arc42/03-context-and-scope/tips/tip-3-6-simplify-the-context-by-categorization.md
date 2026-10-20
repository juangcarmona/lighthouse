---
kind: tip
id: 3-6
title: 'Tip 3-6: Simplify the context by categorization!'
section: '03'
category: context
source_url: https://docs.arc42.org/tips/3-6/
source_author: Dr. Gernot Starke
source_contributors: []
license: CC BY-SA 4.0
source_revision: 3cb35782b62d0cd4103aedcc75fc4ba748f043ad
tags:
  - context
  - external-interface
  - lean
---

> Source: [Tip 3-6: Simplify the context by categorization!](https://docs.arc42.org/tips/3-6/) — © 2016–2023 Dr. Gernot Starke; CC BY-SA 4.0.


Keep the context small and simple: categorize external interfaces, systems or
user roles that have strong similarities. Explicitly show that they are
categories or abstractions.

See the following example - where the context contains only a single "report" interface,
(a "category"), that is broken down into two different types of reports on level-1.

![context abstractions drawing](https://docs.arc42.org/assets/images/sections/03/context-abstractions.webp)

I've seen context diagrams with way more than 50 (!) external neighbours, in which
case categorization is an awesome way to reduce visual clutter and make diagrams
understandable again...
