---
kind: tip
id: 6-8
title: 'Tip 6-8: Use activity diagrams with partitions to describe or specify runtime scenarios!'
section: '06'
category: runtime
source_url: https://docs.arc42.org/tips/6-8/
source_author: Dr. Gernot Starke
source_contributors: []
license: CC BY-SA 4.0
source_revision: 3cb35782b62d0cd4103aedcc75fc4ba748f043ad
tags:
  - runtime-view
  - scenario
  - activity-diagram
---

> Source: [Tip 6-8: Use activity diagrams with partitions to describe or specify runtime scenarios!](https://docs.arc42.org/tips/6-8/) — © 2016–2023 Dr. Gernot Starke; CC BY-SA 4.0.


Take a look at the following example - which shows the _modularization_ or _partitioning_
of an activity diagram.

![activity diagram with partitions](https://docs.arc42.org/assets/images/sections/06/activity-with-partition.png){:width="40%"}

The diagram above was rendered by PlantUML with the following code:

```PlantUML
@startuml
partition Checker {
  (*)  -> "check input"
    -->If "verbose?" then
  }

  partition Verbalizer {
     -> [Yes] "turn on\n verbosity"
  }

  partition Runner 
   --> "run\n command"


   else
     ->  [no] "run\n command"
     -> "finalize"
   Endif
     ->(*)

@enduml
```
