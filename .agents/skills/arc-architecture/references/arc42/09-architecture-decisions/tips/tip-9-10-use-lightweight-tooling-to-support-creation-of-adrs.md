---
kind: tip
id: 9-10
title: 'Tip 9-10: Use lightweight tooling to support creation of ADRs'
section: '09'
category: decisions
source_url: https://docs.arc42.org/tips/9-10/
source_author: Dr. Gernot Starke
source_contributors: []
license: CC BY-SA 4.0
source_revision: 3cb35782b62d0cd4103aedcc75fc4ba748f043ad
tags:
  - decision
  - adr
  - tooling
---

> Source: [Tip 9-10: Use lightweight tooling to support creation of ADRs](https://docs.arc42.org/tips/9-10/) — © 2016–2023 Dr. Gernot Starke; CC BY-SA 4.0.


We propose to write ADRs in any lightweight tool, preferably any textual format like Markdown or AsciiDoc.
That will bring such decisions close to the development teams, where they ultimately belong!

Nat Pryce has created a (bash-based) <a target="_blank" rel="noopener noreferrer nofollow" href="https://github.com/npryce/adr-tools">open-source toolkit</a> for handling ADRs.
<a target="_blank" rel="noopener noreferrer nofollow" href="https://adr.github.io/#tooling">Ports exist to numerous other technologies</a> (Ansible, C#, Go, Java, Node etc)

For example, you can create a new ADR by simply typing

```
adr new Implement PDF creation in Go
```

Using the adr-tools, this command will create a new Markdown file and open it in your editor of choice.

Please consult the <a target="_blank" rel="noopener noreferrer nofollow" href="https://github.com/npryce/adr-tools">documentation</a> for further details.
