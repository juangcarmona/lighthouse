# Recommended GitHub repository profile

The `github-profile` capability is an optional recommendation for GitHub.com repositories. Any Lighthouse adopter can select it, supply its own policy, inspect changes, apply an authorized plan and verify live settings. Leaving it unselected or declining it does not fail the general foundation check. It is independent of application profiles and does not require a factory runtime.

The profile is an implementation of [profile adoption](../../../docs/product/model/use-cases/uc-adopt-profile.md). GitHub remains the authority for remote settings; the adopter owns configuration and exceptions. Installation, initialization and upgrades never apply this profile remotely.

## Configure adoption

Create `.lighthouse/github.json` in the consuming repository using the [configuration schema](assets/schemas/github-profile.schema.json). Keep this file in version control and review it like other repository policy. Select unconditional CI job names and their actual GitHub App IDs; do not make a path-filtered job a universal required check. Approvals and contribution policy are explicit choices rather than assumptions about a solo maintainer or an open-source community.

```json
{
  "schemaVersion": 1,
  "profileVersion": 1,
  "repository": "example/project",
  "intake": "preserve",
  "requiredChecks": [{ "context": "verify", "integrationId": 15368 }],
  "requiredApprovals": 1,
  "evidenceBranch": null,
  "releaseWorkflowReady": false,
  "overrides": {
    "releases.immutable": {
      "value": null,
      "reason": "No release publisher is configured for this project."
    }
  }
}
```

Choose `collaborators`, `public` or `preserve` for issue and PR creation. A solo maintainer may choose zero required approvals, but that setting does not enforce a human integration decision. Keep that decision in the host's authorization policy and keep publication credentials outside implementation workers.

Set `evidenceBranch` to a literal permanent branch name when the project uses one. The adapter protects it without creating it, copying application files or changing its tip. Set `releaseWorkflowReady: true` only after checking that the publisher creates a draft, attaches all assets and then publishes the release. Otherwise preserve that setting with a documented exception.

An override has a supported control ID, a typed `value` and a non-empty `reason`. `null` means preserve and exclude that control from compliance, reported as `excepted`. A different supported value records a project-specific policy. A `rules.main` or `rules.evidence` override accepts only `null` with a reason; its result explicitly excludes that protection from compliance and does not claim a protected branch. The adapter never disables secret scanning, alerts, security updates or release immutability. It never removes or weakens an existing ruleset, including when the project asks for fewer approvals or checks.

## Plan, apply and verify

```sh
lighthouse capabilities select --id github-profile --provider github
profile_plan=$(mktemp)
lighthouse capabilities plan --id github-profile --input .lighthouse/github.json --plan-file "$profile_plan"
lighthouse capabilities apply --plan-file "$profile_plan" --authorize <plan-hash> --format json
lighthouse capabilities verify --id github-profile --input .lighthouse/github.json --format json
rm -- "$profile_plan"
```

Selection records a local adoption choice when Lighthouse ownership state exists. Planning and live verification can also run against the explicit configuration before full foundation adoption. The default input path is `.lighthouse/github.json`. An optional `--repo` must match the configured repository; there is no implicit target derived from a Git remote or current login.

Planning reads GitHub and writes only the requested local plan. The plan records before/after values, exceptions, repository identity, applicable rules and a SHA-256 authorization hash. Apply validates that exact plan and its permitted operations, rereads the provider before each write, and refuses unexpected drift. Already-satisfied operations are skipped on retry. The adapter fixes its API host to `github.com`; GitHub Enterprise Server is outside this version's supported scope.

Apply adds missing protection before changing settings. Compatible rules with no bypass satisfy the minimum; stronger rules, additional checks and unrelated settings remain intact. Missing requirements receive a separate additive ruleset. Existing policies are never replaced, deleted or automatically adopted as Lighthouse-owned. GitHub administration permission is required when changes are planned; narrower credentials may inspect the controls their permissions expose. Missing permissions, unavailable APIs and plan restrictions produce `unavailable` or `blocked`, never a success claim. Private repositories remain private.

