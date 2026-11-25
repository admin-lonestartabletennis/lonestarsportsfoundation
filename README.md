# Lonestar Sports Foundation

Static frontend and Cloudflare Worker backend for `https://lonestarsportsfoundation.org/`.

## Local development

1. Install dependencies:

   ```bash
   npm install
   ```

2. Start the static frontend (fast Vite HMR):

   ```bash
   npm run dev
   ```

3. Or build and run the full Cloudflare Worker (static assets + APIs + D1 + R2) locally:

   ```bash
   npm run dev:worker
   ```

   To seed a local D1 database for `dev:worker`:

   ```bash
   npx wrangler d1 execute lsf-impact --local --file=db/schema.sql
   ```

## Production build & deploy

```bash
npm run build
npm run deploy
```

`npm run build` writes the static site to `dist/`. `npm run deploy` builds `dist/` and deploys both static assets and `src/worker.js` using `wrangler.jsonc`.

## Cloudflare Workers setup

- Entrypoint: `src/worker.js`
- Configuration: `wrangler.jsonc`
- Build command (Workers Builds): `npm run build`
- Deploy command (Workers Builds): `npx wrangler deploy`
- Detailed D1, R2, and Cloudflare Access setup: [`CLOUDFLARE_SETUP.md`](./CLOUDFLARE_SETUP.md)

## Production release tagging

The production branch is `main`. Create a tag only after the production deployment has completed successfully and the live site has been verified.

```bash
git checkout main
git pull --ff-only origin main
git tag -a vYYYY.MM.DD -m "Short release description"
git push origin vYYYY.MM.DD
```

For example:

```bash
git tag -a v2026.08.29 -m "Workers migration release"
git push origin v2026.08.29
```

Use the tag in GitHub to create a Release if release notes are needed. If a production deployment has an issue, roll back the Worker deployment in the Cloudflare dashboard first, then revert the relevant GitHub pull request so the next deployment remains correct.
