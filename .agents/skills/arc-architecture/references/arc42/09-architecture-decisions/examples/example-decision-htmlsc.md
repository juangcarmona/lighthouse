---
kind: example
id: decision-htmlsc
title: 'Example Decision: HTML Sanity Checker'
section: '09'
category: decisions
source_url: https://docs.arc42.org/examples/decision-htmlsc/
source_author: Dr. Gernot Starke
source_contributors: []
license: CC BY-SA 4.0
source_revision: 3cb35782b62d0cd4103aedcc75fc4ba748f043ad
tags:
  - decision
  - example
---

> Source: [Example Decision: HTML Sanity Checker](https://docs.arc42.org/examples/decision-htmlsc/) — © 2016–2023 Dr. Gernot Starke; CC BY-SA 4.0.

> **Illustrative example:** The system-specific names, design choices, constraints, and facts below describe the source example only. Do not treat them as evidence about another system.


<p></p>


## 9. Architecture Decisions


### 9.1 Checking of external links postponed
In the current version of HtmlSC we won't check external links.
These checks have been postponed to later versions.



### 9.2 HTML Parsing with jsoup
To check HTML we parse it into an internal (DOM-like) representation.
For this task we use <a target="_blank" rel="noopener noreferrer nofollow" href="https://jsoup.org">Jsoup</a>, an open-source parser without
external dependencies.

To quote from their website:


>jsoup is a Java library for working with real-world HTML.
>It provides a very convenient API for extracting and manipulating data,
>using the best of DOM, CSS, and jQuery-like methods.


**Goals of this decision:**
Check HTML programmatically by using an existing API that provides access and finder
methods to the DOM-tree of the file(s) to be checked.

**Decision Criteria:**

* Few dependencies, so the HtmlSC binary stays as small as possible.
* Accessor and finder methods to easily locate images, links and link-targets within the DOM tree.

**Alternatives:**

* HTTPUnit: a testing framework for web applications and -sites. Its main focus is web testing and it suffers from a large number of dependencies.
* jsoup: a plain HTML parser without any dependencies (!) and a rich API to access all HTML elements in DOM-like syntax.


### 9.3 String Similarity Checking using <a class="headerlink" target="_blank" rel="noopener noreferrer nofollow" href="https://wikipedia.org/wiki/Jaro%E2%80%93Winkler_distance">Jaro-Winkler-Distance</a>

The small <a target="_blank" rel="noopener noreferrer nofollow" href="https://github.com/rrice/java-string-similarity">java string similarity library</a>
(by Ralph Allen Rice) contains implementations of several similarity-calculation algorithms.
As it is not available as public binary, we use the sources instead, primarily the classes in  

`net.ricecode.similarity.JaroWinklerStrategy`.
