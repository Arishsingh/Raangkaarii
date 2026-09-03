import { Suspense } from "react";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { AuthShell } from "@/components/auth-shell";
import { LoginForm } from "@/components/auth/login-form";
import { safeCallbackUrl } from "@/lib/auth-redirect";

export const metadata = { title: "Sign in — Rangkaarii" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const session = await auth();
  if (session?.user) {
    // Already signed in: honour the callback rather than showing a dead form.
    const { callbackUrl } = await searchParams;
    redirect(safeCallbackUrl(typeof callbackUrl === "string" ? callbackUrl : null));
  }

  return (
    <AuthShell>
      {/* The form reads the query string, which needs a Suspense boundary. */}
      <Suspense>
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}
