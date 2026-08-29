import { requireEditor } from "../../_lib/auth.js";
import { cleanText, error, json } from "../../_lib/http.js";

const ACCEPTED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

export async function onRequestPost(context) {
  const auth = await requireEditor(context);
  if (auth.response) return auth.response;
  const form = await context.request.formData();
  const image = form.get("image");
  const storyId = cleanText(form.get("story_id"), 80);
  const altText = cleanText(form.get("alt_text"), 240);
  const caption = cleanText(form.get("caption"), 600);
  const isCover = form.get("is_cover") === "true";
  if (!(image instanceof File) || !storyId) return error("Choose an image and save the story first.");
  if (!ACCEPTED_TYPES.has(image.type) || image.size > MAX_IMAGE_BYTES) {
    return error("Images must be JPG, PNG, or WebP and no larger than 8 MB.");
  }
  const story = await context.env.DB.prepare("SELECT id FROM stories WHERE id = ?").bind(storyId).first();
  if (!story) return error("Story not found.", 404);
  const extension = image.type === "image/png" ? "png" : image.type === "image/webp" ? "webp" : "jpg";
  const key = `stories/${storyId}/${crypto.randomUUID()}.${extension}`;
  const now = new Date().toISOString();
  await context.env.STORY_MEDIA.put(key, image.stream(), { httpMetadata: { contentType: image.type } });
  if (isCover) {
    await context.env.DB.prepare("UPDATE stories SET cover_key = ?, cover_alt = ?, updated_at = ?, updated_by = ? WHERE id = ?")
      .bind(key, altText, now, auth.email, storyId).run();
  }
  const imageId = crypto.randomUUID();
  const position = await context.env.DB.prepare("SELECT COALESCE(MAX(position), -1) + 1 AS position FROM story_images WHERE story_id = ?").bind(storyId).first();
  await context.env.DB.prepare(
    "INSERT INTO story_images (id, story_id, object_key, alt_text, caption, position, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
  ).bind(imageId, storyId, key, altText, caption, position.position, now).run();
  return json({ image: { id: imageId, object_key: key, alt_text: altText, caption, position: position.position, url: `/media/${key}` } }, { status: 201 });
}
