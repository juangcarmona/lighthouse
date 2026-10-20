---
kind: tip
id: 8-5
title: 'Tip 8-5: Document business or domain models!'
section: '08'
category: concepts
source_url: https://docs.arc42.org/tips/8-5/
source_author: Dr. Gernot Starke
source_contributors: []
license: CC BY-SA 4.0
source_revision: 3cb35782b62d0cd4103aedcc75fc4ba748f043ad
tags:
  - concept
  - domain
---

> Source: [Tip 8-5: Document business or domain models!](https://docs.arc42.org/tips/8-5/) — © 2016–2023 Dr. Gernot Starke; CC BY-SA 4.0.


### Business or domain information is 'crosscutting'
Business or domain models or elements (data, activities, processes, services, tools, materials)
  will most often (and definitely should!) be reflected
within source code. For small or simple systems,
you might describe such elements within the building
block view... but:

Such business or domain elements will be referred-to from numerous building blocks,
and therefore be well-suited for a crosscutting topic.

Therefore: Document (explain, specify) business or domain models or elements within arc42 section 8.

### Domain Model and simple alternatives

In case you follow a <a target="_blank" rel="noopener noreferrer nofollow" href="https://en.wikipedia.org/wiki/Domain-driven_design">Domain-Driven Design</a> approach (DDD)
approach for design and development of your system, you will develop and evolve a statically and dynamically
expressive model of your domain, consisting of Entities, Aggregates, Services, Value-Objects and additional
patterns from DDD.

These elements and their relationships (the 'domain model') are the foundation of the so
called _ubiqitous language_, a core pillar of DDD.
Document this domain model in graphical form to give an overview.

There are some (simple) alternatives, if you cannot or don't want to follow the DDD methodology:

* (business or _logical_) data model: Restricted to the more statical aspects of the domain, one
of the software engineering classical models. See [tip 8-7 (data model)](https://docs.arc42.org/tips/8-7).
* (business or _logical_) process- or activity models: Which business element/stakeholder has which task to fulfill,
what things/tools/data do they need for this purpose, etc.
