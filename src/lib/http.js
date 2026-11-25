/**
 * Return a JSON response with no-store caching for API endpoints.
 */
export function json(data, init = {}) {
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json; charset=utf-8");
  headers.set("Cache-Control", "no-store");
  return new Response(JSON.stringify(data), { ...init, headers });
}

/**
 * Return a JSON error response.
 */
export function error(message, status = 400) {
  return json({ error: message }, { status });
}

/**
 * Return a 405 Method Not Allowed response with an Allow header.
 */
export function methodNotAllowed(allowedMethods) {
  return new Response("Method Not Allowed", {
    status: 405,
    headers: { Allow: allowedMethods.join(", ") }
  });
}

/**
 * Trim and bound a string field.
 */
export function cleanText(value, maxLength = 10000) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

/**
 * Normalize a string into a URL-safe slug.
 */
export function safeSlug(value) {
  return cleanText(value, 140)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);
}
