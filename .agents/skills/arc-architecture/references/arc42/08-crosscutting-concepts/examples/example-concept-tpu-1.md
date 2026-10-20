---
kind: example
id: concept-tpu-1
title: 'Example Concept: TrafficPursuitUnit Domain Entity Model'
section: '08'
category: concepts
source_url: https://docs.arc42.org/examples/concept-tpu-1/
source_author: Dr. Gernot Starke
source_contributors: []
license: CC BY-SA 4.0
source_revision: 3cb35782b62d0cd4103aedcc75fc4ba748f043ad
tags:
  - concept
  - example
---

> Source: [Example Concept: TrafficPursuitUnit Domain Entity Model](https://docs.arc42.org/examples/concept-tpu-1/) — © 2016–2023 Dr. Gernot Starke; CC BY-SA 4.0.

> **Illustrative example:** The system-specific names, design choices, constraints, and facts below describe the source example only. Do not treat them as evidence about another system.


<p></p>

## 8. Crosscutting Concepts

### 8.1 Domain Entity Model 

![Fig. 8.1: Domain Entity Model](https://docs.arc42.org/assets/images/examples/tpu/III81_DomainEntityModel.jpg)


| Term | Definition |
| :--- | :--- |
|Frame Interval	|the smallest period for data sampled by the TPU. It corresponds to the duration of one video frame, which is 40 milliseconds for a frequency of 25 videoframes per second |
|Distance Per Frame	|the distance (in millimeters) travelled during one frame|
|Distance Per Second	|the distance (in millimeters) travelled during one second |
|Pursuit Step	 |the measured and calculated data for one second within a pursuit. It consists of  pursuit duration, distance, current speed, current maximum violation.| 
|Pursuit Step File	|a file containing all pursuit steps |
|Pursuit File	|a file containing the video, the pursuit step file and the printout for one pursuit.|
|Pursuit Protocol	|second-by-second logging of the driven speed + pursuit summary |
|Sector	|a part of a complete pursuit | 
|Video Frame |one picture within a video stream. Usually we have 25 frames per second. |
