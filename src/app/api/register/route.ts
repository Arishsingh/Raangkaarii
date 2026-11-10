import bcrypt from "bcryptjs";

import { BCRYPT_ROUNDS } from "@/auth";
import { EMAIL_PATTERN, PASSWORD_MIN_LENGTH } from "@/lib/auth-rules";
import { emailConfigured } from "@/lib/email";
import { sendVerificationLink } from "@/lib/email-verification";
import { siteOrigin } from "@/lib/site-origin";
import {
  createCredentialsUser,
  findUserByEmail,
  normaliseEmail,
} from "@/lib/users-store";

/**
 * Registration. Auth.js has no sign-up flow of its own — the credentials
 * provider only ever checks an existing password — so this is the one endpoint
 * the app adds around it.
 *
 * No session is minted here. The new account is emailed a confirmation link
 * and cannot sign in until it is opened — admin access is decided by email
 * address, so an address nobody has proven must never sign in.
 */
type Body = {
  name?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
};

function bad(error: string, status = 400) {
  return Response.json({ error }, { status });
}

export async function POST(request: Request) {
  let body: Body;
  try {
    body = await request.json();
  } catch {
    return bad("Invalid request.");
  }

  /**
   * Re-checked here in full. The form runs the same rules for the sake of a
   * quick answer, but nothing it reports is trusted — this is a public
   * endpoint, and the browser is not the only thing that can post to it.
   */
  const email = normaliseEmail(String(body.email ?? ""));
  const password = String(body.password ?? "");
  const confirmPassword = String(body.confirmPassword ?? "");
  const name = String(body.name ?? "").trim();

  if (!EMAIL_PATTERN.test(email)) {
    return bad("Please enter a valid email address.");
  }
  if (password.length < PASSWORD_MIN_LENGTH) {
    return bad(`Password must be at least ${PASSWORD_MIN_LENGTH} characters.`);
  }
  // Only enforced when the field is sent, so the rule lives in one place.
  if (confirmPassword && confirmPassword !== password) {
    return bad("Passwords do not match.");
  }

  // Without email the account could never be confirmed, so do not create it.
  if (!emailConfigured()) {
    console.error("Sign-up attempted but RESEND_API_KEY is not set");
    return bad("Sign-up isn't available right now. Please try again later.", 503);
  }

  try {
    if (await findUserByEmail(email)) {
      return Response.json(
        {
          error:
            "An account already uses this email. Sign in, or use “Forgot password” if you can't.",
          existingAccount: true,
        },
        { status: 409 },
      );
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const user = await createCredentialsUser({
      email,
      passwordHash,
      name: name || null,
    });

    // Null means the insert lost a race with another sign-up for this address.
    if (!user) {
      return Response.json(
        {
          error:
            "An account already uses this email. Sign in, or use “Forgot password” if you can't.",
          existingAccount: true,
        },
        { status: 409 },
      );
    }

    try {
      await sendVerificationLink(user, siteOrigin(request));
    } catch (caught) {
      // The account exists; signing in with the password sends a fresh link.
      console.error("Could not send verification email", caught);
    }

    return Response.json({ ok: true, verify: true });
  } catch (caught) {
    /**
     * The reason is for the server log only. A database error read back to the
     * browser would say more about the schema than about the form.
     */
    console.error("Registration failed", caught);
    return bad("Could not create your account. Please try again.", 500);
  }
}
