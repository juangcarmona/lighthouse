---
kind: tip
id: 6-9
title: 'Tip 6-9: Use a textual notation to describe runtime scenarios!'
section: '06'
category: runtime
source_url: https://docs.arc42.org/tips/6-9/
source_author: Dr. Gernot Starke
source_contributors: []
license: CC BY-SA 4.0
source_revision: 3cb35782b62d0cd4103aedcc75fc4ba748f043ad
tags:
  - runtime-view
  - scenario
  - lean
---

> Source: [Tip 6-9: Use a textual notation to describe runtime scenarios!](https://docs.arc42.org/tips/6-9/) — © 2016–2023 Dr. Gernot Starke; CC BY-SA 4.0.


Our suggestion for development teams: Use [PlantUML](https://plantuml.com/)
to describe or specify runtime scenarios. It has a lightweigth textual syntax (DSL) for sequence
and activity diagrams - easy to understand and a lean option for discussing and visualizing
activities and processes.


```PlantUML
@startuml
skinparam componentStyle uml2

actor Admin
participant "Import\nHandler" as IH
participant "ftp-in" as ftp
participant "Optical\nArchive" as OA
participant "Data\nManagement" as DM
participant "Error\nHandler" as EH

Admin -> IH: import( m )
IH -> Configuration: getMandatorCfg
IH -> ftp: readFile
ftp --> IH: file
IH -> OA : storeFile(file)
IH -> IH: setupFilterChain
IH -> IH: unzip(file)
IH -> IH: decrypt(uzFile)

alt parse file
loop all records
IH -> IH: parse record
IH -> DM : store client
else record error
IH -> EH: log record error
end
else file error
IH -> EH: log file error
end

@enduml
```

The (rendered) diagram from this textual description is shown below:

![rendered sequence diagram from this textual description](https://docs.arc42.org/assets/images/sections/06/textual-sequence.png){:width="50%"}

## Text is easier for developer

Such textual descriptions (a DSL for scenarios) resemble source code -
which is often easy for developers to create and maintain.

They can:

* use this DSL to sketch and discuss variants of scenarios
* maintain the textual representations in common versioning tools (git, subversion etc), with
the established branching and merging options
* in case such scenarios are (later...) implemented in source code, the diagrams might be deleted,
which will result in leaner documentation (see [tip 6-5 (scenarios for discussion, not documentation)](https://docs.arc42.org/tips/6-5)).
