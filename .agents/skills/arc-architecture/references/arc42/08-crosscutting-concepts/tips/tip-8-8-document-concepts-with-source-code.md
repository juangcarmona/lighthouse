---
kind: tip
id: 8-8
title: 'Tip 8-8: Document concepts with source code!'
section: '08'
category: concepts
source_url: https://docs.arc42.org/tips/8-8/
source_author: Dr. Gernot Starke
source_contributors: []
license: CC BY-SA 4.0
source_revision: 3cb35782b62d0cd4103aedcc75fc4ba748f043ad
tags:
  - concept
  - source-code
  - example
  - test
---

> Source: [Tip 8-8: Document concepts with source code!](https://docs.arc42.org/tips/8-8/) — © 2016–2023 Dr. Gernot Starke; CC BY-SA 4.0.


>"Teaching by precept is a long road, but short and beneficial is the way by example."
(quote by <a target="_blank" rel="noopener noreferrer nofollow" href="https://en.wikiquote.org/wiki/Seneca_the_Younger">Seneca the Younger</a>)

Quite often _developers_ will be consumers of arc42 concepts, and developers are
highly interested in getting stuff done. They need to know HOW they can or should
achieve their goals?

The most concrete way to answer such questions is... source code:

### Show selected unit tests
Unit tests have their prerequisites (in the setup methods) and their
assertions/consequences (in the assert statements) made explicit.

### Automate inclusion of code artifacts
 In the ideal case you include source code directly from your code repository,
your version control system (like Git or Subversion). That ensures your arc42
documentation always contains current, tested and correct code.

If your tools don't allow for automated inclusion, refer to relevant code
instead of copy/pasting it. Be careful - the more specific your references are
(i.e. to method names), the more likely to change.

### Don't copy/paste!

If everything fails - and you absolutely HAVE to copy/paste code, then
restrict to the most fundamental or important parts. Don't copy extensive
code fragments manually into your documentation.
