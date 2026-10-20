---
kind: example
id: quality-htmlsc-2
title: 'Example Quality Scenarios: HTML Sanity Checker'
section: '10'
category: quality
source_url: https://docs.arc42.org/examples/quality-htmlsc-2/
source_author: Dr. Gernot Starke
source_contributors: []
license: CC BY-SA 4.0
source_revision: 3cb35782b62d0cd4103aedcc75fc4ba748f043ad
tags:
  - quality
  - example
---

> Source: [Example Quality Scenarios: HTML Sanity Checker](https://docs.arc42.org/examples/quality-htmlsc-2/) — © 2016–2023 Dr. Gernot Starke; CC BY-SA 4.0.

> **Illustrative example:** The system-specific names, design choices, constraints, and facts below describe the source example only. Do not treat them as evidence about another system.


<p></p>


### 10.2 Quality Scenarios 

|ID     |Description                              |
|-------|-----------------------------------------|
|10.2.1 |Every broken internal link will be found. |  
|-------|-----------------------------------------|
|10.2.2 |Every missing (local) image will be found.|
|-------|-----------------------------------------|
|10.2.3 |Correctness of all checks is ensured by automated positive and negative tests. |
|-------|-----------------------------------------|
|10.2.4 |The results-report must contain _all_ results (aka findings) |
|-------|-----------------------------------------|
|10.2.5 |HtmlSC shall be extensible with new checking algorithms and new usage scenarios (i.e. from different build systems) |
|-------|-----------------------------------------|
|10.2.6 |HtmlSC leaves its source files completely intact: Content of files to be checked will _never_ be modified.|
|-------|-----------------------------------------|
|10.2.7 |HtmlSC performs all checks on a 100kByte HTML file in less than 10 seconds.|
|-------|-----------------------------------------|
