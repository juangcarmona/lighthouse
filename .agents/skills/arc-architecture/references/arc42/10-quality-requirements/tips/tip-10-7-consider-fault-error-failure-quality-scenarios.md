---
kind: tip
id: 10-7
title: 'Tip 10-7: Consider fault/error/failure (quality) scenarios!!'
section: '10'
category: quality
source_url: https://docs.arc42.org/tips/10-7/
source_author: Dr. Gernot Starke
source_contributors: []
license: CC BY-SA 4.0
source_revision: 3cb35782b62d0cd4103aedcc75fc4ba748f043ad
tags:
  - quality
  - quality-scenario
  - scenario
---

> Source: [Tip 10-7: Consider fault/error/failure (quality) scenarios!!](https://docs.arc42.org/tips/10-7/) — © 2016–2023 Dr. Gernot Starke; CC BY-SA 4.0.


You surely know <a target="_blank" rel="noopener noreferrer nofollow" href="https://en.wikipedia.org/wiki/Murphy%27s_law">Murphys’ law</a>: Things will fail and errors will occur.

Use quality scenarios to document or specify what kinds/categories of such failures
or exceptions your system handles or has to handle.

Examples:

* The system recognizes within 60 seconds if an external payment provider becomes unavailable.
It will then notify an administrator within 60 seconds.
* In case of non-treatable application- or runtime exceptions the system will create appropriate
logging events, that allow to diagnose the error, but do not contain personal user
or account data (of data security category 2 or higher).
