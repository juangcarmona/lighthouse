---
kind: tip
id: 10-6
title: 'Tip 10-6: Consider change (quality) scenarios!!'
section: '10'
category: quality
source_url: https://docs.arc42.org/tips/10-6/
source_author: Dr. Gernot Starke
source_contributors: []
license: CC BY-SA 4.0
source_revision: 3cb35782b62d0cd4103aedcc75fc4ba748f043ad
tags:
  - quality
  - quality-scenario
  - scenario
---

> Source: [Tip 10-6: Consider change (quality) scenarios!!](https://docs.arc42.org/tips/10-6/) — © 2016–2023 Dr. Gernot Starke; CC BY-SA 4.0.


Apart from [usage or application scenarios (see tip 10-5](https://docs.arc42.org/tips/10-5)) you should consider changes
or modifications for quality requirements. This covers arbitrary change requests, like:

* additions or modifications of functional requirements (i.e. modified calculation or validation rules)
* adaption to modified quality requirements (i.e. improved performance or throughput requirements)
* reaction to changes service-level agreements

Such change scenarios cover the important quality goals of maintainability, modifiability, changeability or flexibility.

Some examples:

* Integration of a new (external) payment provider is possible within a maximum of two person-weeks.
* The data format of the yearly booking report can be adapted to the statuory (legal) requirements within 80 person hours.
* The system must be usable with the database systems DB2, Oracle and MySQL without source code modifications.
