import { error, methodNotAllowed } from "./lib/http.js";
import {
  handleCreateAdminStory,
  handleDeleteAdminImage,
  handleDeleteAdminStory,
  handleGetAdminStory,
  handleListAdminStories,
  handleUpdateAdminStory,
  handleUploadAdminMedia
} from "./routes/admin.js";
import {
  handleGetPublicStory,
  handleImpactPage,
  handleListPublicStories,
  handleLogin,
  handleMedia,
  handleStoryPage
} from "./routes/public.js";

function decodeSegment(segment) {
  try {
    return decodeURIComponent(segment);
  } catch {
    return "";
  }
}

/**
 * Dispatch /admin/api/* and /api/admin/* endpoints identically.
 */
async function routeAdminApi(request, env, subPath) {
  const method = request.method;

  if (subPath === "/stories" || subPath === "/stories/") {
    if (method === "GET") return handleListAdminStories(request, env);
    if (method === "POST") return handleCreateAdminStory(request, env);
    return methodNotAllowed(["GET", "POST"]);
  }

  if (subPath.startsWith("/stories/")) {
    const id = decodeSegment(subPath.slice("/stories/".length));
    if (!id || id.includes("/")) return error("Story not found.", 404);
    if (method === "GET") return handleGetAdminStory(request, env, id);
    if (method === "PUT") return handleUpdateAdminStory(request, env, id);
    if (method === "DELETE") return handleDeleteAdminStory(request, env, id);
    return methodNotAllowed(["GET", "PUT", "DELETE"]);
  }

  if (subPath === "/media" || subPath === "/media/") {
    if (method === "POST") return handleUploadAdminMedia(request, env);
    return methodNotAllowed(["POST"]);
  }

  if (subPath.startsWith("/images/")) {
    const id = decodeSegment(subPath.slice("/images/".length));
    if (!id || id.includes("/")) return error("Image not found.", 404);
    if (method === "DELETE") return handleDeleteAdminImage(request, env, id);
    return methodNotAllowed(["DELETE"]);
  }

  return error("Not found.", 404);
}

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);
    const method = request.method;

    if (pathname === "/login" || pathname === "/login/") {
      if (method === "GET") return handleLogin(request);
      return methodNotAllowed(["GET"]);
    }

    if (pathname.startsWith("/media/")) {
      if (method === "GET") return handleMedia(env, pathname.slice("/media/".length));
      return methodNotAllowed(["GET"]);
    }

    if (pathname === "/impact" || pathname === "/impact/") {
      if (method === "GET") return handleImpactPage(request, env);
      return methodNotAllowed(["GET"]);
    }

    if (pathname.startsWith("/impact/stories/")) {
      const slug = decodeSegment(pathname.slice("/impact/stories/".length).replace(/\/$/, ""));
      if (!slug || slug.includes("/")) return new Response("Story not found", { status: 404 });
      if (method === "GET") return handleStoryPage(env, slug);
      return methodNotAllowed(["GET"]);
    }

    if (pathname === "/api/stories" || pathname === "/api/stories/") {
      if (method === "GET") return handleListPublicStories(env);
      return methodNotAllowed(["GET"]);
    }

    if (pathname.startsWith("/api/stories/")) {
      const slug = decodeSegment(pathname.slice("/api/stories/".length).replace(/\/$/, ""));
      if (!slug || slug.includes("/")) return error("Story not found.", 404);
      if (method === "GET") return handleGetPublicStory(env, slug);
      return methodNotAllowed(["GET"]);
    }

    if (pathname.startsWith("/admin/api/")) {
      return routeAdminApi(request, env, pathname.slice("/admin/api".length));
    }

    if (pathname.startsWith("/api/admin/")) {
      return routeAdminApi(request, env, pathname.slice("/api/admin".length));
    }

    return env.ASSETS.fetch(request);
  },

  // Scheduled cron entrypoint ready for upcoming background jobs.
  async scheduled(_controller, _env, _ctx) {}
};
