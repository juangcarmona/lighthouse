---
kind: tip
id: 5-14
title: 'Tip 5-14: Explain where to find the source code of your building blocks!'
section: '05'
category: building-block
source_url: https://docs.arc42.org/tips/5-14/
source_author: Dr. Gernot Starke
source_contributors: []
license: CC BY-SA 4.0
source_revision: 3cb35782b62d0cd4103aedcc75fc4ba748f043ad
tags:
  - building-block
  - source-code
  - mapping
---

> Source: [Tip 5-14: Explain where to find the source code of your building blocks!](https://docs.arc42.org/tips/5-14/) — © 2016–2023 Dr. Gernot Starke; CC BY-SA 4.0.


In case your mapping of source code to building-blocks is non-trivial,
your arc42 documentation should explicitly state where to find the sources.

* In case you stick to [Tip 5-15 (building-blocks aligned with directory structure)](https://docs.arc42.org/tips/5-15), you only need to document or specify the root directory
of your source code repository. Further details will result from this root directory.
* In case your source code is managed in different repositories (e.g. different git or subversion repositories), you should add a link to these repositories
on the level-1 building blocks.
* In case your source code is distributed over several directories, you might
document the location of your 2-3 most important source artifacts per building block.

>NEVER fall into the trap of listing **all** code artifacts for any whitebox,
as that information is so volatile...
