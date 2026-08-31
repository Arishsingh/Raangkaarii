/**
 * Shared display formatting.
 *
 * Constructing an `Intl` formatter is the expensive half of formatting, and
 * `Number.prototype.toLocaleString` builds a fresh one on every call. These
 * run once per order line, so an orders list with fifty orders was building
 * hundreds of formatters per render. Built once here, reused everywhere.
 *
 * Not server-only: the admin tables that use these are client components.
 */

const rupeeFormat = new Intl.NumberFormat("en-IN");

/** A whole-rupee amount, e.g. `₹1,20,499`. */
export function rupees(value: number) {
  return `₹${rupeeFormat.format(value)}`;
}

const dateTimeFormat = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

/** An ISO timestamp as `31 Aug 2026, 11:06 pm`; falls back to the raw string. */
export function formatDateTime(iso: string) {
  const parsed = new Date(iso);
  // Invalid Date makes Intl throw, where the raw string is more useful.
  if (Number.isNaN(parsed.getTime())) return iso;
  return dateTimeFormat.format(parsed);
}
