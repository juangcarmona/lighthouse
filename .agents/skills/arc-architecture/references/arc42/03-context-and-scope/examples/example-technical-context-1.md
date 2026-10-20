---
kind: example
id: technical-context-1
title: 'Example Technical Context: HTML Sanity Checker'
section: '03'
category: technical-context
source_url: https://docs.arc42.org/examples/technical-context-1/
source_author: Dr. Gernot Starke
source_contributors: []
license: CC BY-SA 4.0
source_revision: 3cb35782b62d0cd4103aedcc75fc4ba748f043ad
tags:
  - context
  - example
---

> Source: [Example Technical Context: HTML Sanity Checker](https://docs.arc42.org/examples/technical-context-1/) — © 2016–2023 Dr. Gernot Starke; CC BY-SA 4.0.

> **Illustrative example:** The system-specific names, design choices, constraints, and facts below describe the source example only. Do not treat them as evidence about another system.


<div class="arc42-example">
<br>
This is a very simple example, created with Enterprise Architect(TM).
</div>

## 3. Context View

### 3.2 Technical Context

The following diagram shows the participating computers (nodes) with their technical connections plus the major artifacts of HtmlSC, the hsc-plugin-binary.

![Technical context](https://docs.arc42.org/assets/images/examples/htmlsc/3-hsc-technical-context.png)





|Node / Artifact   |Description                                           |
|------|--------|
|hsc-development   |where development of HtmlSC takes place               |
|------|--------|
|hsc-plugin-binary |compiled and packaged version of HtmlSC including required dependencies.|
|------|--------|
|artifact repository | A global public _cloud_ repository for binary artifacts, similar to [MavenCentral](https://search.maven.org/), the [Gradle Plugin Portal](https://plugins.gradle.com) or similar. HtmlSC binaries are uploaded to this server.          |
|------|--------|
|hsc user computer |where arbitrary documentation takes place with html as output formats.|
|------|--------|
|build.gradle      |Gradle build script configuring (among other things) the HtmlSC plugin to perform the HTML checking.  |
|------|--------|

For details see the deployment-view.
