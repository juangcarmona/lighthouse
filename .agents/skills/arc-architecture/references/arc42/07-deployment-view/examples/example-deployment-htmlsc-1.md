---
kind: example
id: deployment-htmlsc-1
title: 'Example Deployment View: HTML Sanity Checker'
section: '07'
category: deployment
source_url: https://docs.arc42.org/examples/deployment-htmlsc-1/
source_author: Dr. Gernot Starke
source_contributors: []
license: CC BY-SA 4.0
source_revision: 3cb35782b62d0cd4103aedcc75fc4ba748f043ad
tags:
  - deployment
  - example
---

> Source: [Example Deployment View: HTML Sanity Checker](https://docs.arc42.org/examples/deployment-htmlsc-1/) — © 2016–2023 Dr. Gernot Starke; CC BY-SA 4.0.

> **Illustrative example:** The system-specific names, design choices, constraints, and facts below describe the source example only. Do not treat them as evidence about another system.


<p></p>


## 7. Deployment View

![HTML Sanity Checker Deployment Overview](https://docs.arc42.org/assets/images/examples/htmlsc/7_1-deployment.png)


|Node / Artifact    | Description                                                |
|-------------------|------------------------------------------------------------|
|hsc plugin binary  |Compiled version of HtmlSC, including required dependencies.|
|-------------------|------------------------------------------------------------|
|hsc-development    |Development environment                                     |
|-------------------|------------------------------------------------------------|
|artifact repository|Global public _cloud_ repository for binary artifacts, similar to [mavenCentral](https://mvnrepository.com/) HtmlSC binaries are uploaded to this server.   |
|-------------------|------------------------------------------------------------|
|hsc user computer  |Where documentation is created and compiled to HTML.      |
|-------------------|------------------------------------------------------------|
|build.gradle       |Gradle build script configuring (among other things) the HtmlSC plugin. |
|-------------------|------------------------------------------------------------|

The three nodes (_computers_) shown in the diagram above are connected via Internet.

**Prerequisites**:

* HtmlSC developers need a Java development kit, Groovy, Gradle plus the JSoup
HTML parser.
* HtmlSC users need a Java runtime (> 1.6) plus a build file named `build.gradle`.
(within this documentation example we omitted the listing of the build script).
