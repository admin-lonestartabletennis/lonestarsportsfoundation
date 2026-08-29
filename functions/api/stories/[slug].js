import { error, json } from "../../_lib/http.js";
import { getStoryBySlug } from "../../_lib/stories.js";

export async function onRequestGet({ env, params }) {
  const story = await getStoryBySlug(env.DB, params.slug);
  return story
    ? json({ story }, { headers: { "Cache-Control": "public, max-age=300" } })
    : error("Story not found.", 404);
}
