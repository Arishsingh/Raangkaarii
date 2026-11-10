/**
 * The origin used in links we email.
 *
 * It comes from configuration, never from the request's Host header —
 * otherwise a forged header could make us email a link to someone else's site.
 */
export function siteOrigin(request: Request) {
  const configured = process.env.SITE_URL?.trim();
  if (configured) return configured.replace(/\/+$/, "");
  if (process.env.NODE_ENV === "production") return "https://www.rangkaarii.in";
  return new URL(request.url).origin;
}
