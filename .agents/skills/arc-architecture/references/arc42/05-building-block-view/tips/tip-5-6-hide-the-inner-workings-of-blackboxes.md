---
kind: tip
id: 5-6
title: 'Tip 5-6: Hide the inner workings of blackboxes!'
section: '05'
category: building-block
source_url: https://docs.arc42.org/tips/5-6/
source_author: Dr. Gernot Starke
source_contributors: []
license: CC BY-SA 4.0
source_revision: 3cb35782b62d0cd4103aedcc75fc4ba748f043ad
tags:
  - building-block
  - blackbox
  - lean
  - essential
---

> Source: [Tip 5-6: Hide the inner workings of blackboxes!](https://docs.arc42.org/tips/5-6/) — © 2016–2023 Dr. Gernot Starke; CC BY-SA 4.0.


Blackboxes respect the information hiding principle: To use a black box,
you only need to know its responsibility and its input and output interfaces.
Additional details from its inner workings are (usually) not required.

This concealment provides a number of advantages:

* You can change or modify the inner workings, without users (clients, consumers)
needing to adapt to those changes.
* You might refrain from documenting the whitebox of this building block.
That can reduce the maintenance effort of your documentation.
* Eventually you reduce the level of details that some stakeholders have to consider or know.

In extreme cases you restrict the building block view to level-1
(see [tip 5-3 ('level-1 is your friend')](https://docs.arc42.org/tips/5-3)),
the whitebox of the overall system - without detailling any of the
top-level building blocks.

### Information sometimes required

According to "blackbox-theory", knowing the responsibility and
interface of such a blockbox is sufficient. But in reality, sometimes
additional properties of such a building-block are required -
for example runtime- or deployment properties or other kinds
of qualities.

Let's consider a simple blackbox - the square-root function (short "sqrt")
has a very simple interface ("API"):

`sqrt( number ) -> number`

where number > 0.

For a sqrt-blackbox the following several other properties might be
important:

* what precision does our sqrt-blackbox provide, how many digits will
it deliver. ("Correctness")
* are all users allowed to use sqrt, or is our sqrt restricted
to specific users ("Authorization")
* can our sqrt-function be called by many parallel users
("parallelism, multi-user-capability")
* will usage of our sqrt-function cost money
* how fast will our function deliver its results ("performance efficiency")

From the examples you see that several "Qualities" might be relevant
for your blackboxes.
