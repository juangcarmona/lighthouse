---
kind: tip
id: 7-10
title: 'Tip 7-10: Leave hardware decisions to hardware-experts!'
section: '07'
category: deployment
source_url: https://docs.arc42.org/tips/7-10/
source_author: Dr. Gernot Starke
source_contributors: []
license: CC BY-SA 4.0
source_revision: 3cb35782b62d0cd4103aedcc75fc4ba748f043ad
tags:
  - deployment-view
  - lean
---

> Source: [Tip 7-10: Leave hardware decisions to hardware-experts!](https://docs.arc42.org/tips/7-10/) — © 2016–2023 Dr. Gernot Starke; CC BY-SA 4.0.


In case you are primarily concerned with _software_ architecture -
and there are different people in your organization caring about
hardware and technical infrastructure, leave the documentation
of this infrastructure to them.

Include only such information in the software architecture documentation
that's neccessary to understand the associated architecture decisions.

>I (Gernot) worked in several organizations that had contracted system operations
to (external) datacenters. These datacenters had their own methods and tools
for documentation, and quite often did not want to share many of their documents
with us software people... (I didn't like this organizational separation, as I prefer
dev-ops like integrated teams, but usually couldn't get rid of this
organizational constraint)
