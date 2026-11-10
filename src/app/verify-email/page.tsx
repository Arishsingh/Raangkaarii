import Link from "next/link";
import { redirect } from "next/navigation";

import { AuthShell } from "@/components/auth-shell";
import { Button } from "@/components/ui/button";
import { confirmEmail } from "@/lib/email-verification";

export const metadata = { title: "Confirm email — Rangkaarii" };

/**
 * Where the emailed confirmation link lands. Opening it confirms the address
 * and sends them on to sign in; an expired or spent link explains how to get a
 * new one (signing in with the password sends it).
 */
export default async function VerifyEmailPage({
  searchParams,
}: PageProps<"/verify-email">) {
  const { token } = await searchParams;
  const value = typeof token === "string" ? token : "";

  let email: string | null = null;
  try {
    email = await confirmEmail(value);
  } catch (caught) {
    console.error("Could not confirm email", caught);
  }

  if (email) redirect("/login?verified=1");

  return (
    <AuthShell>
      <div className="space-y-6">
        <div>
          <h1 className="font-serif text-4xl">Link expired</h1>
          <p className="mt-3 text-sm font-light leading-relaxed text-foreground/65">
            This confirmation link has expired or was already used. If your email is
            already confirmed, just sign in. Otherwise, sign in with your password and
            we&apos;ll send you a fresh link.
          </p>
        </div>
        <Button asChild className="h-12 w-full text-base">
          <Link href="/login">Go to sign in</Link>
        </Button>
      </div>
    </AuthShell>
  );
}
