---
kind: example
id: risk-htmlsc-1
title: 'Example Risk: HTML Sanity Checker'
section: '11'
category: risks
source_url: https://docs.arc42.org/examples/risk-htmlsc-1/
source_author: Dr. Gernot Starke
source_contributors: []
license: CC BY-SA 4.0
source_revision: 3cb35782b62d0cd4103aedcc75fc4ba748f043ad
tags:
  - risks
  - example
---

> Source: [Example Risk: HTML Sanity Checker](https://docs.arc42.org/examples/risk-htmlsc-1/) — © 2016–2023 Dr. Gernot Starke; CC BY-SA 4.0.

> **Illustrative example:** The system-specific names, design choices, constraints, and facts below describe the source example only. Do not treat them as evidence about another system.


<p></p>


## 11. Risks and Technical Debts


**Remark:** In our small example we don't see any _real_ risks for architecture and implementation.
Therefore the risks shown below are a bit artificial...

### 11.1 Technical risks

|Risk                            |Description                                |
|--------------------------------|-------------------------------------------|
|Bottleneck with access rights on public repositories |Currently only one single developer has access rights to deploy new versions of HtmlSC on public servers like Bintray or Gradle plugin portal.  |
| System relies on `gradle` - which may not be available on target computers| Although the Java Runtime is installed on many computers, it might not be available for every potential HtmlSC user. |  
|--------------------------------|-------------------------------------------|


### 11.2 Business or domain risks

|Risk                            |Description                                |
|--------------------------------|-------------------------------------------|
|System might become obsolete    |In case AsciiDoc or Markdown processors implement HTML checking natively, HtmlSC might become obsolete.                             |
|--------------------------------|--------------------------------------------|
