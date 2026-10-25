# Process evidence delivered with the pull request

Status: proposed harness convention for the next external-host delivery slice. The current host only executes triage/refine; it does not publish this branch or these reports. Lighthouse owns the convention; a host collects, retains and publishes the evidence. This adds no lifecycle stage or publication grant.

## Delivery and ownership

Every implementation PR should link to a readable execution report and retrospective when it becomes ready for review. The report names the exact candidate commit, checks, known gaps and available evidence. The retrospective records what went well, what went wrong, start doing, stop doing, and evidence-supported improvement candidates. Empty sections explicitly say no finding was established.

After authorized integration, the existing `review` stage adds the integration outcome and final learning. The earlier report remains available. A report delivered with the PR does not claim completed integration or final `review`. Failed and abandoned attempts retain diagnostics without pretending a PR or integration exists.

| Owner | Responsibility |
| --- | --- |
| Lighthouse harness | Report conventions, evidence references, lifecycle timing and validation requirements. |
| External host | Session/event collection, redaction, bounded storage, branch-protection checks, serialized publication and receipts. |
| Adopter | Effective retention, artifact visibility, provider permissions and protected-branch configuration. |

Improvement candidates describe an observed problem, supporting occurrences, confidence, affected owner, proposed correction and a regression check. Recurrence across distinct work items is different from retries of one attempt. A report can propose a change without automatically opening another issue, editing the harness or granting permissions.

## Dedicated branch and paths

Use one long-lived `process/retrospectives` branch per adopter repository for reports and publishable evidence. Initialize it with its own root commit and no application tree. Never merge it into the default branch; exclude it from feature-branch cleanup. Application branches carry links rather than generated evidence files.

```text
docs/process/
  20261025-42-keyboard-navigation/
    README.md
    runs/
      <run-id>/
        attempt-0001/
          pr-ready/
            report.md
            retrospective.md
            evidence-index.json
            screenshots/
            videos/
            telemetry/
          post-integration/
            report.md
            retrospective.md
            evidence-index.json
```

Choose the work-item folder once, using its first publication date in the adopter's configured timezone, issue number and normalized slug. Persist that mapping by repository and issue identity; renamed issues and resumed runs reuse it. Record the timezone and original issue URL in the report. Each execution attempt has its own path; a transport retry reuses its publication identity and content. The host allocates attempt identities, not the worker.

`README.md` indexes observed attempts and publication phases. Each phase bundle is immutable after confirmed publication; corrections create another identified bundle and mark the old report superseded in the index. PR evidence links are pinned to the evidence commit and identify the source/candidate commit separately. A convenience link to the branch index can show newer results without changing the evidence originally reviewed.

Reuse the package's [evidence index](../../src/packages/sdlc/schemas/evidence-index.schema.json) and [evidence record](../../src/packages/sdlc/schemas/evidence-record.schema.json) for paths, hashes, statuses and coverage. Additional metadata requires a versioned compatible contract rather than unsupported fields. Screenshots, reports and sanitized telemetry belong to their bundle; absent evidence is unavailable, never an empty success placeholder.

## Publication without collisions

The trusted publisher checks the work-item authority, artifact scope, current lease/fence and expected branch tip. It permits only the allocated bundle and index update. Normalize and contain paths, reject symlinks/traversal and unrelated changes. Workers never receive branch-write credentials.

Serialize publication per repository evidence branch. Publish a normal descendant commit from the observed tip; never force-push. If another authorized publisher advanced the branch, reread it and rebuild the bounded addition while preserving unrelated bundles. Identical existing bundle content returns its receipt; different content at the same publication identity is a conflict. Reconcile uncertain remote results before retrying. Unique directories alone do not resolve concurrent updates to the Git ref.

## Protection and retention

Verify active rules preventing deletion and non-fast-forward updates of `process/retrospectives`, with no routine bypass of those rules. Publisher update permission must not imply deletion or force-push permission. GitHub's [ruleset documentation](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/available-rules-for-rulesets) explains these controls and plan availability. If protection cannot be enforced, report adoption as blocked; a local hook or branch name is insufficient.

Protection is an administrative control, not an immutable archive: an authorized administrator can change the rules, and repository deletion is separate. Keep receipts and backups according to adopter policy. Protection does not prevent a normal commit from deleting files; the publisher must enforce its bundle policy.

A separate branch keeps the default branch's tree clean but shares repository visibility and Git storage. Publish only evidence approved for that audience. Raw sessions, credentials and sensitive tool output stay in a private bounded store. The branch may contain sanitized extracts and references with hashes, sensitivity and retention information. Permanent reports must not contain credential-bearing or expiring signed URLs.

For large screenshots or videos, use retained artifact/object storage or an explicitly configured LFS policy. Keep a small record in the bundle with identity, digest, size, access requirements and expiry. An expiring Actions download is insufficient permanent evidence. GitHub [recommends external storage for generated files and LFS for binaries](https://docs.github.com/en/repositories/creating-and-managing-repositories/repository-limits).

Removing a Git-tracked file in a later commit does not erase earlier copies. Data with a deletion/expiry requirement belongs in storage that enforces it. The branch is a permanent address for reports and references; it does not promise indefinite retention of every screenshot, video or telemetry payload.

## Acceptance before activation

- A PR links to its report and retrospective at a confirmed evidence commit before being marked ready.
- A later integration report preserves the pre-merge record and cites the merged revision.
- Concurrent publishers preserve both bundles; a duplicate returns one receipt and a conflicting duplicate fails closed.
- Provider protection is active; publication fails when required protection is unavailable or disabled.
- Collection/publishing tests cover secret-bearing output, private references, large artifacts, unavailable exports and expired evidence without claiming complete coverage.
- The report branch is never merged into application branches, and report instructions never become execution or policy authority.
