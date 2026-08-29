# Impact Studio deployment setup

The site now includes a protected editorial area at `/login` (redirects to `/admin/`), public story pages at `/impact/stories/<slug>`, and Pages Functions that store story data in D1 and photos in R2.

## 1. Create the data services

In the Cloudflare dashboard, select the same account that owns `lonestarsportsfoundation.org`.

1. Go to **Storage & databases > D1 SQL Database** and create a database named `lsf-impact`.
2. Open the new database, choose **Console**, and run the contents of [`db/schema.sql`](./db/schema.sql).
3. Go to **Storage & databases > R2** and create a standard-storage bucket named `lsf-story-media`.

## 2. Bind them to the Pages project

Go to **Workers & Pages > your Pages project > Settings > Bindings**. Add bindings for both Preview and Production:

| Binding type | Variable name | Resource |
| --- | --- | --- |
| D1 database | `DB` | `lsf-impact` |
| R2 bucket | `STORY_MEDIA` | `lsf-story-media` |

No public R2 bucket or custom R2 domain is needed. The site serves images through the `/media/` function route with safe cache headers.

## 3. Protect editor routes with Cloudflare Access

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

From the **Impact Studio** application, copy its **Application Audience (AUD) Tag**. This is required by the API's second-layer JWT validation.

## 4. Add Pages environment variables

In **Workers & Pages > your Pages project > Settings > Environment variables**, add the following variables for Preview and Production:

| Variable | Value |
| --- | --- |
| `CF_ACCESS_TEAM_DOMAIN` | `https://YOUR-TEAM.cloudflareaccess.com` |
| `CF_ACCESS_API_AUD` | The AUD tag from the **Impact Studio** Access application |
| `EDITOR_EMAILS` | `admin@lonestarsportsfoundation.org,jeff@lonestarsportsfoundation.org,sathish@lonestarsportsfoundation.org,siva@lonestarsportsfoundation.org,kai@lonestarsportsfoundation.org` |

`CF_ACCESS_TEAM_DOMAIN` must include `https://` and must not have a trailing slash. Do not add Google Client IDs or Client Secrets to this project; those remain in Cloudflare Zero Trust.

## 5. Deploy and test

Pages Functions require a Git-connected Pages deployment or Wrangler deployment; dashboard Direct Upload does not deploy the `functions/` directory.

After this repository is deployed:

1. Visit `https://lonestarsportsfoundation.org/login` in a private browser window.
2. Sign in with one of the five approved Workspace accounts.
3. Create a draft, save it, upload a cover image and additional gallery images, then change its status to Published.
4. Confirm it appears at `/impact/`, that its cover can rotate into the hero, and that its direct public URL works.

The build output includes `public/_routes.json`, which limits Pages Function calls to dynamic API, media, login, and story routes. The rest of the site remains static.
