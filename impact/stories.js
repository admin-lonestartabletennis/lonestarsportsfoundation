const gallery = document.querySelector("#impact-stories");
const hero = document.querySelector(".impact-hero-image");

function escapeHtml(text = "") {
  const element = document.createElement("div");
  element.textContent = text;
  return element.innerHTML;
}

function formatMeta(story) {
  return [story.event_date, story.location].filter(Boolean).map(escapeHtml).join(" · ") || "Lonestar impact story";
}

function renderStories(stories) {
  gallery.innerHTML = stories.map((story) => `<article class="impact-story dynamic-story"><a href="/impact/stories/${encodeURIComponent(story.slug)}" class="story-image-link"><img src="${story.cover_url || "/summer-camp-table-tennis.jpeg"}" alt="${escapeHtml(story.cover_alt || story.title)}" /></a><div class="impact-story-body"><p class="story-tag">${formatMeta(story)}</p><h3><a href="/impact/stories/${encodeURIComponent(story.slug)}">${escapeHtml(story.title)}</a></h3><p class="story-summary">${escapeHtml(story.summary)}</p><a class="text-link" href="/impact/stories/${encodeURIComponent(story.slug)}">Read the full story →</a></div></article>`).join("");
}

function rotateHero(stories) {
  const images = stories.map((story) => story.cover_url).filter(Boolean);
  if (!images.length) return;
  let index = 0;
  const show = () => { hero.style.backgroundImage = `linear-gradient(90deg, rgba(10, 14, 20, 0.8), rgba(10, 14, 20, 0.35)), url("${images[index]}")`; };
  show();
  if (images.length > 1) setInterval(() => { index = (index + 1) % images.length; show(); }, 6500);
}

fetch("/api/stories/")
  .then((response) => response.ok ? response.json() : Promise.reject())
  .then(({ stories }) => { if (stories?.length) { renderStories(stories); rotateHero(stories); } })
  .catch(() => {});
