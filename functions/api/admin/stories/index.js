import { requireEditor } from "../../../_lib/auth.js";
import { cleanText, error, json, safeSlug } from "../../../_lib/http.js";
import { storySummary } from "../../../_lib/stories.js";

export async function onRequestGet(context) {
  const auth = await requireEditor(context);
  if (auth.response) return auth.response;
  const result = await context.env.DB.prepare("SELECT * FROM stories ORDER BY updated_at DESC").all();
  return json({ stories: result.results.map(storySummary), editor: auth.email });
}

export async function onRequestPost(context) {
  const auth = await requireEditor(context);
  if (auth.response) return auth.response;
  let input;
  try { input = await context.request.json(); } catch { return error("Enter the story details before saving."); }

  const title = cleanText(input.title, 140);
  const summary = cleanText(input.summary, 360);
  const slug = safeSlug(input.slug || title);
  if (!title || !summary || !slug) return error("Title, short summary, and URL slug are required.");

  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const status = input.status === "published" ? "published" : "draft";
  try {
    await context.env.DB.prepare(
      `INSERT INTO stories (id, slug, title, summary, body, impact, event_date, location, status, cover_alt, cover_focal_x, cover_focal_y, created_at, updated_at, published_at, created_by, updated_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      id, slug, title, summary, cleanText(input.body), cleanText(input.impact, 3000), cleanText(input.event_date, 30) || null,
      cleanText(input.location, 160) || null, status, cleanText(input.cover_alt, 240), now, now,
      Math.min(100, Math.max(0, Number(input.cover_focal_x) || 50)), Math.min(100, Math.max(0, Number(input.cover_focal_y) || 50)),
      now, now, status === "published" ? now : null, auth.email, auth.email
    ).run();
    const story = await context.env.DB.prepare("SELECT * FROM stories WHERE id = ?").bind(id).first();
    return json({ story: storySummary(story) }, { status: 201 });
  } catch (exception) {
    return error(exception.message.includes("UNIQUE") ? "That URL slug is already in use." : "Could not create the story.", 400);
  }
}
