---
kind: tip
id: 1-15
title: 'Tip 1-15: Use examples to work out quality goals together with your stakeholders!'
section: '01'
category: requirements
source_url: https://docs.arc42.org/tips/1-15/
source_author: Dr. Gernot Starke
source_contributors: []
license: CC BY-SA 4.0
source_revision: 3cb35782b62d0cd4103aedcc75fc4ba748f043ad
tags:
  - requirement
  - quality
  - scenario
  - example
  - stakeholder
---

> Source: [Tip 1-15: Use examples to work out quality goals together with your stakeholders!](https://docs.arc42.org/tips/1-15/) — © 2016–2023 Dr. Gernot Starke; CC BY-SA 4.0.


Asking stakeholders "what are your quality requirements?" usually produces silence, or
buzzwords. Hardly anybody can write a measurable quality requirement from a blank page.

Reacting to one, though, is easy. Put a concrete example in front of people and they
will tell you immediately that the number is far too high, that this particular quality
does not matter for their system at all, or that you have just hit the one thing they
really care about. That reaction is the requirement - you only have to write it down.

![Three steps: show a real example, let stakeholders react, rewrite it as your own - repeating for the next quality goal](https://docs.arc42.org/assets/images/sections/01/quality-example-loop.svg)

The [arc42 quality model](https://quality.arc42.org) gives you the raw material for this:
around 150 example requirements, plus some 190 quality characteristics to help you find
the right term in the first place.

Take one that is roughly in the area you want to discuss, for example:

<div class="arc42-example" markdown="1">

**Requirement.** All automated unit tests for a subsystem must execute quickly enough to
give developers rapid feedback.

**Acceptance criteria**

* All unit tests for a subsystem complete in less than 180 seconds
* Test execution time is measured on standard CI/CD infrastructure

<small>from <a target="_blank" rel="noopener noreferrer nofollow" href="https://quality.arc42.org/requirements/quick-unit-tests">Q42, "Quick unit tests"</a></small>

</div>

Then let your stakeholders argue with the numbers. Keep the structure, replace the context
and the thresholds with theirs, and you have a quality requirement that is specific,
measurable, and actually agreed on.

See [tip 1-12](https://docs.arc42.org/tips/1-12/) for the anatomy of such scenarios, and [tip 1-24](https://docs.arc42.org/tips/1-24/)
for more on the quality model itself.
