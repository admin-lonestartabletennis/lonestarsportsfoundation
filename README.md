# Lonestar Sports Foundation

Static frontend for `https://lonestarsportsfoundation.org/`.

## Local development

1. Install dependencies:

   ```bash
   npm install
   ```

2. Start the frontend:

   ```bash
   npm run dev
   ```

3. Open the local URL shown by Vite, usually:

   ```text
   http://localhost:5173
   ```

## Production build

```bash
npm run build
```

The built static files are written to `dist/`.

## Cloudflare Pages setup

- Framework preset: `None`
- Build command: `npm run build`
- Build output directory: `dist`
- Root directory: `/`

Then attach the custom domain `lonestarsportsfoundation.org` to the Pages project after verifying the `pages.dev` preview.

## Deployment note

After connecting the GitHub repository to Cloudflare Pages, any new commit pushed to the tracked branch will trigger a fresh Pages build and deployment.

## Production release tagging

The production branch is `main`. Cloudflare Pages deploys when a commit is merged or pushed to
`main`; Git tags do not trigger a deployment. Create a tag only after the production deployment
has completed successfully and the live site has been verified.

```bash
git checkout main
git pull --ff-only origin main
git tag -a vYYYY.MM.DD -m "Short release description"
git push origin vYYYY.MM.DD
```

For example:

```bash
git tag -a v2026.08.29 -m "Impact Studio release"
git push origin v2026.08.29
```

Use the tag in GitHub to create a Release if release notes are needed. If a production deployment
has an issue, use Cloudflare Pages' rollback option first, then revert the relevant GitHub pull
request so the next deployment remains correct.
