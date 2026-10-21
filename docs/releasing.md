# Releasing Lighthouse

Lighthouse publishes `@juangcarmona/lighthouse` and `@juangcarmona/lighthouse-ui` as public npm packages from the protected GitHub Actions workflow in `.github/workflows/release.yml`.

## One-time first publication

The first `0.1.0` publication is a maintainer bootstrap because npm cannot attach a trusted publisher to a package that does not exist yet.

From an SSH session in a clean checkout of the merged `main` commit, confirm the npm identity, install dependencies, inspect both tarballs, and publish both packages with `--access public --provenance=false`.

The npm login is remote: use the web or device flow on the SSH host, open the displayed URL on your local device, and do not paste a password or token into the SSH session.

```bash
npm whoami
# If the command returns E401, start the remote device flow and complete it in a local browser.
npm login --registry=https://registry.npmjs.org --auth-type=web
npm whoami
npm ci --ignore-scripts
npm pack --workspace @juangcarmona/lighthouse --dry-run --json
npm pack --workspace @juangcarmona/lighthouse-ui --dry-run --json
npm publish --workspace @juangcarmona/lighthouse --access public --provenance=false
npm publish --workspace @juangcarmona/lighthouse-ui --access public --provenance=false
npm view @juangcarmona/lighthouse version
npm view @juangcarmona/lighthouse-ui version
```

Do not continue after a failed package publication without checking npm; package versions are immutable and the second publication may still be valid.

## Required GitHub and npm configuration

Create a protected GitHub environment named `npm-publish` with Juan as a required reviewer and restrict deployments to `main`.

Enable `Settings → Actions → General → Workflow permissions → Allow GitHub Actions to create and approve pull requests` so the version PR can be maintained.

For each package on npm, add a GitHub Actions Trusted Publisher for repository `juangcarmona/lighthouse`, workflow `release.yml`, and environment `npm-publish`.

The release job uses npm OIDC and provenance after this bootstrap; it does not rely on a long-lived npm token.

## Normal release

A package change adds a changeset under `.changeset/` and merges through the normal pull-request flow.

After the change reaches `main`, GitHub Actions opens or updates `Version Packages`; merging that reviewed pull request is the release decision.

The protected `npm-publish` job validates the repository, runs `changeset publish`, pushes package tags, and publishes only the committed versions that are absent from npm.

Use the `publish-current-stable` workflow dispatch only to recover an interrupted stable publication; never republish an existing version.
