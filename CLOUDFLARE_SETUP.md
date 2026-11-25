# Impact Studio deployment setup (Cloudflare Workers)

The site runs on **Cloudflare Workers with Static Assets** (`wrangler.jsonc` + `src/worker.js`): Vite builds the static site into `dist/`, and the Worker handles dynamic API, media, login, and story routes backed by D1 and R2.

## Existing database update

If you created `lsf-impact` before the hero framing controls were added, open the D1 **Console** and run [`db/migrations/002_add_story_cover_focal_point.sql`](./db/migrations/002_add_story_cover_focal_point.sql) once before deploying this update. New databases created with [`db/schema.sql`](./db/schema.sql) already include these columns.

For zoom and hero crop-shape controls, run [`db/migrations/003_add_story_cover_crop_controls.sql`](./db/migrations/003_add_story_cover_crop_controls.sql) once after migration 002.

## 1. Create or reuse the data services

In the Cloudflare dashboard, select the same account that owns `lonestarsportsfoundation.org`:

1. Go to **Storage & databases > D1 SQL Database** and create (or locate) the database named `lsf-impact`.
2. If creating a fresh database, open **Console** and run the contents of [`db/schema.sql`](./db/schema.sql).
3. Copy the **Database ID** of `lsf-impact` and set it in [`wrangler.jsonc`](./wrangler.jsonc) (`d1_databases[0].database_id`). You can also look it up with `npx wrangler d1 list`.
4. Go to **Storage & databases > R2** and ensure the standard-storage bucket named `lsf-story-media` exists.

No public R2 bucket or custom R2 domain is needed. The Worker serves images through `/media/` with safe cache headers.

## 2. Protect editor routes with Cloudflare Access

Create one **Zero Trust > Access controls > Applications** application. Use **Self-hosted and private**, the Google Workspace identity provider, and the `Impact Studio editors` Allow policy.

| Application name | Hostname | Path |
| --- | --- | --- |
| Impact Studio | `lonestarsportsfoundation.org` | `/admin/*` |

The editor and its API both live beneath `/admin/*`, avoiding a browser CORS issue caused by an API authentication redirect. Select only the Google Workspace identity provider and enable **Apply instant authentication**. The policy should include only:

```text
admin@lonestarsportsfoundation.org
jeff@lonestarsportsfoundation.org
sathish@lonestarsportsfoundation.org
siva@lonestarsportsfoundation.org
kai@lonestarsportsfoundation.org
```

From the **Impact Studio** application, copy its **Application Audience (AUD) Tag**. This is required by the Worker's second-layer JWT validation.

## 3. Add Worker environment variables / secrets

In **Compute (Workers) > Workers & Pages > lonestarsportsfoundation > Settings > Variables and Secrets** (or via `npx wrangler secret put`), add:

| Variable | Value |
| --- | --- |
| `CF_ACCESS_TEAM_DOMAIN` | `https://YOUR-TEAM.cloudflareaccess.com` |
| `CF_ACCESS_API_AUD` | The AUD tag from the **Impact Studio** Access application |
| `EDITOR_EMAILS` | `admin@lonestarsportsfoundation.org,jeff@lonestarsportsfoundation.org,sathish@lonestarsportsfoundation.org,siva@lonestarsportsfoundation.org,kai@lonestarsportsfoundation.org` |

`CF_ACCESS_TEAM_DOMAIN` must include `https://` and must not have a trailing slash. Do not add Google Client IDs or Client Secrets to this project; those remain in Cloudflare Zero Trust.

For local Worker testing, place these same values in `.dev.vars` (git-ignored).

## 4. Deploy and connect the custom domain

1. Build and deploy with Wrangler (or connect GitHub via **Workers Builds** with build command `npm run build` and deploy command `npx wrangler deploy`):

   ```bash
   npm run deploy
   ```

2. In **Workers & Pages > lonestarsportsfoundation > Settings > Domains & Routes**, attach the custom domain `lonestarsportsfoundation.org` (and `www.lonestarsportsfoundation.org` if desired) once you detach it from the old Pages project.
3. Visit `https://lonestarsportsfoundation.org/login` in a private browser window, sign in with an approved Google Workspace account, and verify `/admin/`, `/impact/`, and `/impact/stories/<slug>`.

[`wrangler.jsonc`](./wrangler.jsonc) configures `run_worker_first` only for `/api/*`, `/admin/api/*`, `/media/*`, `/impact/stories/*`, and `/login`, so all static pages and assets continue to serve directly without invoking the Worker.
