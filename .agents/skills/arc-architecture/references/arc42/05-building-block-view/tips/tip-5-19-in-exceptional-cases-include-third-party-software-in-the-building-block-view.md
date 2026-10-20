---
kind: tip
id: 5-19
title: 'Tip 5-19: In exceptional cases include third-party software in the building block view!'
section: '05'
category: building-block
source_url: https://docs.arc42.org/tips/5-19/
source_author: Dr. Gernot Starke
source_contributors: []
license: CC BY-SA 4.0
source_revision: 3cb35782b62d0cd4103aedcc75fc4ba748f043ad
tags:
  - building-block
---

> Source: [Tip 5-19: In exceptional cases include third-party software in the building block view!](https://docs.arc42.org/tips/5-19/) — © 2016–2023 Dr. Gernot Starke; CC BY-SA 4.0.


_Usually_ the building block view shall contain only those elements
that are specifically created for the system.

In certain cases it can though be helpful (i.e. for better understandability)
to include third-party software (i.e. middleware, databases, libraries,
  frameworks, utilities) in the building block view.

The following diagram shows a whitebox from a HTML semantic analyser
software, where the (open-source, third-party) HTML parser
is absolutely essential for the system. Therefore its included in the building block view (lower left corner)

(In accordance with [tip 5-20 (indicate third-party elements)](https://docs.arc42.org/tips/5-20)
it has been marked with the stereotype `library` to better distinguish
it from the building blocks specific for the system itself.)


![whitebox from a HTML semantic analyser software with third party element](https://docs.arc42.org/assets/images/sections/05/third-party-element.png){:width="85%"}


## See also

* [tip 5-20 (indicate third-party elements)](https://docs.arc42.org/tips/5-20)
