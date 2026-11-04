import Link from "next/link";

import { AuthShell } from "@/components/auth-shell";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { Button } from "@/components/ui/button";
import { resetTokenIsValid } from "@/lib/password-reset";

export const metadata = { title: "Reset password — Rangkaarii" };

export default async function ResetPasswordPage({
  searchParams,
}: PageProps<"/reset-password">) {
  const { token } = await searchParams;
  const value = typeof token === "string" ? token : "";

  let valid = false;
  try {
    valid = await resetTokenIsValid(value);
  } catch (caught) {
    console.error("Could not check reset token", caught);
  }

  return (
    <AuthShell>
      {valid ? (
        <ResetPasswordForm token={value} />
      ) : (
        <div className="space-y-6">
          <div>
            <h1 className="font-serif text-4xl">Link expired</h1>
            <p className="mt-3 text-sm font-light leading-relaxed text-foreground/65">
              This reset link has expired or was already used. Links work once,
              for 30 minutes. Request a new one below.
            </p>
          </div>
          <Button asChild className="h-12 w-full text-base">
            <Link href="/forgot-password">Request a new link</Link>
          </Button>
        </div>
      )}
    </AuthShell>
  );
}
