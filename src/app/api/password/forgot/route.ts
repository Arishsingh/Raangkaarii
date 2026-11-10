import { after } from "next/server";

import { emailConfigured, passwordResetEmail, sendEmail } from "@/lib/email";
import { EMAIL_PATTERN } from "@/lib/auth-rules";
import { createResetToken, RESET_TOKEN_TTL_MINUTES } from "@/lib/password-reset";
import { siteOrigin } from "@/lib/site-origin";
import { normaliseEmail } from "@/lib/users-store";

/**
 * Starts a password reset. The answer is the same whether or not the address
 * has an account, and the lookup and email happen after the response is sent,
 * so neither the wording nor the timing tells anyone who is a customer.
 */
const GENERIC_OK = {
  ok: true,
  message: "If an account exists for that email, a reset link is on its way.",
};

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

  const origin = siteOrigin(request);

  after(async () => {
    try {
      const issued = await createResetToken(email);
      if (!issued) return;

      const link = `${origin}/reset-password?token=${encodeURIComponent(issued.token)}`;
      const message = passwordResetEmail({
        name: issued.name,
        link,
        minutes: RESET_TOKEN_TTL_MINUTES,
      });
      await sendEmail({ to: issued.email, ...message });
    } catch (caught) {
      console.error("Could not send password reset email", caught);
    }
  });

  return Response.json(GENERIC_OK);
}
