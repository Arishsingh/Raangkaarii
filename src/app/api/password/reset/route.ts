import bcrypt from "bcryptjs";

import { BCRYPT_ROUNDS } from "@/auth";
import { PASSWORD_MIN_LENGTH } from "@/lib/auth-rules";
import { resetPassword } from "@/lib/password-reset";

/** Finishes a password reset: spends the emailed token and sets the new password. */
export async function POST(request: Request) {
  let token = "";
  let password = "";
  let confirmPassword = "";
  try {
    const body = await request.json();
    token = String(body?.token ?? "");
    password = String(body?.password ?? "");
    confirmPassword = String(body?.confirmPassword ?? "");
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  if (password.length < PASSWORD_MIN_LENGTH) {
    return Response.json(
      { error: `Password must be at least ${PASSWORD_MIN_LENGTH} characters.` },
      { status: 400 },
    );
  }
  if (password !== confirmPassword) {
    return Response.json({ error: "Passwords do not match." }, { status: 400 });
  }

  try {
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const ok = await resetPassword(token, passwordHash);
    if (!ok) {
      return Response.json(
        { error: "This reset link has expired or was already used. Please request a new one.", expired: true },
        { status: 400 },
      );
    }
    return Response.json({ ok: true });
  } catch (caught) {
    console.error("Password reset failed", caught);
    return Response.json(
      { error: "Could not reset your password. Please try again." },
      { status: 500 },
    );
  }
}
