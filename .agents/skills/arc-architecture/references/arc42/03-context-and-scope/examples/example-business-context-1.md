---
kind: example
id: business-context-1
title: 'Example Business Context: HTML Sanity Checker'
section: '03'
category: business-context
source_url: https://docs.arc42.org/examples/business-context-1/
source_author: Dr. Gernot Starke
source_contributors: []
license: CC BY-SA 4.0
source_revision: 3cb35782b62d0cd4103aedcc75fc4ba748f043ad
tags:
  - context
  - example
---

> Source: [Example Business Context: HTML Sanity Checker](https://docs.arc42.org/examples/business-context-1/) — © 2016–2023 Dr. Gernot Starke; CC BY-SA 4.0.

> **Illustrative example:** The system-specific names, design choices, constraints, and facts below describe the source example only. Do not treat them as evidence about another system.


<div class="arc42-example">
<br>
This is a very simple example, created with Enterprise Architect(TM).
</div>

## 3. Context View

![Business context](https://docs.arc42.org/assets/images/examples/htmlsc/3-hsc-business-context.png)


|Neighbor  |Description |
|------|:-----|
|user         |documents software with toolchain that generates html. Wants to ensure that links within this HTML are valid.     |
|-----|---------|
|build system      |mostly <a target="_blank" rel="noopener noreferrer nofollow" href="https://gradle.org">Gradle</a>               |
|------|---------|
|local HTML files  |HtmlSC reads and parses local HTML files and performs sanity checks within those.                                |
|------|---------|
|local image files |HtmlSC checks if linked images exist as (local) files.     |
|------|---------|
|external web resources |HtmlSC can be configured to optionally check for the existence of external web resources. 
**Risk**: Due to the nature of web systems and the involved remote network operations, this check might need significant time and might yield invalid results due to network and latency issues.  |
