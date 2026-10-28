<!-- pdac-scope: cited -->

# Execution design

The owner invokes one canonical GitHub workflow with route and issue. The host binds the request to the current default-branch revision, issue/owner answers and project-owned policy. Shared issue concurrency and reservations prevent concurrent publication. Replayed requests with retained receipts require inspection rather than an automatic retry.

The composition uses existing stage results. FF assesses Ready, prepares real OpenSpec artifacts and independently reviews the plan before implementation. Hotfix uses triage and a compact correction plan, writes only declared tests for RED, then preserves those tests while repairing production. The host reruns checks in a clean credential-free candidate.

A separate read-only Docker execution supplies engineering review through a different configured model. Its context includes original intent/answers, criteria, relevant authorities, actual before/after files, host checks and hotfix RED/test evidence. Host-generated bindings invalidate stale verdicts. Requested/resolved model settings are evidence of configuration; actual provider settings remain unknown unless reported through an authenticated source.

The model cannot supply its own authority or receipts. GitHub credentials remain in the trusted host, provider subprocesses receive a minimal environment, and the shared deadline cancels asynchronous engines/providers. Review can accept, request bounded correction or escalate. Deterministic checks and explicit human-only decisions remain binding.

A passing candidate becomes a draft PR. Separately delegated integration waits for current enforced checks and rechecks scope, policy, authority, source/head/base and mergeability. Integration evidence is retained on the existing protected branch; its reader authenticates the owner-dispatched composition and historical merge policy. Existing post-merge review and separately authorized release/deployment retain their roles.

The alternative of making the existing implement worker implicitly approve itself would combine execution and judgement and obscure merge authority. A new scheduler or evidence database is unnecessary: the existing workflow, artifacts, receipts and evidence branch already provide those responsibilities.

<!-- pdac:cite id="FR-FAST-FORWARD-DELIVERY" digest="sha256:cc98eedbd3f9938c82ea59e4f7499d90a1cf4cf52da707d740d9f24d800bec2e" -->
<!-- pdac:cite id="FR-HOTFIX-ROUTE" digest="sha256:09b863353e0b8f4fa61b6826e2eb3e754ef68ae5e092a84336306b95a3da43e3" -->
<!-- pdac:cite id="BR-STAGE-GATES" digest="sha256:bc61b8429b31d6b4bb9888317d4f665c36681eeca8ce656f027645373339cb3e" -->
<!-- pdac:cite id="BR-HUMAN-AUTHORITY" digest="sha256:c26daacd93dfc059f9ff99cdac179a2ee0d136d5c02cd146b92b3c46e49752e8" -->
