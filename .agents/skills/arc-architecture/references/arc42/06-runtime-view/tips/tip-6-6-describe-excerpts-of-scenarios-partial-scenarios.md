---
kind: tip
id: 6-6
title: 'Tip 6-6: Describe excerpts of scenarios (partial scenarios)!'
section: '06'
category: runtime
source_url: https://docs.arc42.org/tips/6-6/
source_author: Dr. Gernot Starke
source_contributors: []
license: CC BY-SA 4.0
source_revision: 3cb35782b62d0cd4103aedcc75fc4ba748f043ad
tags:
  - runtime-view
  - scenario
  - sequence-diagram
---

> Source: [Tip 6-6: Describe excerpts of scenarios (partial scenarios)!](https://docs.arc42.org/tips/6-6/) — © 2016–2023 Dr. Gernot Starke; CC BY-SA 4.0.


We have seen too many sequence diagrams resembling the one below: Scenarios that
just propagate date over several participants - usually non-interesting stuff.


![boring sequence diagram](https://docs.arc42.org/assets/images/sections/06/long-and-mostly-boring.png){:width="40%"}


## More effective: Partial scenarios

Describe only excerpts or parts of such scenarios.

* Focus on risky, difficult, complicated or interesting parts.
* Don't hesitate to start right in the middle of a longer (overall) process
* Cut out boring, standard, simple of straightforward stuff

Compare the (compact) diagram below with the (boring and much longer) version above.


![(partial) sequence diagram](https://docs.arc42.org/assets/images/sections/06/short-and-interesting.png){:width="30%"}


Btw: both diagrams were generated from a PlantUML textual description, the code for
the latter is given below:

```PlantUML
@startuml
note right of F: before start, a1-a5 have completed
F -> G : start
G -> G : init
G -> H : create()
G <--H : X
G -> I : authorize( X )
I -> L : check(X)
I <--H : ok
G -> I : foo(X, H)
I --> G : completed
note right of G: G return result to A

@enduml
```
