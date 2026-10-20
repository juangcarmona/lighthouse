# Public site deployment

The Lighthouse public site is a static Cloudflare Pages upload. Its current presentation source lives in `src/public-site/`; the build copies the brand assets and bundles the theme and component CSS into `dist/public-site/`. ProductShape and ArcShape projection is proposed product work and is not part of the current build.

Build and verify the exact directory Wrangler will upload:

```sh
npm run build:public-site
npm run verify:public-site
```

Preview it with Wrangler Pages:

```sh
npx wrangler@4.151.2 pages dev dist/public-site
```

Create a Cloudflare Pages project once, then deploy the prepared directory:

```sh
npx wrangler@4.151.2 pages project create lighthouse-public-site
npx wrangler@4.151.2 pages deploy dist/public-site --project-name lighthouse-public-site
```

`wrangler.jsonc` points Pages at `./dist/public-site`. The deployment commands require a logged-in Wrangler session or Cloudflare credentials in the shell. A local Pages preview does not publish the site or configure a custom domain.
