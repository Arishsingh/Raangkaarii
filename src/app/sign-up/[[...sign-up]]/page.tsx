import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";

import { AuthShell } from "@/components/auth-shell";
import { AuthForm } from "@/components/auth-form";

export const metadata = { title: "Create account — Rangkaarii" };

export default async function SignUpPage() {
  const { userId } = await auth();
  if (userId) redirect("/dashboard");

  return (
    <AuthShell>
      <AuthForm mode="sign-up" />
    </AuthShell>
  );
}
