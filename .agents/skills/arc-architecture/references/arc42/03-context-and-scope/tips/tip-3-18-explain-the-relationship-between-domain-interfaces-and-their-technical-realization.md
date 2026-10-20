---
kind: tip
id: 3-18
title: 'Tip 3-18: Explain the relationship between domain interfaces and their technical realization!'
section: '03'
category: context
source_url: https://docs.arc42.org/tips/3-18/
source_author: Dr. Gernot Starke
source_contributors: []
license: CC BY-SA 4.0
source_revision: 3cb35782b62d0cd4103aedcc75fc4ba748f043ad
tags:
  - context
  - interface
---

> Source: [Tip 3-18: Explain the relationship between domain interfaces and their technical realization!](https://docs.arc42.org/tips/3-18/) — © 2016–2023 Dr. Gernot Starke; CC BY-SA 4.0.


In case your domain interfaces are realized in the technical
infrastructure through different technical channels, protocols or
interfaces, you should explicitely describe the mapping between
those two _areas_.

A simple example of such a situation can be found in the diagram below.
The relationships (mapping) can easily be described with a table:

| Domain interface        | Technical implementation |  
|-------------------------|---------------------|
| brake interrupt, driver override, rounds per-minute, throttle valve, positions         | CAN bus             |
| User commands          | Switches, keys, levers in cockpit     |
| Status information      | Audio output, display in cockpit  |



![context diagram for mapping](https://docs.arc42.org/assets/images/sections/03/context-for-mapping.webp)
