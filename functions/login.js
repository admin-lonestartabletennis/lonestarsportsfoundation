export function onRequestGet({ request }) {
  return Response.redirect(new URL("/admin/", request.url), 302);
}
