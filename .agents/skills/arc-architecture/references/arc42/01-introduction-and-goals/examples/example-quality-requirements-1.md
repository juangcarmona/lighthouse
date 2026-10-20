---
kind: example
id: quality-requirements-1
title: 'Quality Requirements Example: HTML Sanity Checker'
section: '01'
category: qualitygoals
source_url: https://docs.arc42.org/examples/quality-requirements-1/
source_author: Dr. Gernot Starke
source_contributors: []
license: CC BY-SA 4.0
source_revision: 3cb35782b62d0cd4103aedcc75fc4ba748f043ad
tags:
  - quality-requirements
  - example
---

> Source: [Quality Requirements Example: HTML Sanity Checker](https://docs.arc42.org/examples/quality-requirements-1/) — © 2016–2023 Dr. Gernot Starke; CC BY-SA 4.0.

> **Illustrative example:** The system-specific names, design choices, constraints, and facts below describe the source example only. Do not treat them as evidence about another system.


Some (simple) quality requirements (as scenarios), organized by priority in a table.

## 1.2 (example) Quality Requirements for HTML Sanity Checker


| Priority | Quality Goal |Scenario                                               |
|---|:---|:---|
| 1        | Correctness  |Every broken internal link (cross reference) is found. |
|---|---|---|
| 1        | Correctness  |Every potential semantic error is found and reported. In case of doubt[^doubt], report and let the user decide.  |
|---|---|---|
| 1        | Safety       |Content of the files to be checked is _never_ altered. |
|---|---|---|
| 2        | Flexibility  |Multiple checking algorithms, report formats and clients. At least Gradle and command-line have to be supported.|
|---|---|---|
| 2        | Correctness  |Correctness of every checker is automatically tested for positive AND negative cases.|
|---|---|---|
| 3        | Performance  |Check of 100kB html file performed under 10 secs (excluding Gradle startup)|
|---|---|---|

[^doubt]: Especially when checking external links, the correctness of links depends on external factors, like network availability, latency or server configuration, where HtmlSC cannot always identify the root cause of potential problems.
