# Worker catalogue acceptance (#140)

The [published preview](https://34762c08.lighthouse-6tc.pages.dev/architecture/index.html#/section/06/worker-catalogue), revision `cfb666a782d33d6e2fe18676722fa4d0dbd1483c`, passed browser navigation across 12 pages and 13 native diagrams, including mobile navigation, fullscreen and zoom. No page JavaScript errors occurred. Executable source links resolve to that revision.

The first preview rendered those links as inert text. The corrected build supplies a public origin and the checkout SHA to ArcShape without changing repository Git configuration. The strengthened site check rejects the original export.

The adoption snapshot uses main `63848c3ff180daae897dc717ac8a4dd499cd1bc1` and installed harness `c10969724e4add835f7f7bf4bb5f5bb62908e6d3`. Source versions are CLI 0.12.38 and SDLC 0.20.5; these are not registry publication evidence. Only `LIGHTHOUSE_AUTOMATION_ENABLED` is configured among Lighthouse repository variables. CI repair is absent; unattended execution and merge are enabled only for the fixture path. This change does not activate workflows or establish the remaining delivery acceptance cases.

`npm run verify` passed: 609 tests passed, seven optional tests skipped, Markdown/local links and the public site verified. All 37 architecture citations are current. Strict OpenSpec validation passed; provider citation checking reports two existing warnings in #272 and no errors.

Evidence: [desktop catalogue](screenshots/catalogue-desktop.png), [integration fullscreen](screenshots/integration-expanded.png), [mobile maintenance](screenshots/maintenance-mobile.png), and [original exports, browser checks, configuration and validation logs](evidence.tar.gz), with internal SHA-256 checksums.
