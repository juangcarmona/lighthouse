---
kind: example
id: solution-strategy-htmlsc-1
title: 'Example Solution Strategy: HTML Sanity Checker'
section: '04'
category: solutionstrategy
source_url: https://docs.arc42.org/examples/solution-strategy-htmlsc-1/
source_author: Dr. Gernot Starke
source_contributors: []
license: CC BY-SA 4.0
source_revision: 3cb35782b62d0cd4103aedcc75fc4ba748f043ad
tags:
  - solution-strategy
  - example
---

> Source: [Example Solution Strategy: HTML Sanity Checker](https://docs.arc42.org/examples/solution-strategy-htmlsc-1/) — © 2016–2023 Dr. Gernot Starke; CC BY-SA 4.0.

> **Illustrative example:** The system-specific names, design choices, constraints, and facts below describe the source example only. Do not treat them as evidence about another system.


<p></p>


<div class="arc42-example">
<br>
You need a brief summary and explanation of the fundamental solution ideas and strategies. 
These key ideas should be familiar to everyone involved in development and architecture.
<br>
Briefly explain how you achieve the most important quality requirements.
</div>

## 4. Solution Strategy

1. Implement HtmlSC mostly in the Groovy programming language and partially in Java
with minimal external dependencies.
2. We wrap this implementation into a Gradle plugin, so it can be used within
automated builds. Details are given in the
   <a target="_blank" rel="noopener noreferrer nofollow" href="https://docs.gradle.org/current/userguide/userguide.html">Gradle userguide</a>.
(The Maven plugin is still under development).
3. Apply the <a target="_blank" rel="noopener noreferrer nofollow" href="https://sourcemaking.com/design_patterns/template_method/"><em>template-method-pattern</em></a>
to enable:
  * multiple checking algorithms
  * both HTML (file) and text (console) output
4. Rely on standard Gradle and Groovy conventions for configuration, having a single configuration file.
  * For the Maven plugin, this might lead to problems.
