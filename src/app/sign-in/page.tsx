import { permanentRedirect } from "next/navigation";

/**
 * The old Clerk paths. Kept as redirects because they are linked from emails
 * and bookmarks, and because Clerk's own pages no longer exist.
 */
export default function LegacySignInPage() {
  permanentRedirect("/login");
}
