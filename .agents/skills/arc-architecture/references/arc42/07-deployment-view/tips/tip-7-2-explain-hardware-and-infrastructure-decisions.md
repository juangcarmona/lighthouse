---
kind: tip
id: 7-2
title: 'Tip 7-2: Explain hardware and infrastructure decisions!'
section: '07'
category: deployment
source_url: https://docs.arc42.org/tips/7-2/
source_author: Dr. Gernot Starke
source_contributors: []
license: CC BY-SA 4.0
source_revision: 3cb35782b62d0cd4103aedcc75fc4ba748f043ad
tags:
  - deployment-view
  - hardware
  - decision
---

> Source: [Tip 7-2: Explain hardware and infrastructure decisions!](https://docs.arc42.org/tips/7-2/) — © 2016–2023 Dr. Gernot Starke; CC BY-SA 4.0.


Deployment- or infrastructure diagrams support overall understanding of the underlying hardware.

In addition to this overview it is useful to understand the reasoning behind the hardware
decisions, the selection of specific machines, processors or other devices.

If hardware plays an important role in the architecture, you can even use a node-template
for that purpose, similar to the following table:

#### Node &lt;node-name>

|Responsibility| what is the role of this hardware element, what's it doing? |
|(technical) characteristics| i.e. nr of cpus/cores, memory, throughput, nr-of-ports, vendor, model... |
|associated building blocks | what part of the software is running on this hardware? |
|reason for selection | why was this particular hardware selected? |
