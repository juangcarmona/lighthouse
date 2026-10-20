---
kind: tip
id: 6-7
title: 'Tip 6-7: Use activity diagrams with swimlanes to describe or specify runtime scenarios!'
section: '06'
category: runtime
source_url: https://docs.arc42.org/tips/6-7/
source_author: Dr. Gernot Starke
source_contributors: []
license: CC BY-SA 4.0
source_revision: 3cb35782b62d0cd4103aedcc75fc4ba748f043ad
tags:
  - runtime-view
  - scenario
  - activity-diagram
---

> Source: [Tip 6-7: Use activity diagrams with swimlanes to describe or specify runtime scenarios!](https://docs.arc42.org/tips/6-7/) — © 2016–2023 Dr. Gernot Starke; CC BY-SA 4.0.


>A swimlane is a way to group activities performed by the same actor on an activity diagram or to group activities in a single thread (Quote by [Scott Ambler](https://www.agilemodeling.com/style/activityDiagram.htm))

Swimlanes are standard (UML) option to group activities by actor or building block (or thread, see quote above).
They lead to _partitioned_ activity diagrams, either horizontally or vertically.

They are very easy to use, even with pen and paper.

You find an example below - where the activities performed by each of the building blocks
are grouped by (vertical) swimlanes.

![activity diagram with swimlanes](https://docs.arc42.org/assets/images/sections/06/activity-with-swimlane.png){:width="50%"}

The diagram above was rendered by PlantUML with the following code:

```PlantUML
@startuml
|GUI|
start
:enter-data;
|Core-Domain|
:validate-address;
:validate-credit-card;
|Email-Provider|
:send-optin-mail;
:validate-smtp-return;
|Core-Domain|
:prepare-welcome-\npackage;
|GUI|
:display-success-message;
stop
@enduml
```

## A note on tooling

PlantUML (as of February 2017) can only render vertical swimlanes.
  Depending on your needs, horizontal swimlanes might be better to understand - in wich case
  you need different tools.
