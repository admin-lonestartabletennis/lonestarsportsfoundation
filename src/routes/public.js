import { error, json } from "../lib/http.js";
import { getStoryBySlug, storySummary } from "../lib/stories.js";

function escapeHtml(value = "") {
  return value.replace(
    /[&<>'"]/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]
  );
}

function paragraphs(value) {
  return escapeHtml(value)
    .split(/\n\s*\n/)
    .filter(Boolean)
    .map((paragraph) => `<p>${paragraph.replace(/\n/g, "<br />")}</p>`)
    .join("");
}

function focalPoint(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(100, Math.max(0, number)) : 50;
}

function coverZoom(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(2, Math.max(1, number / 100)) : 1;
}

function coverAspect(value) {
  return (
    { "16:9": "16 / 9", "3:2": "3 / 2", "2:1": "2 / 1", "4:3": "4 / 3" }[value] || "16 / 9"
  );
}

export function handleLogin(request) {
  return Response.redirect(new URL("/admin/", request.url), 302);
}

export async function handleMedia(env, rawKey) {
  let key = rawKey;
  try {
    key = decodeURIComponent(rawKey);
  } catch {
    return new Response("Not found", { status: 404 });
  }
  if (!key) return new Response("Not found", { status: 404 });

  const object = await env.STORY_MEDIA.get(key);
  if (!object) return new Response("Not found", { status: 404 });

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("ETag", object.httpEtag);
  headers.set("Cache-Control", "public, max-age=31536000, immutable");
  return new Response(object.body, { headers });
}

function safeInlineJson(data) {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

export async function handleImpactPage(request, env) {
  const [assetResponse, dbResult] = await Promise.all([
    env.ASSETS.fetch(request),
    env.DB.prepare(
      "SELECT * FROM stories WHERE status = 'published' ORDER BY COALESCE(published_at, updated_at) DESC"
    ).all()
  ]);

  if (!assetResponse.ok) return assetResponse;

  const stories = dbResult.results.map(storySummary);
  const heroStory = stories.find((story) => story.cover_url);

  let rewriter = new HTMLRewriter().on("head", {
    element(element) {
      element.append(`<script>window.__IMPACT_STORIES__=${safeInlineJson({ stories })};</script>`, {
        html: true
      });
    }
  });

  if (heroStory) {
    const heroX = focalPoint(heroStory.cover_focal_x);
    const heroY = focalPoint(heroStory.cover_focal_y);
    const heroStyle = `background-image: linear-gradient(90deg, rgba(10, 14, 20, 0.8), rgba(10, 14, 20, 0.35)), url('${encodeURI(heroStory.cover_url)}'); background-position: center, ${heroX}% ${heroY}%;`;
    rewriter = rewriter.on(".impact-hero-image", {
      element(element) {
        element.setAttribute("style", heroStyle);
      }
    });
  }

  const transformed = rewriter.transform(assetResponse);
  const headers = new Headers(transformed.headers);
  headers.set("Cache-Control", "public, max-age=60");
  return new Response(transformed.body, {
    status: transformed.status,
    statusText: transformed.statusText,
    headers
  });
}

export async function handleListPublicStories(env) {
  const result = await env.DB.prepare(
    "SELECT * FROM stories WHERE status = 'published' ORDER BY COALESCE(published_at, updated_at) DESC"
  ).all();
  return json(
    { stories: result.results.map(storySummary) },
    { headers: { "Cache-Control": "public, max-age=300" } }
  );
}

export async function handleGetPublicStory(env, slug) {
  const story = await getStoryBySlug(env.DB, slug);
  return story
    ? json({ story }, { headers: { "Cache-Control": "public, max-age=300" } })
    : error("Story not found.", 404);
}

export async function handleStoryPage(env, slug) {
  const story = await getStoryBySlug(env.DB, slug);
  if (!story) return new Response("Story not found", { status: 404 });

  const title = escapeHtml(story.title);
  const cover = story.cover_url || story.images[0]?.url || "/summer-camp-table-tennis.jpeg";
  const gallery = story.images
    .map(
      (image) =>
        `<figure><img src="${escapeHtml(image.url)}" alt="${escapeHtml(
          image.alt_text || story.title
        )}" />${image.caption ? `<figcaption>${escapeHtml(image.caption)}</figcaption>` : ""}</figure>`
    )
    .join("");
  const eventMeta = [story.event_date, story.location].filter(Boolean).map(escapeHtml).join(" · ");
  const heroPosition = `${focalPoint(story.cover_focal_x)}% ${focalPoint(story.cover_focal_y)}%`;
  const heroZoom = coverZoom(story.cover_zoom);
  const heroAspect = coverAspect(story.cover_aspect);

  const html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /><title>${title} | Lonestar Sports Foundation</title><meta name="description" content="${escapeHtml(story.summary)}" /><meta property="og:title" content="${title}" /><meta property="og:description" content="${escapeHtml(story.summary)}" /><meta property="og:image" content="${escapeHtml(new URL(cover, "https://lonestarsportsfoundation.org").href)}" /><link rel="icon" type="image/png" href="/logo.png" /><link rel="preconnect" href="https://fonts.googleapis.com" /><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin /><link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=Oswald:wght@500;600;700&display=swap" rel="stylesheet" /><link rel="stylesheet" href="/assets/styles.css" /><script defer src="/nav.js"></script></head><body><header class="site-header"><div class="shell header-row"><a class="brand" href="/" aria-label="Lonestar Sports Foundation home"><img class="brand-logo" src="/logo.png" alt="Lonestar Sports Foundation logo" /><span class="brand-text">Lonestar Sports <span>Foundation</span></span></a><nav class="site-nav" aria-label="Primary"><a href="/programs/">Our Programs</a><a href="/impact/">Events &amp; Impact</a><a href="/about/">About Us</a><a href="/help/">How You Can Help</a><a href="/contact/">Contact Us</a></nav></div></header><main><article class="story-page"><div class="story-page-hero" style="--story-hero-aspect: ${heroAspect}"><img src="${escapeHtml(cover)}" alt="${escapeHtml(story.cover_alt || story.title)}" style="object-position: ${heroPosition}; transform: scale(${heroZoom}); transform-origin: ${heroPosition}" /></div><div class="shell story-layout"><div class="story-content"><a class="back-link" href="/impact/">← All events &amp; impact</a><p class="eyebrow eyebrow-red">${eventMeta || "Lonestar impact story"}</p><h1>${title}</h1><p class="story-lede">${escapeHtml(story.summary)}</p><div class="story-prose">${paragraphs(story.body)}</div>${story.impact ? `<aside class="story-impact"><p class="eyebrow eyebrow-red">Foundation impact</p>${paragraphs(story.impact)}</aside>` : ""}</div>${gallery ? `<section class="story-gallery" aria-label="${title} photo gallery">${gallery}</section>` : ""}</div></article></main><footer class="site-footer"><div class="shell footer-content"><img class="footer-logo" src="/logo.png" alt="Lonestar Sports Foundation logo" /><h2>Lonestar Sports Foundation</h2><p>Accessible sports for all talented youth.</p><a class="footer-link" href="/help/">Help write the next story</a></div></footer></body></html>`;

  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=300"
    }
  });
}
