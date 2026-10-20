---
kind: example
id: deployment-1
title: 'Example Deployment View: Traffic Pursuit Unit'
section: '07'
category: deployment
source_url: https://docs.arc42.org/examples/deployment-1/
source_author: Dr. Gernot Starke
source_contributors: []
license: CC BY-SA 4.0
source_revision: 3cb35782b62d0cd4103aedcc75fc4ba748f043ad
tags:
  - deployment
  - example
---

> Source: [Example Deployment View: Traffic Pursuit Unit](https://docs.arc42.org/examples/deployment-1/) — © 2016–2023 Dr. Gernot Starke; CC BY-SA 4.0.

> **Illustrative example:** The system-specific names, design choices, constraints, and facts below describe the source example only. Do not treat them as evidence about another system.


<div class="arc42-example">
<br>
The example shows an Enterprise Architect (TM) deployment diagram to show the processors used to implement the complete functionality of the Traffic Pursuit Unit. Note the design decisions (i.e. the technology) for the channels connecting the processors.
</div>

## 7.1 Deployment View Level 1 (Traffic Pursuit Unit)

The following picture shows the inside of the TPU hardware, an industrial rack with the main PC-board and several other Printed Circuit Boards (PCBs).

![Deployment ViewLevel 1 of Traffic Pursuit Unit](https://docs.arc42.org/assets/images/examples/tpu/71-HardwareVonOben.webp)


## 7.1 Deployment Level 1
The following UML diagram shows this hardware structure.


![Deployment ViewLevel 1 of Traffic Pursuit Unit](https://docs.arc42.org/assets/images/examples/tpu/71-Infrastructure.webp)

### 1. MeasuringUnit Node

This node mainly consists of a base PCB on which the MU-CPU-BOARD, the GPS Receiver module and the multiplexer are mounted.

**MU-CPU-Board**

* CPU: ARM processor 200 MIIPS at 180 Mhz
* multiple RS232 lines with speeds up to 115Kbaud



**Keyboard Switch**

forwards the keyboard input either to the MU-CPU-Board or the PC-board, depending on the operating mode of the MeasuringUnit. In stand-alone mode the user input is handled in the MeasuringUnit. In video-mode it is handled by the PC-Board.


**GPS receiver**

transforms the GPS antenna signal into location information forwarded to the MU-CPU-Board.

* binary SIRF protocol or NMEA protocol


### 2. PC-Board

is the central processoror of the TPU, mainly controlling all video functions of the system and storing relevant results.

* CPU: Intel CPU xx cores,
* running RT debian Linux
* multiple RS232 lines with speeds up to 115Kbaud


### 3. Video Cards

This node contains all hardware for video processing. Its details are described in the next chapter.
