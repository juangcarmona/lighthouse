---
kind: tip
id: 9-2
title: 'Tip 9-2: Document decision criteria!'
section: '09'
category: decisions
source_url: https://docs.arc42.org/tips/9-2/
source_author: Dr. Gernot Starke
source_contributors: []
license: CC BY-SA 4.0
source_revision: 3cb35782b62d0cd4103aedcc75fc4ba748f043ad
tags:
  - decision
  - criteria
  - stakeholder
  - essential
---

> Source: [Tip 9-2: Document decision criteria!](https://docs.arc42.org/tips/9-2/) — © 2016–2023 Dr. Gernot Starke; CC BY-SA 4.0.


Developers, architects and other stakeholders will take architecturally relevant decisions,
based upon various decision criteria.

Criteria on the other hand may have different priorities for different stakeholders.

Ask your stakeholder for their specific criteria concerning important decisions: Besides purely
technical criteria there might be organizational, formal, business-related or juristic (legal) criteria.

You can document importance/priorities either as numerical weight or in categories (i.a. A, B, C).

Below you find to hypothetical sets of decision criteria.

#### Example: Criteria for selection of web framework


| **ID** | **Criterion** | **Importance** |
|----------|-------------|-------------|
| C1 | Functionality: AJAX support, validation rules, i18n | must |
| C2 | High development velocity (compared to existing approach) | ? |
| C3 | Open source license, either Apache 2.0, MIT or CreativeCommons Sharelike 4.0 | must |
| C4 | Active developer community - alternatively: affordable professional support. | nice-to-have |

#### Example: Criteria how to implement complex business rules

| **ID** | **Criterion** | **Weight** (higher = more important) |
|======|========|============|
| C1 | integratable into Java applications, without Java-native or similar approaches | 100 |
| C2 | high rule-evaluation performance, at least 150 rule executions/second on 4 core I5/32GByte RAM | 100 |
| C3 | license fee below €10.000 and yearly maintenance cost below €1000 | 80 |
| C4 | modularization concept for rules (as we will have >1000 rules)| 90 |


### When taking decisions... try the Pugh matrix

You might try the <a target="_blank" rel="noopener noreferrer nofollow" href="https://www.decision-making-confidence.com/pugh-matrix.html">Pugh matrix</a>
for the actual decision-making process. No guarantee from our side...
