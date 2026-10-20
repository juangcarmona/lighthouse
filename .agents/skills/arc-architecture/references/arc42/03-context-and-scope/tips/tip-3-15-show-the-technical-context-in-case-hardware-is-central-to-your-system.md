---
kind: tip
id: 3-15
title: 'Tip 3-15: Show the technical context (in case hardware is central to your system)!'
section: '03'
category: context
source_url: https://docs.arc42.org/tips/3-15/
source_author: Dr. Gernot Starke
source_contributors: []
license: CC BY-SA 4.0
source_revision: 3cb35782b62d0cd4103aedcc75fc4ba748f043ad
tags:
  - context
  - technical-context
---

> Source: [Tip 3-15: Show the technical context (in case hardware is central to your system)!](https://docs.arc42.org/tips/3-15/) — © 2016–2023 Dr. Gernot Starke; CC BY-SA 4.0.


If hardware, processors, network, transmission-channels or buses are central to your system, you should document or specify these hardware and infrastructure of your system in the technical context.

Especially for integrated hardware/software systems (embedded systems) you almost always need a technical context diagram. 

![technical context from an automotive system](https://docs.arc42.org/assets/images/sections/03/technical-context-automotive.png)

The embedded systems context diagram above (especially on right side) is such an example.

However, it may also be important for information systems to show some aspects of hardware and infrastructure already in the context, e.g. for security issues (see the webshop example in [tip 3-10](https://docs.arc42.org/tips/3-10)).

>For information- or web-systems, data-warehouse or business-intelligence, the deployment view (arc42-section 7) is usually sufficient and a technical context is rarely needed.


## See also

* [Tip 3-10 (business- and technical context)](https://docs.arc42.org/tips/3-10)
