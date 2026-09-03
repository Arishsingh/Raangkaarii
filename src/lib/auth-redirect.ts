/** Where someone lands when nothing else was asked for. */
export const DEFAULT_REDIRECT = "/dashboard";

/**
 * Keeps a callbackUrl to this site.
 *
 * The value arrives in a query string, so anyone can put anything in it. Only
 * a single-slash absolute path is accepted: `//evil.example` and
 * `https://evil.example` are both browser-valid redirects away from the shop,
 * and a sign-in page that honours them is an open redirect.
 */
export function safeCallbackUrl(value: string | null | undefined) {
  if (!value) return DEFAULT_REDIRECT;
  if (!value.startsWith("/") || value.startsWith("//")) return DEFAULT_REDIRECT;
  // Backslashes are normalised to slashes by some browsers, so "/\evil" counts.
  if (value.startsWith("/\\")) return DEFAULT_REDIRECT;
  return value;
}
