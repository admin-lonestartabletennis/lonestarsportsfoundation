import { createRemoteJWKSet, jwtVerify } from "jose";
import { error } from "./http.js";

const DEFAULT_EDITORS = new Set([
  "admin@lonestarsportsfoundation.org",
  "jeff@lonestarsportsfoundation.org",
  "sathish@lonestarsportsfoundation.org",
  "siva@lonestarsportsfoundation.org",
  "kai@lonestarsportsfoundation.org"
]);

function configuredEditors(env) {
  if (!env.EDITOR_EMAILS) return DEFAULT_EDITORS;
  return new Set(env.EDITOR_EMAILS.split(",").map((email) => email.trim().toLowerCase()).filter(Boolean));
}

export async function requireEditor(context) {
  const { request, env } = context;
  const token = request.headers.get("cf-access-jwt-assertion");
  const audience = env.CF_ACCESS_API_AUD;
  const teamDomain = env.CF_ACCESS_TEAM_DOMAIN;

  if (!token || !audience || !teamDomain) {
    return { response: error("Administrator authentication is not configured.", 403) };
  }

  try {
    const issuer = teamDomain.replace(/\/$/, "");
    const jwks = createRemoteJWKSet(new URL(`${issuer}/cdn-cgi/access/certs`));
    const { payload } = await jwtVerify(token, jwks, { issuer, audience });
    const email = typeof payload.email === "string" ? payload.email.toLowerCase() : "";
    if (!configuredEditors(env).has(email)) {
      return { response: error("This account is not approved to edit stories.", 403) };
    }
    return { email };
  } catch {
    return { response: error("Your administrator session could not be verified.", 403) };
  }
}
