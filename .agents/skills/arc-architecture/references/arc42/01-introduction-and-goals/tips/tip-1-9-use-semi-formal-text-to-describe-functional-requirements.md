---
kind: tip
id: 1-9
title: 'Tip 1-9: Use (semi) formal text to describe functional requirements!'
section: '01'
category: requirements
source_url: https://docs.arc42.org/tips/1-9/
source_author: Dr. Gernot Starke
source_contributors: []
license: CC BY-SA 4.0
source_revision: 3cb35782b62d0cd4103aedcc75fc4ba748f043ad
tags:
  - requirement
  - plantUML
  - activity-diagram
  - functional-requirement
---

> Source: [Tip 1-9: Use (semi) formal text to describe functional requirements!](https://docs.arc42.org/tips/1-9/) — © 2016–2023 Dr. Gernot Starke; CC BY-SA 4.0.


It might be useful to document some important functions, processes or features
in a semi-formal notation.


Consider the open-source PlantUML (https://plantuml.com/) as an example.
Given the following activity description, it can create a graphical version:

```PlantUML
@startuml
start
  :authenticate;

  :select product;

  if (private customer?) then (yes)
    :add\nVAT;
  else (no)
    :request\nVAT_ID;
  endif

  :create invoice;
stop

@enduml
```

Activities are described between: and;, branches can be read as pseudo code and
that way you combine the benefits of plain text with graphical representation.

PlantUML renders the code above to the following diagram:

![](https://docs.arc42.org/assets/images/sections/01/simple-activity.png){:width="40%"}
