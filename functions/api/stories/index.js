import { json } from "../../_lib/http.js";
import { storySummary } from "../../_lib/stories.js";

export async function onRequestGet({ env }) {
  const result = await env.DB
    .prepare("SELECT * FROM stories WHERE status = 'published' ORDER BY COALESCE(published_at, updated_at) DESC")
    .all();
  return json({ stories: result.results.map(storySummary) }, { headers: { "Cache-Control": "public, max-age=300" } });
}
