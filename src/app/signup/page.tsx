import { Suspense } from "react";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { AuthShell } from "@/components/auth-shell";
import { SignupForm } from "@/components/auth/signup-form";
import { safeCallbackUrl } from "@/lib/auth-redirect";

export const metadata = { title: "Create account — Rangkaarii" };

export default async function SignupPage({ searchParams }: PageProps<"/signup">) {
  const session = await auth();
  if (session?.user) {
    const { callbackUrl } = await searchParams;
    redirect(safeCallbackUrl(typeof callbackUrl === "string" ? callbackUrl : null));
  }

  return (
    <AuthShell>
      <Suspense>
        <SignupForm />
      </Suspense>
    </AuthShell>
  );
}
