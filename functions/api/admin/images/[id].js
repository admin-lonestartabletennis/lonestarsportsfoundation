import { requireEditor } from "../../../_lib/auth.js";
import { error, json } from "../../../_lib/http.js";

export async function onRequestDelete(context) {
  const auth = await requireEditor(context);
  if (auth.response) return auth.response;
  const image = await context.env.DB.prepare("SELECT * FROM story_images WHERE id = ?").bind(context.params.id).first();
  if (!image) return error("Image not found.", 404);
  await context.env.DB.batch([
    context.env.DB.prepare("DELETE FROM story_images WHERE id = ?").bind(image.id),
    context.env.DB.prepare("UPDATE stories SET cover_key = NULL, cover_alt = '' WHERE id = ? AND cover_key = ?").bind(image.story_id, image.object_key)
  ]);
  await context.env.STORY_MEDIA.delete(image.object_key);
  return json({ deleted: true });
}
