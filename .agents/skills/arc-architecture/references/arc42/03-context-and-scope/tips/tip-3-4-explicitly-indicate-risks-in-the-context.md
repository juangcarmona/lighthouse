---
kind: tip
id: 3-4
title: 'Tip 3-4: Explicitly indicate risks in the context!'
section: '03'
category: context
source_url: https://docs.arc42.org/tips/3-4/
source_author: Dr. Gernot Starke
source_contributors: []
license: CC BY-SA 4.0
source_revision: 3cb35782b62d0cd4103aedcc75fc4ba748f043ad
tags:
  - context
  - risk
---

> Source: [Tip 3-4: Explicitly indicate risks in the context!](https://docs.arc42.org/tips/3-4/) — © 2016–2023 Dr. Gernot Starke; CC BY-SA 4.0.


Some examples of risks that you should point out clearly in the
context:

* Availability risk: if external systems influences the availability of your system.
* Cost risk: if using an external system is expensive, individual calls or other types of use cost money. Examples are credit card checks or payment/booking services.
* Security risks: if you receive/send sensible data from/to external systems. That could make these interfaces particularly interesting for a potential attacker.
* Volatility (high probability of change) of external systems: if interfaces of external systems change often (they are "work in progress"). The syntax and semantics of the transmitted data could be changed on short notice, which means that you either have effort adapting to these changes or you need to develop a flexible consumer for these interfaces.
* Complexity risks: if using this interface is exceptionally complex or difficult, because it might have complex data structures, uses esoteric frameworks, complicated handshakes or an arbitrary mixture of those.
* Operational risks: if operating/administering the interface is especially difficult or requires
high manual effort.


See the following example, where a risk is explicitly marked with a red label:

![html sanity check context with 'checks external websites and resources' marked as risk](https://docs.arc42.org/assets/images/sections/03/context-with-risk.png)



### Options to document such risks

You can:

* use flashy colors or other visual means to indicate risk in the context diagram,
* use text color in the table explaining the diagram, or
* create an explicit risk-list for risks at external interfaces or neighbour systems
