/** Where someone lands when nothing else was asked for. */
export const DEFAULT_REDIRECT = "/dashboard";

const OWN_ORIGIN = "https://rangkaarii.invalid";

/**
 * Keeps a callbackUrl to this site.
 *
 * The value arrives in a query string, so anyone can put anything in it, and a
 * sign-in page that follows it off-site is an open redirect. Prefix checks alone
 * are not enough: browsers strip tabs and newlines and read backslashes as
 * slashes, so "/\t/evil.example" or "/\\evil.example" become "//evil.example".
 * Instead the value is resolved the way a browser would, and kept only if it
 * stays on our own origin — returned as path, query and hash only.
 */
export function safeCallbackUrl(value: string | null | undefined) {
  if (!value || !value.startsWith("/")) return DEFAULT_REDIRECT;

  let resolved: URL;
  try {
    resolved = new URL(value, OWN_ORIGIN);
  } catch {
    return DEFAULT_REDIRECT;
  }
  if (resolved.origin !== OWN_ORIGIN) return DEFAULT_REDIRECT;

  return `${resolved.pathname}${resolved.search}${resolved.hash}`;
}

/**
 * Pages a guest cannot open. Browsing, product pages and the cart are open to
 * everyone; sign-in is asked for when they go to place the order.
 */
export const PROTECTED_PREFIXES = [
  "/dashboard/checkout",
  "/dashboard/orders",
  "/admin",
  "/profile",
  "/settings",
];

export function isProtectedPath(pathname: string) {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

/**
 * Where to send a request, or null to let it through. A guest heading for a
 * protected page goes to sign in, carrying where they were headed so they land
 * on it afterwards: "Place order" comes back to checkout. Only path and query
 * are carried; a full URL would let a crafted link bounce someone off-site.
 */
export function loginRedirectFor(pathname: string, search: string, signedIn: boolean) {
  if (signedIn || !isProtectedPath(pathname)) return null;
  return `/login?callbackUrl=${encodeURIComponent(`${pathname}${search}`)}`;
}
