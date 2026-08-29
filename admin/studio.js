const api = "/api/admin";
const form = document.querySelector("#story-form");
const notice = document.querySelector("#notice");
const storyList = document.querySelector("#story-list");
const mediaEditor = document.querySelector("#media-editor");
const fields = ["title", "slug", "summary", "event-date", "location", "status", "body", "impact"];
let stories = [];
let currentStory = null;

function message(text, type = "") { notice.textContent = text; notice.className = `admin-notice ${type}`; }
function request(url, options = {}) {
  return fetch(url, { ...options, headers: { ...(options.headers || {}), ...(options.body instanceof FormData ? {} : { "Content-Type": "application/json" }) } })
    .then(async (response) => {
      const contentType = response.headers.get("content-type") || "";
      const data = contentType.includes("application/json") ? await response.json() : {};
      if (!response.ok) throw new Error(data.error || "Something went wrong.");
      if (!contentType.includes("application/json")) {
        throw new Error("Impact Studio could not reach its protected API. Confirm that the /api/admin/* Cloudflare Access application is configured and that you are approved for it.");
      }
      return data;
    });
}
function value(id) { return document.querySelector(`#${id}`).value.trim(); }
function setValue(id, value = "") { document.querySelector(`#${id}`).value = value || ""; }

function renderList() {
  storyList.innerHTML = stories.length ? stories.map((story) => `<button type="button" class="admin-story-item ${currentStory?.id === story.id ? "is-active" : ""}" data-id="${story.id}"><span>${story.status}</span>${escapeHtml(story.title)}<small>${escapeHtml(story.slug)}</small></button>`).join("") : "<p class=\"empty-state\">No stories yet. Create your first draft.</p>";
  storyList.querySelectorAll("[data-id]").forEach((button) => button.addEventListener("click", () => openStory(button.dataset.id)));
}

function escapeHtml(text = "") { const box = document.createElement("div"); box.textContent = text; return box.innerHTML; }

async function refreshList() {
  const data = await request(`${api}/stories/`);
  if (!Array.isArray(data.stories)) throw new Error("Impact Studio did not receive a story list. Confirm the DB binding and API Access configuration.");
  stories = data.stories;
  document.querySelector("#editor-status").textContent = `Signed in as ${data.editor}`;
  renderList();
}

function resetForm() {
  form.reset(); currentStory = null; setValue("story-id"); mediaEditor.hidden = true;
  document.querySelector("#form-heading").textContent = "New draft";
  document.querySelector("#delete-story").hidden = true; renderList(); message("");
}

async function openStory(id) {
  try {
    const { story } = await request(`${api}/stories/${id}`);
    currentStory = story; setValue("story-id", story.id); setValue("title", story.title); setValue("slug", story.slug); setValue("summary", story.summary); setValue("event-date", story.event_date); setValue("location", story.location); setValue("status", story.status); setValue("body", story.body); setValue("impact", story.impact);
    document.querySelector("#form-heading").textContent = story.title; document.querySelector("#delete-story").hidden = false; mediaEditor.hidden = false; renderList(); renderGallery(story); message("");
  } catch (err) { message(err.message, "is-error"); }
}

function renderGallery(story) {
  const gallery = document.querySelector("#gallery");
  gallery.innerHTML = story.images.length ? story.images.map((image) => `<figure class="admin-photo"><img src="${image.url}" alt="${escapeHtml(image.alt_text)}" /><figcaption>${escapeHtml(image.caption || image.alt_text || "Untitled image")}</figcaption><button type="button" class="remove-image" data-image-id="${image.id}">Remove photo</button></figure>`).join("") : "<p class=\"empty-state\">Upload a cover image, then add supporting gallery photos.</p>";
  gallery.querySelectorAll(".remove-image").forEach((button) => button.addEventListener("click", async () => { if (!confirm("Remove this photo from the story?")) return; try { await request(`${api}/images/${button.dataset.imageId}`, { method: "DELETE" }); await openStory(currentStory.id); message("Photo removed.", "is-success"); } catch (err) { message(err.message, "is-error"); } }));
}

function payload() { return { title: value("title"), slug: value("slug"), summary: value("summary"), event_date: value("event-date"), location: value("location"), status: value("status"), body: value("body"), impact: value("impact") }; }

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    const id = value("story-id"); const data = await request(id ? `${api}/stories/${id}` : `${api}/stories/`, { method: id ? "PUT" : "POST", body: JSON.stringify(payload()) });
    await refreshList(); await openStory(data.story.id); message(id ? "Story saved." : "Draft created. You can now upload photos.", "is-success");
  } catch (err) { message(err.message, "is-error"); }
});

document.querySelector("#new-story").addEventListener("click", resetForm);
document.querySelector("#delete-story").addEventListener("click", async () => { if (!currentStory || !confirm(`Delete “${currentStory.title}” and all of its photos? This cannot be undone.`)) return; try { await request(`${api}/stories/${currentStory.id}`, { method: "DELETE" }); await refreshList(); resetForm(); message("Story deleted.", "is-success"); } catch (err) { message(err.message, "is-error"); } });
document.querySelector("#upload-image").addEventListener("click", async () => { const file = document.querySelector("#image-file").files[0]; if (!file || !currentStory) return message("Choose an image first.", "is-error"); const data = new FormData(); data.append("image", file); data.append("story_id", currentStory.id); data.append("alt_text", value("image-alt")); data.append("caption", value("image-caption")); data.append("is_cover", document.querySelector("#is-cover").checked); try { await request(`${api}/media`, { method: "POST", body: data }); document.querySelector("#image-file").value = ""; setValue("image-alt"); setValue("image-caption"); document.querySelector("#is-cover").checked = false; await openStory(currentStory.id); await refreshList(); message("Photo uploaded.", "is-success"); } catch (err) { message(err.message, "is-error"); } });

refreshList().catch((err) => { document.querySelector("#editor-status").textContent = "Editor access unavailable"; message(`${err.message} Configure Cloudflare Access and the required environment variables before using Impact Studio.`, "is-error"); });
