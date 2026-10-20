---
kind: tip
id: 5-21
title: 'Tip 5-21: Describe or specify internal interfaces with minimal effort!'
section: '05'
category: building-block
source_url: https://docs.arc42.org/tips/5-21/
source_author: Dr. Gernot Starke
source_contributors: []
license: CC BY-SA 4.0
source_revision: 3cb35782b62d0cd4103aedcc75fc4ba748f043ad
tags:
  - building-block
  - interface
  - lean
---

> Source: [Tip 5-21: Describe or specify internal interfaces with minimal effort!](https://docs.arc42.org/tips/5-21/) — © 2016–2023 Dr. Gernot Starke; CC BY-SA 4.0.


Describe or specify internal interfaces with minimal effort:
You can find arbitrary interface details in source code,
if you need to.

Be especially careful with graphical interface descriptions
(like UML).

Take a look at the following diagram, where `Blurp`
provides a method/service `blurp` for the consumer `FooBar`.

![simple interface description diagram](https://docs.arc42.org/assets/images/sections/05/interface-simple-variant.png){:width="55%"}


You may add further details to this simple graphical model,
a few options given below (with increasing effort).

1. You don't explain this interface, as you know the corresponding source code is understandable or simple enough
2. You explain the semantics of using this interface, i.e.
business processes handled by the interface, business or technical consequences of this interface, potential side-effects
3. You explain return type and parameters of the call (assuming
  synchronous interaction)
4. You additionally describe quality attributes that are required
or provided at this interface, i.e.:
  * `Blurp` can process 10 requests per second, or
  * `Blurp` can only be invoked sequentially.
  * calling `Blurp` by multiple clients will lead to runtime exceptions.


## See also

* [Tip 5-22 (document interfaces with unit-tests)](https://docs.arc42.org/tips/5-22)
