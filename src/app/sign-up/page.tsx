import { permanentRedirect } from "next/navigation";

/** The old Clerk path; see the note on /sign-in. */
export default function LegacySignUpPage() {
  permanentRedirect("/signup");
}
