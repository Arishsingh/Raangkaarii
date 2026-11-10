import bcrypt from "bcryptjs";

import { BCRYPT_ROUNDS } from "@/auth";
import { EMAIL_PATTERN, PASSWORD_MIN_LENGTH } from "@/lib/auth-rules";
import { emailIsAdmin } from "@/lib/admin-emails";
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
 * The browser signs in immediately afterwards through Auth.js itself, so no
 * session is minted here and no token is handled by hand.
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

  /**
   * Admin access is decided by email address, and sign-up does not prove the
   * address belongs to whoever typed it. So an admin-list address gets an
   * account that cannot sign in until its owner opens an emailed link —
   * which needs email to be working. Customers are not asked to confirm.
   */
  const needsConfirmation = emailIsAdmin(email);
  if (needsConfirmation && !emailConfigured()) {
    console.error("Admin sign-up attempted but RESEND_API_KEY is not set");
    return bad("This account can't be created right now. Please try again later.", 503);
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

    if (needsConfirmation) {
      try {
        await sendVerificationLink(user, siteOrigin(request));
      } catch (caught) {
        // The account exists; signing in with the password sends a fresh link.
        console.error("Could not send verification email", caught);
      }
      return Response.json({ ok: true, verify: true });
    }

    return Response.json({ ok: true });
  } catch (caught) {
    /**
     * The reason is for the server log only. A database error read back to the
     * browser would say more about the schema than about the form.
     */
    console.error("Registration failed", caught);
    return bad("Could not create your account. Please try again.", 500);
  }
}
