import { getStoryBySlug } from "../../_lib/stories.js";

function escapeHtml(value = "") {
  return value.replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]);
}

function paragraphs(value) {
  return escapeHtml(value).split(/\n\s*\n/).filter(Boolean).map((paragraph) => `<p>${paragraph.replace(/\n/g, "<br />")}</p>`).join("");
}

export async function onRequestGet({ env, params }) {
  const story = await getStoryBySlug(env.DB, params.slug);
  if (!story) return new Response("Story not found", { status: 404 });
  const title = escapeHtml(story.title);
  const cover = story.cover_url || story.images[0]?.url || "/summer-camp-table-tennis.jpeg";
  const gallery = story.images.map((image) => `<figure><img src="${escapeHtml(image.url)}" alt="${escapeHtml(image.alt_text || story.title)}" />${image.caption ? `<figcaption>${escapeHtml(image.caption)}</figcaption>` : ""}</figure>`).join("");
  const eventMeta = [story.event_date, story.location].filter(Boolean).map(escapeHtml).join(" · ");
  const html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /><title>${title} | Lonestar Sports Foundation</title><meta name="description" content="${escapeHtml(story.summary)}" /><meta property="og:title" content="${title}" /><meta property="og:description" content="${escapeHtml(story.summary)}" /><meta property="og:image" content="${escapeHtml(new URL(cover, "https://lonestarsportsfoundation.org").href)}" /><link rel="icon" type="image/png" href="/logo.png" /><link rel="preconnect" href="https://fonts.googleapis.com" /><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin /><link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=Oswald:wght@500;600;700&display=swap" rel="stylesheet" /><link rel="stylesheet" href="/assets/styles.css" /></head><body><header class="site-header"><div class="shell header-row"><a class="brand" href="/" aria-label="Lonestar Sports Foundation home"><img class="brand-logo" src="/logo.png" alt="Lonestar Sports Foundation logo" /><span class="brand-text">Lonestar Sports <span>Foundation</span></span></a><nav class="site-nav" aria-label="Primary"><a href="/programs/">Our Programs</a><a href="/impact/">Events &amp; Impact</a><a href="/about/">About Us</a><a href="/help/">How You Can Help</a><a href="/contact/">Contact Us</a></nav></div></header><main><article class="story-page"><div class="story-page-hero"><img src="${escapeHtml(cover)}" alt="${escapeHtml(story.cover_alt || story.title)}" /></div><div class="shell story-layout"><div class="story-content"><a class="back-link" href="/impact/">← All events &amp; impact</a><p class="eyebrow eyebrow-red">${eventMeta || "Lonestar impact story"}</p><h1>${title}</h1><p class="story-lede">${escapeHtml(story.summary)}</p><div class="story-prose">${paragraphs(story.body)}</div>${story.impact ? `<aside class="story-impact"><p class="eyebrow eyebrow-red">Foundation impact</p>${paragraphs(story.impact)}</aside>` : ""}</div>${gallery ? `<section class="story-gallery" aria-label="${title} photo gallery">${gallery}</section>` : ""}</div></article></main><footer class="site-footer"><div class="shell footer-content"><img class="footer-logo" src="/logo.png" alt="Lonestar Sports Foundation logo" /><h2>Lonestar Sports Foundation</h2><p>Accessible sports for all talented youth.</p><a class="footer-link" href="/help/">Help write the next story</a></div></footer></body></html>`;
  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "public, max-age=300" } });
}
