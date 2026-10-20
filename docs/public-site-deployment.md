# Public site deployment

The Lighthouse public engineering site is a static GitHub Pages publication built by `.github/workflows/public-site.yml`. One serialized publisher combines the presentation source, UI package CSS, ProductShape snapshot and ArcShape snapshot in a single output.

## Local build and preview

Build and verify the exact directory that GitHub Pages receives:

```sh
npm run build:public-site
npm run verify:public-site
```

Preview the verified output locally with:

```sh
npm run preview:public-site
```

The preview listens on `http://localhost:4174/` and serves the same `dist/public-site/` directory that the workflow uploads.

## GitHub Pages activation

In the repository settings, open **Pages**, choose **GitHub Actions** as the build and deployment source, and keep the `github-pages` environment available for the deployment job.

Pull requests build, validate and upload the site as a review artifact without publishing it. Pushes to `main` and manual workflow runs validate the ProductShape and ArcShape inputs, build the static output and deploy it through GitHub Pages. Main deployments wait for an active publication to finish so the Pages site remains a coherent revision.

The site is a projection. ProductShape remains the product authority, ArcShape remains the architecture authority and the source repository remains the authority for the package and site implementation.
