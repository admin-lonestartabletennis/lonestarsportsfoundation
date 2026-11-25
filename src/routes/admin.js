import { requireEditor } from "../lib/auth.js";
import { cleanText, error, json, safeSlug } from "../lib/http.js";
import { getImages, storySummary } from "../lib/stories.js";

const VALID_ASPECTS = new Set(["16:9", "3:2", "2:1", "4:3"]);
const ACCEPTED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

const clampFocal = (value) => Math.min(100, Math.max(0, Number(value) || 50));
const clampZoom = (value) => Math.min(200, Math.max(100, Number(value) || 100));
const validAspect = (value) => (VALID_ASPECTS.has(value) ? value : "16:9");

function normalizeStoryInput(input) {
  const title = cleanText(input.title, 140);
  const summary = cleanText(input.summary, 360);
  const slug = safeSlug(input.slug || title);
  if (!title || !summary || !slug) {
    return { errorMessage: "Title, short summary, and URL slug are required." };
  }

  return {
    title,
    summary,
    slug,
    body: cleanText(input.body),
    impact: cleanText(input.impact, 3000),
    eventDate: cleanText(input.event_date, 30) || null,
    location: cleanText(input.location, 160) || null,
    status: input.status === "published" ? "published" : "draft",
    coverAlt: cleanText(input.cover_alt, 240),
    coverFocalX: clampFocal(input.cover_focal_x),
    coverFocalY: clampFocal(input.cover_focal_y),
    coverZoom: clampZoom(input.cover_zoom),
    coverAspect: validAspect(input.cover_aspect),
    coverKey: cleanText(input.cover_key, 500)
  };
}

async function storyOr404(env, id) {
  return env.DB.prepare("SELECT * FROM stories WHERE id = ?").bind(id).first();
}

export async function handleListAdminStories(request, env) {
  const auth = await requireEditor(request, env);
  if (auth.response) return auth.response;

  const result = await env.DB.prepare("SELECT * FROM stories ORDER BY updated_at DESC").all();
  return json({ stories: result.results.map(storySummary), editor: auth.email });
}

