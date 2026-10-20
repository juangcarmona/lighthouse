---
kind: tip
id: 7-1
title: 'Tip 7-1: Document your technical infrastructure (hardware)!'
section: '07'
category: deployment
source_url: https://docs.arc42.org/tips/7-1/
source_author: Dr. Gernot Starke
source_contributors: []
license: CC BY-SA 4.0
source_revision: 3cb35782b62d0cd4103aedcc75fc4ba748f043ad
tags:
  - deployment-view
  - hardware
  - infrastructure
---

> Source: [Tip 7-1: Document your technical infrastructure (hardware)!](https://docs.arc42.org/tips/7-1/) — © 2016–2023 Dr. Gernot Starke; CC BY-SA 4.0.


Describe the technical infrastructure (aka the underlying hardware) the
system is running in. That shall include:

* nodes, i.e. processors, server, cluster... and their
* relations (channels), i.e. bus, network or wireless connections,
* additional hardware elements, i.e. firewall, router, switches, storage etc.

You could either use UML deployment diagrams or free-form graphics, like shown below:

![free-form graphic to describe technical infrastructure](https://docs.arc42.org/assets/images/sections/07/infrastructure-with-symbols.png)
(diagram by <a target="_blank" rel="noopener noreferrer nofollow" href="https://www.uml-diagrams.org/examples/web-application-network-diagram-example.html?context=depl-examples">UML-diagrams.org</a>)

In case your stakeholder like such graphical icons or symbols: use a consistent
set of such symbols with a _defined_ semantic!

### Delegate hardware documentation

Try to delegate the hardware and infrastructure documentation to the appropriate
stakeholders.
