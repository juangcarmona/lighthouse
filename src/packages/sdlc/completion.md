# Integrate and review in GitHub Actions

The optional completion adapter finishes an implementation through the adopter's repository workflows. OpenCode assesses the delivery in its existing isolated runner; a separate hosted publisher verifies GitHub state, performs an explicitly authorized merge and retains the report. SoFa is not required.

## Adoption

Install with `install-workflows <repository> <immutable-lighthouse-commit> --with-completion`. Preview first; `--apply` writes selected workflows and compiles them with gh-aw v0.93.2. Existing differing files require `--replace-reviewed`. Completion includes refine, propose and implement; it adds no new lifecycle stage.

In the existing `.lighthouse/github.json`, retain the adopted required checks and protected `evidenceBranch`, and add:

```json
{
  "completion": {
    "publishEvidence": true,
    "postMergeWorkflows": ["verify.yml"]
  }
}
```

Use real workflow filenames. Each must support `workflow_dispatch` and verify its checked-out revision. GitHub does not trigger ordinary push workflows for changes made with `GITHUB_TOKEN`, so the publisher explicitly dispatches this allowlist after opening or updating the implementation PR and after merge. A run only counts if GitHub reports the actual merged SHA, default branch, permitted event and successful completion. Pending, missing and failed results remain distinct from success. A changed default tip stops dispatch rather than checking unrelated code.

The evidence branch must already exist separately from the application tree. Active repository rulesets must prevent deletion and non-fast-forward updates with no bypass actors. Completion verifies these rules before publication; it does not create or weaken them. `publishEvidence` opts into publishing the bounded report and receipt to the repository's audience. It does not authorize copying raw sessions or every implementation artifact.

GitHub hides `bypass_actors` from tokens that cannot edit rulesets. Before activation, run the read-only `node src/packages/sdlc/src/observe-protection.mjs <owner/repository> <evidence-branch>` command with the owner's existing GitHub CLI authentication. Add its array as `completion.protectionObservations` in the reviewed profile. No credential is stored. The observer requires visible empty bypass lists and stable provider timestamps. Actions compares the retained ruleset revision digest with live public metadata, including `updated_at`, conditions and rules; any change invalidates the observation. Reobserve after a deliberate protection change. If bypass actors are visible at runtime, a non-empty list always fails even when an old observation exists. Classic branch protection still requires access to its protection endpoint; the adapter fails closed when that policy cannot be read.

## Owner entry

Approve the implementation PR in GitHub when it is ready. The router checks that the approval belongs to the owner and the current commit, then assesses integration. If CI is still running, its completion resumes the check. Comments request changes on the same PR; they do not authorize merge.

Manual `integrate` and `review` dispatches remain available for recovery. They require the issue, PR and accepted head SHA; integration needs `merge: true` to authorize a merge.

Integration binds the current work-item title/body and owner answers, PR content and changed paths, base revision, adopted policy and review state. The host rechecks them before publishing or merging. Changed inputs require a fresh assessment; a new commit needs a new approval. Required checks come from effective GitHub rules and classic branch protection; the adopted checks must still be enforced. Unrelated maintenance failures are not silently promoted to required checks. Additional CI observations exclude check identities belonging to the current workflow run, obtained from GitHub job metadata, so review cannot wait for itself to finish; required-check enforcement remains unchanged. GitHub remains responsible for review and merge protection. This adapter supports same-repository PRs and squash integration; merge queues and stacked merges need their own adapter.

The merge request includes the accepted head SHA. GitHub's REST merge operation has no expected-base argument: the adapter rechecks base immediately beforehand, while GitHub enforces current branch rules at merge time. The receipt records the actual merged revision, and post-merge verification checks that revision. It never claims the earlier test-merge revision is the final commit.

After integration, successful post-merge CI starts `review`. The host supplies matching integration evidence from the protected process branch: a commit-pinned report, hash-verified artifacts and receipt, accepted delivery identity, owner merge authorization and the successful originating workflow. Review rechecks that pinned evidence before publication; missing or stale history is explicit. The current review report remains a subsequent host effect. Review records the retrospective, affected-instruction findings and proposed improvements. A passed review closes the work item and removes the delivery labels; a blocker keeps it awaiting review. The router follows the adopted workflow; neither stage changes policy.

## Evidence and recovery

Actions shows authorization, OpenCode progress, validation, publication and cleanup as separate jobs or steps. The issue and PR receive a report link pinned to the confirmed evidence commit. The report records accepted source, actual integration outcome, GitHub check identities and retrospective. Reports and receipts use the existing evidence record/index formats under `docs/process/YYYYMMDD-issue-slug/runs/run/attempt-NNNN/`; dates use UTC. An existing work-item folder is reused after a rename.

Publication preserves previous bundles and unrelated files, rejects path escapes, links, credential-shaped payloads and excessive content, and updates the branch without force. Concurrent updates are rebased through a bounded retry. Identical bundle retries return the existing receipt; different content at the same identity is a conflict. This is a bounded pattern check, not a claim that arbitrary private content is safe to publish.

A merge receipt is uploaded even if later dispatch or publication fails. An uncertain merge response is reconciled against GitHub before any further mutation. A fresh invocation on an already merged PR records the observed merge instead of repeating it. Artifact retention is 30 days; confirmed process-branch reports remain available under the adopter's retention policy. Earlier screenshots stay in their existing evidence location; this slice does not automatically migrate all binary artifacts to permanent storage.

## Related work

This adapter implements the completion slice in issue #105 and uses the narrow freshness, verification and continuity requirements described in #100, #101, #102 and #104. It does not finish those broader proposals or approve the delegation policy in #103. Scope changes, independent test-authoring enforcement, cross-ticket recurrence measurement and expanded autonomous routing remain separate work.

Provider behavior: [merge a pull request](https://docs.github.com/en/rest/pulls/pulls#merge-a-pull-request), [required status checks](https://docs.github.com/en/pull-requests/how-tos/merge-and-close-pull-requests/troubleshooting-required-status-checks), and [triggering workflows from workflows](https://docs.github.com/en/actions/how-tos/writing-workflows/choosing-when-your-workflow-runs/triggering-a-workflow).
