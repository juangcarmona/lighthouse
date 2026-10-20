---
kind: tip
id: 3-7
title: 'Tip 3-7:  If many external systems are involved, aggregate (cluster) them by explicit criteria!'
section: '03'
category: context
source_url: https://docs.arc42.org/tips/3-7/
source_author: Dr. Gernot Starke
source_contributors: []
license: CC BY-SA 4.0
source_revision: 3cb35782b62d0cd4103aedcc75fc4ba748f043ad
tags:
  - context
  - cluster
  - criteria
---

> Source: [Tip 3-7:  If many external systems are involved, aggregate (cluster) them by explicit criteria!](https://docs.arc42.org/tips/3-7/) — © 2016–2023 Dr. Gernot Starke; CC BY-SA 4.0.


If your system interacts with many external systems, you can combine several of
these external systems by explicit criteria. You should explicitly state these
criteria. Such criteria may include systems:

* share common or similar data
* communicate within the same use case or at the same time
* communicate using identical or similar technologies (e.g. categorized by ftp- and WebService)
* belong to the same or similar organization, such as: all systems of garages, insurances, glass manufacturing and tax advisors
* have similar domain or technical tasks to solve (all systems printing documents, dealing with chip cards, etc.)

## Examples: With and without
The following diagram (the detailed version) shows three specific neighbour
systems, all stereotyped with the category << logistics >>.


![extensive context diagram](https://docs.arc42.org/assets/images/sections/03/context-extensive.png)

The next diagram groups these neighbours into one single "Logistics" external system
on the left, stereotyped as << category >>.


![compact context diagram](https://docs.arc42.org/assets/images/sections/03/context-compact.png)
