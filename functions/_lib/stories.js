export function imageUrl(key) {
  return key ? `/media/${key}` : "";
}

export function storySummary(story) {
  return {
    id: story.id,
    slug: story.slug,
    title: story.title,
    summary: story.summary,
    event_date: story.event_date,
    location: story.location,
    status: story.status,
    cover_alt: story.cover_alt,
    cover_focal_x: story.cover_focal_x ?? 50,
    cover_focal_y: story.cover_focal_y ?? 50,
    cover_url: imageUrl(story.cover_key),
    published_at: story.published_at,
    updated_at: story.updated_at
  };
}

export async function getImages(db, storyId) {
  const result = await db
    .prepare("SELECT id, object_key, alt_text, caption, position FROM story_images WHERE story_id = ? ORDER BY position ASC, created_at ASC")
    .bind(storyId)
    .all();
  return result.results.map((image) => ({ ...image, url: imageUrl(image.object_key) }));
}

export async function getStoryBySlug(db, slug, includeDraft = false) {
  const condition = includeDraft ? "" : " AND status = 'published'";
  const story = await db.prepare(`SELECT * FROM stories WHERE slug = ?${condition}`).bind(slug).first();
  if (!story) return null;
  return { ...storySummary(story), body: story.body, impact: story.impact, images: await getImages(db, story.id) };
}