export async function handleCreateAdminStory(request, env) {
  const auth = await requireEditor(request, env);
  if (auth.response) return auth.response;

  let input;
  try {
    input = await request.json();
  } catch {
    return error("Enter the story details before saving.");
  }

  const parsed = normalizeStoryInput(input);
  if (parsed.errorMessage) return error(parsed.errorMessage);

  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  try {
    await env.DB.prepare(
      `INSERT INTO stories (id, slug, title, summary, body, impact, event_date, location, status, cover_alt, cover_focal_x, cover_focal_y, cover_zoom, cover_aspect, created_at, updated_at, published_at, created_by, updated_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        id,
        parsed.slug,
        parsed.title,
        parsed.summary,
        parsed.body,
        parsed.impact,
        parsed.eventDate,
        parsed.location,
        parsed.status,
        parsed.coverAlt,
        parsed.coverFocalX,
        parsed.coverFocalY,
        parsed.coverZoom,
        parsed.coverAspect,
        now,
        now,
        parsed.status === "published" ? now : null,
        auth.email,
        auth.email
      )
      .run();

    const story = await storyOr404(env, id);
    return json({ story: storySummary(story) }, { status: 201 });
  } catch (exception) {
    return error(
      exception.message.includes("UNIQUE")
        ? "That URL slug is already in use."
        : "Could not create the story.",
      400
    );
  }
}

export async function handleGetAdminStory(request, env, id) {
  const auth = await requireEditor(request, env);
  if (auth.response) return auth.response;

  const story = await storyOr404(env, id);
  if (!story) return error("Story not found.", 404);
  return json({ story: { ...story, images: await getImages(env.DB, story.id) } });
}

export async function handleUpdateAdminStory(request, env, id) {
  const auth = await requireEditor(request, env);
  if (auth.response) return auth.response;

  const current = await storyOr404(env, id);
  if (!current) return error("Story not found.", 404);

  let input;
  try {
    input = await request.json();
  } catch {
    return error("Invalid story details.");
  }

  const parsed = normalizeStoryInput(input);
  if (parsed.errorMessage) return error(parsed.errorMessage);

  const now = new Date().toISOString();
  const coverKey = parsed.coverKey || current.cover_key;
  const publishedAt = parsed.status === "published" ? current.published_at || now : null;

  try {
    await env.DB.prepare(
      `UPDATE stories SET slug=?, title=?, summary=?, body=?, impact=?, event_date=?, location=?, status=?, cover_key=?, cover_alt=?, cover_focal_x=?, cover_focal_y=?, cover_zoom=?, cover_aspect=?, updated_at=?, published_at=?, updated_by=? WHERE id=?`
    )
      .bind(
        parsed.slug,
        parsed.title,
        parsed.summary,
        parsed.body,
        parsed.impact,
        parsed.eventDate,
        parsed.location,
        parsed.status,
        coverKey,
        parsed.coverAlt,
        parsed.coverFocalX,
        parsed.coverFocalY,
        parsed.coverZoom,
        parsed.coverAspect,
        now,
        publishedAt,
        auth.email,
        current.id
      )
      .run();

    const story = await storyOr404(env, current.id);
    return json({ story: storySummary(story) });
  } catch (exception) {
    return error(
      exception.message.includes("UNIQUE")
        ? "That URL slug is already in use."
        : "Could not save the story.",
      400
    );
  }
}

export async function handleDeleteAdminStory(request, env, id) {
  const auth = await requireEditor(request, env);
  if (auth.response) return auth.response;

  const story = await storyOr404(env, id);
  if (!story) return error("Story not found.", 404);

  const images = await getImages(env.DB, story.id);
  await env.DB.batch([
    env.DB.prepare("DELETE FROM story_images WHERE story_id = ?").bind(story.id),
    env.DB.prepare("DELETE FROM stories WHERE id = ?").bind(story.id)
  ]);

  const keys = [story.cover_key, ...images.map((image) => image.object_key)].filter(Boolean);
  await Promise.all(keys.map((key) => env.STORY_MEDIA.delete(key)));
  return json({ deleted: true });
}

export async function handleUploadAdminMedia(request, env) {
  const auth = await requireEditor(request, env);
  if (auth.response) return auth.response;

  const form = await request.formData();
  const image = form.get("image");
  const storyId = cleanText(form.get("story_id"), 80);
  const altText = cleanText(form.get("alt_text"), 240);
  const caption = cleanText(form.get("caption"), 600);
  const isCover = form.get("is_cover") === "true";

  if (!(image instanceof File) || !storyId) {
    return error("Choose an image and save the story first.");
  }
  if (!ACCEPTED_IMAGE_TYPES.has(image.type) || image.size > MAX_IMAGE_BYTES) {
    return error("Images must be JPG, PNG, or WebP and no larger than 8 MB.");
  }

  const story = await env.DB.prepare("SELECT id FROM stories WHERE id = ?").bind(storyId).first();
  if (!story) return error("Story not found.", 404);

  const extension =
    image.type === "image/png" ? "png" : image.type === "image/webp" ? "webp" : "jpg";
  const key = `stories/${storyId}/${crypto.randomUUID()}.${extension}`;
  const now = new Date().toISOString();

  await env.STORY_MEDIA.put(key, image.stream(), { httpMetadata: { contentType: image.type } });

  if (isCover) {
    await env.DB.prepare(
      "UPDATE stories SET cover_key = ?, cover_alt = ?, updated_at = ?, updated_by = ? WHERE id = ?"
    )
      .bind(key, altText, now, auth.email, storyId)
      .run();
  }

  const imageId = crypto.randomUUID();
  const position = await env.DB.prepare(
    "SELECT COALESCE(MAX(position), -1) + 1 AS position FROM story_images WHERE story_id = ?"
  )
    .bind(storyId)
    .first();

  await env.DB.prepare(
    "INSERT INTO story_images (id, story_id, object_key, alt_text, caption, position, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
  )
    .bind(imageId, storyId, key, altText, caption, position.position, now)
    .run();

  return json(
    {
      image: {
        id: imageId,
        object_key: key,
        alt_text: altText,
        caption,
        position: position.position,
        url: `/media/${key}`
      }
    },
    { status: 201 }
  );
}

export async function handleDeleteAdminImage(request, env, id) {
  const auth = await requireEditor(request, env);
  if (auth.response) return auth.response;

  const image = await env.DB.prepare("SELECT * FROM story_images WHERE id = ?").bind(id).first();
  if (!image) return error("Image not found.", 404);

  await env.DB.batch([
    env.DB.prepare("DELETE FROM story_images WHERE id = ?").bind(image.id),
    env.DB.prepare("UPDATE stories SET cover_key = NULL, cover_alt = '' WHERE id = ? AND cover_key = ?")
      .bind(image.story_id, image.object_key)
  ]);

  await env.STORY_MEDIA.delete(image.object_key);
  return json({ deleted: true });
}
