---
kind: tip
id: 7-7
title: 'Tip 7-7: Use tables to document software/hardware mapping!!'
section: '07'
category: deployment
source_url: https://docs.arc42.org/tips/7-7/
source_author: Dr. Gernot Starke
source_contributors: []
license: CC BY-SA 4.0
source_revision: 3cb35782b62d0cd4103aedcc75fc4ba748f043ad
tags:
  - deployment-view
  - lean
---

> Source: [Tip 7-7: Use tables to document software/hardware mapping!!](https://docs.arc42.org/tips/7-7/) — © 2016–2023 Dr. Gernot Starke; CC BY-SA 4.0.


As a (simple) alternative to graphical mapping with deployment
diagrams (see [tip 7-6 (deployment diagrams)](https://docs.arc42.org/tips/7-6)), you could
use tables to document or specify deployment of software on hardware.

|Server| Artifact |Remark|
|------|-----------|-----|
|OneServer| |A docker container, requiring at least Docker V 12.1 |
| |DomainServices |auto-deployed by Gradle build script|
| | | |
|OtherServer | |Dell(c) Server, Quad-Core i7 CPU, 64GB RAM, running RH Enterprise Linux |
| |Articles |Unix executable, build by make, executed via cron |
| |FooBar |Java jar, build, deployed and executed via Gradle build script  |
| |CassandraDB |Open source database, started via cron |

Please find the corresponding diagram below:


![deployment diagram](https://docs.arc42.org/assets/images/sections/07/deployment-diagram.png){:width="60%"}
