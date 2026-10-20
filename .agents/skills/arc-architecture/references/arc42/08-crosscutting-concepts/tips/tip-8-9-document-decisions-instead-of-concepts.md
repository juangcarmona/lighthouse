---
kind: tip
id: 8-9
title: 'Tip 8-9: Document decisions instead of concepts!'
section: '08'
category: concepts
source_url: https://docs.arc42.org/tips/8-9/
source_author: Dr. Gernot Starke
source_contributors: []
license: CC BY-SA 4.0
source_revision: 3cb35782b62d0cd4103aedcc75fc4ba748f043ad
tags:
  - concept
  - lean
---

> Source: [Tip 8-9: Document decisions instead of concepts!](https://docs.arc42.org/tips/8-9/) — © 2016–2023 Dr. Gernot Starke; CC BY-SA 4.0.


You can interpret concepts as special cases of architecture and/or design decisions
(see [arc42 section 9](https://docs.arc42.org/section-9/)).

```
if (extensive-explanation-required)
   then concept
   else decision
```

Even from a decision (in arc42 section 9) you can refer (or hyperlink) to
the corresponding source code (or even better, appropriate unit tests!). That's
sometimes sufficient for developers...
