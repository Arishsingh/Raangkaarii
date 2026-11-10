import { emailConfigured, passwordResetEmail, sendEmail } from "@/lib/email";
import { EMAIL_PATTERN } from "@/lib/auth-rules";
import { createResetToken, RESET_TOKEN_TTL_MINUTES } from "@/lib/password-reset";
import { siteOrigin } from "@/lib/site-origin";
import { normaliseEmail } from "@/lib/users-store";

/**
 * Starts a password reset and reports what actually happened, so the screen
 * can say "sent", "no account with this email" or "too many requests" rather
 * than a guess.
 *
 * This deliberately tells a visitor whether an address has an account — the
 * owner chose a clear answer for shoppers over hiding who is a customer. The
 * per-account limit in createResetToken still stops it being used to flood
 * anyone's inbox.
 */
export type ForgotStatus = "sent" | "no_account" | "rate_limited";

export async function POST(request: Request) {
  let email = "";
  try {
    const body = await request.json();
    email = normaliseEmail(String(body?.email ?? ""));
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  if (!EMAIL_PATTERN.test(email)) {
    return Response.json({ error: "Please enter a valid email address." }, { status: 400 });
  }

  if (!emailConfigured()) {
    console.error("Password reset requested but RESEND_API_KEY is not set");
    return Response.json(
      { error: "Password reset by email isn't available right now. Please contact us." },
      { status: 503 },
    );
  }

  try {
    const issued = await createResetToken(email);
    if (issued.status !== "issued") {
      return Response.json({ ok: true, status: issued.status satisfies ForgotStatus });
    }

    const link = `${siteOrigin(request)}/reset-password?token=${encodeURIComponent(issued.token)}`;
    const message = passwordResetEmail({
      name: issued.name,
      link,
      minutes: RESET_TOKEN_TTL_MINUTES,
    });
    await sendEmail({ to: issued.email, ...message });
    console.info("Password reset email sent");
    return Response.json({ ok: true, status: "sent" satisfies ForgotStatus });
  } catch (caught) {
    console.error("Could not send password reset email", caught);
    return Response.json(
      { error: "We couldn't send the email just now. Please try again in a minute." },
      { status: 502 },
    );
  }
}
