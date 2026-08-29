import { requireEditor } from "../../../_lib/auth.js";
import { cleanText, error, json, safeSlug } from "../../../_lib/http.js";
import { getImages, storySummary } from "../../../_lib/stories.js";

async function storyOr404(env, id) {
  return env.DB.prepare("SELECT * FROM stories WHERE id = ?").bind(id).first();
}

export async function onRequestGet(context) {
  const auth = await requireEditor(context);
  if (auth.response) return auth.response;
  const story = await storyOr404(context.env, context.params.id);
  if (!story) return error("Story not found.", 404);
  return json({ story: { ...story, images: await getImages(context.env.DB, story.id) } });
}

export async function onRequestPut(context) {
  const auth = await requireEditor(context);
  if (auth.response) return auth.response;
  const current = await storyOr404(context.env, context.params.id);
  if (!current) return error("Story not found.", 404);
  let input;
  try { input = await context.request.json(); } catch { return error("Invalid story details."); }
  const title = cleanText(input.title, 140);
  const summary = cleanText(input.summary, 360);
  const slug = safeSlug(input.slug || title);
  if (!title || !summary || !slug) return error("Title, short summary, and URL slug are required.");
  const now = new Date().toISOString();
  const status = input.status === "published" ? "published" : "draft";
  const coverKey = cleanText(input.cover_key, 500) || current.cover_key;
  const publishedAt = status === "published" ? (current.published_at || now) : null;
  try {
    await context.env.DB.prepare(
      `UPDATE stories SET slug=?, title=?, summary=?, body=?, impact=?, event_date=?, location=?, status=?, cover_key=?, cover_alt=?, cover_focal_x=?, cover_focal_y=?, updated_at=?, published_at=?, updated_by=? WHERE id=?`
    ).bind(slug, title, summary, cleanText(input.body), cleanText(input.impact, 3000), cleanText(input.event_date, 30) || null,
      cleanText(input.location, 160) || null, status, coverKey, cleanText(input.cover_alt, 240),
      Math.min(100, Math.max(0, Number(input.cover_focal_x) || 50)), Math.min(100, Math.max(0, Number(input.cover_focal_y) || 50)),
      now, publishedAt, auth.email, current.id).run();
    const story = await storyOr404(context.env, current.id);
    return json({ story: storySummary(story) });
  } catch (exception) {
    return error(exception.message.includes("UNIQUE") ? "That URL slug is already in use." : "Could not save the story.", 400);
  }
}

export async function onRequestDelete(context) {
  const auth = await requireEditor(context);
  if (auth.response) return auth.response;
  const story = await storyOr404(context.env, context.params.id);
  if (!story) return error("Story not found.", 404);
  const images = await getImages(context.env.DB, story.id);
  await context.env.DB.batch([
    context.env.DB.prepare("DELETE FROM story_images WHERE story_id = ?").bind(story.id),
    context.env.DB.prepare("DELETE FROM stories WHERE id = ?").bind(story.id)
  ]);
  const keys = [story.cover_key, ...images.map((image) => image.object_key)].filter(Boolean);
  await Promise.all(keys.map((key) => context.env.STORY_MEDIA.delete(key)));
  return json({ deleted: true });
}
