"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";

import { Button } from "@/components/ui/button";
import {
  AuthField,
  EMAIL_PATTERN,
  FormError,
} from "@/components/auth/auth-parts";
import { safeCallbackUrl } from "@/lib/auth-redirect";

/**
 * Auth.js reports provider failures by redirecting back here with `?error=`.
 * Only the ones a shopper can act on get their own wording; everything else
 * shares one message, because the detail belongs in the server log.
 */
function messageForProviderError(code: string | null) {
  if (!code) return "";
  if (code === "OAuthAccountNotLinked") {
    return "This email is already registered with a password. Sign in with your password below, for this once.";
  }
  if (code === "CredentialsSignin") return "Invalid email or password.";
  if (code === "AccessDenied") return "That account cannot be used to sign in.";
  return "Something went wrong. Please try again.";
}

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const callbackUrl = safeCallbackUrl(params.get("callbackUrl"));

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [fieldErrors, setFieldErrors] = React.useState<{
    email?: string;
    password?: string;
  }>({});
  const [error, setError] = React.useState(() =>
    messageForProviderError(params.get("error")),
  );
  const [pending, setPending] = React.useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (pending) return;

    // Checked here for a quick answer only; the server checks it again.
    const next: typeof fieldErrors = {};
    if (!EMAIL_PATTERN.test(email.trim())) {
      next.email = "Please enter a valid email address.";
    }
    if (!password) next.password = "Please enter your password.";
    setFieldErrors(next);
    if (Object.keys(next).length > 0) return;

    setError("");
    setPending(true);
    try {
      /**
       * `redirect: false` so a failed sign-in stays on this page with its
       * message instead of bouncing through Auth.js's own error page.
       */
      const result = await signIn("credentials", {
        email: email.trim(),
        password,
        redirect: false,
      });

      if (!result || result.error) {
        // One message for every kind of miss — see the authorize() comment.
        setError("Invalid email or password.");
        setPending(false);
        return;
      }

      // refresh() so the server components re-render with the new session.
      router.replace(callbackUrl);
      router.refresh();
    } catch (caught) {
      console.error("Sign in failed", caught);
      setError("Something went wrong. Please try again.");
      setPending(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-4xl">Welcome back</h1>
        <p className="mt-2 text-sm font-light text-foreground/65">
          Sign in to your account
        </p>
      </div>

      <FormError>{error}</FormError>

      <form onSubmit={submit} className="space-y-4" noValidate>
        <AuthField
          id="email"
          label="Email"
          type="email"
          value={email}
          onChange={setEmail}
          autoComplete="email"
          error={fieldErrors.email}
          disabled={pending}
          autoFocus
        />
        <AuthField
          id="password"
          label="Password"
          type="password"
          value={password}
          onChange={setPassword}
          autoComplete="current-password"
          error={fieldErrors.password}
          disabled={pending}
        />

        <Button type="submit" disabled={pending} className="h-12 w-full text-base">
          {pending ? "Signing in…" : "Sign In"}
        </Button>
      </form>

      <p className="text-center text-sm font-light text-foreground/65">
        Don&apos;t have an account?{" "}
        <Link
          href={`/signup?callbackUrl=${encodeURIComponent(callbackUrl)}`}
          className="font-medium text-foreground underline underline-offset-4"
        >
          Create an account
        </Link>
      </p>
    </div>
  );
}
