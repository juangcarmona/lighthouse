---
kind: tip
id: 3-1
title: 'Tip 3-1: Explicitly demarcate your system from its environment!'
section: '03'
category: context
source_url: https://docs.arc42.org/tips/3-1/
source_author: Dr. Gernot Starke
source_contributors: []
license: CC BY-SA 4.0
source_revision: 3cb35782b62d0cd4103aedcc75fc4ba748f043ad
tags:
  - context
  - external-interface
---

> Source: [Tip 3-1: Explicitly demarcate your system from its environment!](https://docs.arc42.org/tips/3-1/) — © 2016–2023 Dr. Gernot Starke; CC BY-SA 4.0.


Define "what's inside" your system and what's outside.

You should demarcate your system from other IT systems in order to show how it
fits into the existing IT environment, which external interfaces are offered or consumed
and what users or roles are using the system.

That way you show the scope of your system: what are the responsibilities
of your system and what are the responsibilities of its neighbor systems.

You find an example in the diagram below: It shows the context of a webshop which delegates the payment handling to an external provider (removing this
responsibility from the scope of the webshop).

![](https://docs.arc42.org/assets/images/sections/03/simple-context.png){:width="70%"}
