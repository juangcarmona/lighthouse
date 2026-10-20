---
kind: tip
id: 6-11
title: 'Tip 6-11: Use sequence diagrams to describe or specify runtime scenarios!'
section: '06'
category: runtime
source_url: https://docs.arc42.org/tips/6-11/
source_author: Dr. Gernot Starke
source_contributors: []
license: CC BY-SA 4.0
source_revision: 3cb35782b62d0cd4103aedcc75fc4ba748f043ad
tags:
  - runtime-view
  - scenario
  - sequence-diagram
---

> Source: [Tip 6-11: Use sequence diagrams to describe or specify runtime scenarios!](https://docs.arc42.org/tips/6-11/) — © 2016–2023 Dr. Gernot Starke; CC BY-SA 4.0.


Use (UML) sequence diagrams for runtime scenarios. They clearly denote
the responsibility of all participating building blocks - which can help
in discussing building-blocks.

### Example

See the following example:


![short and interesting UML sequence diagram](https://docs.arc42.org/assets/images/sections/06/short-and-interesting.png){:width="30%"}


### Downside (and a suggestion)

When using graphical modeling tools, creating and managing sequence diagrams
might take up a lot of effort. You could speed up that process by using
a textual DSL (domain-specific language) to describe the sequences and have
somt tool render the diagrams for you.

The diagram above was rendered using the (free and open source)
<a target="_blank" rel="noopener noreferrer nofollow" href="https://plantuml.com/">PlantUML</a> with the following input:


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

### See also

See also [tip 6-5](https://docs.arc42.org/tips/6-5).
