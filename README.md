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