Apply reports its result on standard output, including completed operations and errors on partial failure; `--format json` makes this machine-readable. It creates no result files or history in the repository. Successful adoption updates only the existing `.lighthouse/upgrade.json` entry. Keep the configuration in Git; use a temporary path for the reviewed plan and remove it when finished. If an operator or CI needs durable evidence, capture the output in its existing logs or artifact storage. Failed or uncertain requests require fresh verification before retry; the adapter does not roll back protections or blindly repeat a write. API operations are not a transaction, and GitHub does not provide a compare-and-swap operation for repository settings. Avoid concurrent administrators applying conflicting policies.

Live verification exits nonzero for drift or unavailable selected controls and makes no remote writes. General `lighthouse verify` validates local configuration and points to the live command; it does not make network requests or claim that a previous receipt proves today's remote settings. A result with exceptions covers only the selected automated controls. Manual recommendations are always listed separately.

## Automated controls

| Control | Recommendation | Application |
| --- | --- | --- |
| `repository.has_issues` | `true` | Enable issues. |
| `repository.has_discussions` | `false` | Preserve an existing community through a reasoned override. |
| `repository.is_template` | `false` | Override for an intentional starter repository. |
| `repository.allow_squash_merge` | `true` | Default integration method. |
| `repository.allow_merge_commit` | `false` | Override when branch ancestry matters. |
| `repository.allow_rebase_merge` | `false` | Override for a deliberate rebase workflow. |
| `repository.squash_merge_commit_title` | `PR_TITLE` | Validate PR titles in the project's CI. |
| `repository.squash_merge_commit_message` | `PR_BODY` | Preserve the reviewed change description. |
| `repository.allow_auto_merge` | `true` | Makes the feature available; does not enable it on any PR or authorize integration. |
| `repository.allow_update_branch` | `true` | Offer branch updates. |
| `repository.delete_branch_on_merge` | `true` | Clean merged feature branches; protect permanent branches separately. |
| `repository.web_commit_signoff_required` | `false` | Override if the project adopts DCO. |
| `intake` | Adopter choice | Apply the chosen issue and PR creation policy together, or preserve it. |
| `rules.main` | PR, resolved conversations, stale-review dismissal, explicit checks and approvals, strict base, no deletion/force-push/bypass | Resolve the current default branch without renaming it. |
| `rules.evidence` | No deletion, force-push or bypass | Only when an evidence branch is declared. |
| `actions.workflow` | Read token, no PR approval | Default token permissions only; workflows can request additional permissions. |
| `actions.forkApproval` | `all_external_contributors` | Public repositories; private-fork policy needs separate review. |
| `security.alerts` | `true` | Enable Dependabot alerts before security updates. |
| `security.updates` | `true` | Enable Dependabot security PRs; does not configure version-update scheduling. |
| `security.secret_scanning` | `enabled` | Require availability or an explicit exception. |
| `security.secret_scanning_push_protection` | `enabled` | Require availability or an explicit exception. |
| `releases.immutable` | `true` | Requires confirmed publisher readiness or a reasoned exception. |

The adapter does not manage visibility, repository ownership/name, default-branch renaming, Wiki, Projects, sponsorship, social preview, archive participation, commit comments, linked-issue auto-close, LFS archives, multi-ref push limits, Actions retention, issue templates or workflow contents. These remain product decisions or manual checks; they are not silently treated as compliant. Security availability can depend on GitHub plan and permissions; this capability never purchases a feature or changes visibility to unlock it.

## References

- [GitHub repository settings API](https://docs.github.com/en/rest/repos/repos)
- [GitHub rulesets API](https://docs.github.com/en/rest/repos/rules)
- [GitHub Actions permissions API](https://docs.github.com/en/rest/actions/permissions)
- [Immutable release publication](https://docs.github.com/en/code-security/concepts/supply-chain-security/immutable-releases)
