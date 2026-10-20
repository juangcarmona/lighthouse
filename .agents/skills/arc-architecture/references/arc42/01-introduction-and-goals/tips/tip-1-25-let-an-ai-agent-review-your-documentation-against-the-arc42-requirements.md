---
kind: tip
id: 1-25
title: 'Tip 1-25: Let an AI agent review your documentation against the arc42 requirements!'
section: '01'
category: requirements
source_url: https://docs.arc42.org/tips/1-25/
source_author: Dr. Gernot Starke
source_contributors: []
license: CC BY-SA 4.0
source_revision: 3cb35782b62d0cd4103aedcc75fc4ba748f043ad
tags:
  - requirement
  - review
  - tooling
  - ai
  - agents
  - llm
---

> Source: [Tip 1-25: Let an AI agent review your documentation against the arc42 requirements!](https://docs.arc42.org/tips/1-25/) — © 2016–2023 Dr. Gernot Starke; CC BY-SA 4.0.


A newer class of tools uses LLM-based agents to check arc42 documentation
section by section against what arc42 expects. This complements, rather than
replaces, a human review.

One example is [arc42agentic](https://github.com/matthiasnissen/arc42agentic),
an open-source agent system you can use with agentic coding assistants (e.g.
VS Code with GitHub Copilot, or via [APM](https://microsoft.github.io/apm/getting-started/quick-start/)).
It reviews each section against the arc42 requirements, and additionally runs
cross-section consistency checks: do your quality goals (section 1)
match your solution strategy (section 4)? Does your context (section 3) match
your building blocks (section 5)?

This isn't specific to section 1: the same approach applies across all
twelve sections.

> Note: treat the output as a structured first review, not a replacement for
> your own judgement. Apply the same scrutiny you'd give any LLM output.
