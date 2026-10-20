---
kind: example
id: overview-example-htmlsc-1
title: 'Overview Example: HTML Sanity Checker'
section: '01'
category: overview
source_url: https://docs.arc42.org/examples/overview-example-htmlsc-1/
source_author: Dr. Gernot Starke
source_contributors: []
license: CC BY-SA 4.0
source_revision: 3cb35782b62d0cd4103aedcc75fc4ba748f043ad
tags:
  - overview
  - example
---

> Source: [Overview Example: HTML Sanity Checker](https://docs.arc42.org/examples/overview-example-htmlsc-1/) — © 2016–2023 Dr. Gernot Starke; CC BY-SA 4.0.

> **Illustrative example:** The system-specific names, design choices, constraints, and facts below describe the source example only. Do not treat them as evidence about another system.


<div class="arc42-example">
<br>
The <i>HTML Sanity Checker</i> is an extremely simple and small system.
The overview is given as informal diagram with a brief textual explanation.
</div>

## 1. Introduction 


HtmlSanityCheck (HtmlSC) checks HTML for semantic errors, like broken links and missing images. 
It has been created to support authors who create HTML as output format.

Main goal is to support authors in avoiding errors within their (generated) HTML.


### 1.1 Overview for HTML Sanity Checker


1. Authors write in formats like <a target="_blank" rel="noopener noreferrer nofollow" href="https://asciidoctor.org/docs/what-is-asciidoc/">AsciiDoc</a>, <a target="_blank" rel="noopener noreferrer nofollow" href="https://www.daringfireball.net/projects/markdown/syntax">Markdown</a> or other formats, which are transformed to HTML by corresponding generators.
2. HtmlSC checks the generated HTML for broken links, missing images and other semantic issues.
3. HtmlSC creates a test report, similar to the well-known unit test report (see below).

![HtmlSC goal: Semantic checking of HTML pages](https://docs.arc42.org/assets/images/examples/htmlsc/1-1-overview.png)

The overall goal of HtmlSC is to create neat and clear reports, showing errors within HTML files. Below you find a example report.

![example Report](https://docs.arc42.org/assets/images/examples/htmlsc/1-1-sample-report.jpg)
