# Reuse and distribution

The maintainer selected Apache-2.0 on 2026-11-07 in [#215](https://github.com/juangcarmona/lighthouse/issues/215). The decision covers Lighthouse-authored repository code, documentation, configuration, CLI, SDLC, UI, profiles, examples and templates. [Third-party material](../THIRD_PARTY_NOTICES.md) retains its existing terms.

The authoritative terms are in [LICENSE](../LICENSE). Each npm package includes that license, the Lighthouse [NOTICE](../NOTICE) and an `Apache-2.0` license declaration. Earlier published versions without these files have not been repackaged; check the exact version and tarball you distribute.

## Consumer projects

Using the CLI, workers or UI does not require publishing your application's source or selecting Apache-2.0 for unrelated consumer code. Material copied or adapted from Lighthouse remains subject to its applicable terms, even after renaming or customization. Preserve the license, relevant notices and attribution, and identify modified files when redistributing that material as required by Apache-2.0 section 4.

When distributing generated guidance, workflows, scripts, styles or templates outside their original package, include the package's `LICENSE` and `NOTICE` with those files. Keep these scoped to the included Lighthouse material; a consumer's root license is its own decision. The .NET creators include `Lighthouse.LICENSE` and `Lighthouse.NOTICE` beside the generated starter and identify that origin in its README.

Apache-2.0 permits commercial use, modified distributions and paid services without a general requirement to publish modifications. It does not grant general rights to Lighthouse names, logos or trademarks. External services, model providers, dependencies and integrations retain their own licenses and service terms.

## Distribution checks

Run `npm run verify` before release. The artifact checks inspect the actual packed CLI, SDLC and UI contents, compare license and notice bytes with the repository and check the package license declarations. Starter tests check that both .NET creation routes preserve those notices without assigning a license to the whole consumer project.

Complete #215 only after the selected package versions are published and their registry metadata and downloaded tarballs pass the same checks. A local pack or merged PR does not establish that published artifacts contain these terms.
