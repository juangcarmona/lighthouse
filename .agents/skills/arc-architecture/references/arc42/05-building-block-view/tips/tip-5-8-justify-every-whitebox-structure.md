---
kind: tip
id: 5-8
title: 'Tip 5-8: Justify every whitebox structure!'
section: '05'
category: building-block
source_url: https://docs.arc42.org/tips/5-8/
source_author: Dr. Gernot Starke
source_contributors: []
license: CC BY-SA 4.0
source_revision: 3cb35782b62d0cd4103aedcc75fc4ba748f043ad
tags:
  - building-block
  - whitebox
---

> Source: [Tip 5-8: Justify every whitebox structure!](https://docs.arc42.org/tips/5-8/) — © 2016–2023 Dr. Gernot Starke; CC BY-SA 4.0.


Every whitebox structure is the decomposition of a blackbox into smaller parts
(we call those _contained blackboxes_) plus their mutual dependencies or relationships.

In **every** whitebox you should briefly explain the reasons for the specific
decomposition or structure:

* Why does this whitebox consist of five blackboxes?
* Why does the contained blackbox A talk to B?

This information is sometimes called _design rationale_ for this specific whitebox.
