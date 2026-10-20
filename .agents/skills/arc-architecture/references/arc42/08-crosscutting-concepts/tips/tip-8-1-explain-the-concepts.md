---
kind: tip
id: 8-1
title: 'Tip 8-1: Explain the Concepts!'
section: '08'
category: concepts
source_url: https://docs.arc42.org/tips/8-1/
source_author: Dr. Gernot Starke
source_contributors: []
license: CC BY-SA 4.0
source_revision: 3cb35782b62d0cd4103aedcc75fc4ba748f043ad
tags:
  - concept
  - lean
  - essential
---

> Source: [Tip 8-1: Explain the Concepts!](https://docs.arc42.org/tips/8-1/) — © 2016–2023 Dr. Gernot Starke; CC BY-SA 4.0.


>Concepts often contain the most fundamental solution approaches. Understanding these concepts is prerequisite for understanding the architecture.

Concepts form the basis for _conceptual integrity_ (consistency, homogeneity) of the architecture.

They provide **stereotypical** solutions to recurring problems.

You can often save a lot of documentation effort by explaining concepts, instead of concentrating on building block details.

_Crosscutting_ means exactly what it says: a concept is not the property of any single
building block, but a decision that several of them share. That is why it does not belong
in any one building block description - it would have to be repeated in each of them.

![Three components side by side, with logging and security drawn as arrows running straight through all of them](https://docs.arc42.org/assets/images/sections/08/crosscutting-concerns-EN.svg)

A concept does not have to run through _every_ building block to be crosscutting -
spanning several of them is enough.

Find a few _potential_ topics for such crosscutting concepts in the following diagram:

![Examples of Crosscutting Concepts](https://docs.arc42.org/assets/images/sections/08/concepts-EN.drawio.png)
