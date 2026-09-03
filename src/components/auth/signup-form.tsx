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
  PASSWORD_MIN_LENGTH,
} from "@/components/auth/auth-parts";
import { safeCallbackUrl } from "@/lib/auth-redirect";

export function SignupForm() {
  const router = useRouter();
  const params = useSearchParams();
  const callbackUrl = safeCallbackUrl(params.get("callbackUrl"));

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [fieldErrors, setFieldErrors] = React.useState<{
    email?: string;
    password?: string;
    confirmPassword?: string;
  }>({});
  const [error, setError] = React.useState("");
  const [pending, setPending] = React.useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (pending) return;

    /**
     * The same three rules the server applies, run here so the answer is
     * immediate. Nothing below depends on them having passed — `/api/register`
     * re-checks every one.
     */
    const next: typeof fieldErrors = {};
    if (!EMAIL_PATTERN.test(email.trim())) {
      next.email = "Please enter a valid email address.";
    }
    if (password.length < PASSWORD_MIN_LENGTH) {
      next.password = `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`;
    }
    if (confirmPassword !== password) {
      next.confirmPassword = "Passwords do not match.";
    }
    setFieldErrors(next);
    if (Object.keys(next).length > 0) return;

    setError("");
    setPending(true);

    try {
      const response = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          password,
          confirmPassword,
        }),
      });
      const body = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(body.error ?? "Could not create your account. Please try again.");
        setPending(false);
        return;
      }

      /**
       * Straight in, rather than back to the sign-in page to type the same
       * password again. The session is minted by Auth.js from the credentials
       * just registered — the signup endpoint never issues one itself.
       */
      const result = await signIn("credentials", {
        email: email.trim(),
        password,
        redirect: false,
      });

      if (!result || result.error) {
        // The account exists; only the automatic sign-in did not happen.
        router.replace(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
        return;
      }

      router.replace(callbackUrl);
      router.refresh();
    } catch (caught) {
      console.error("Sign up failed", caught);
      setError("Something went wrong. Please try again.");
      setPending(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-4xl">Create your account</h1>
        <p className="mt-2 text-sm font-light text-foreground/65">
          Get started with your account
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
          autoComplete="new-password"
          error={fieldErrors.password}
          disabled={pending}
        />
        <AuthField
          id="confirmPassword"
          label="Confirm Password"
          type="password"
          value={confirmPassword}
          onChange={setConfirmPassword}
          autoComplete="new-password"
          error={fieldErrors.confirmPassword}
          disabled={pending}
        />

        <Button type="submit" disabled={pending} className="h-12 w-full text-base">
          {pending ? "Creating account…" : "Create Account"}
        </Button>
      </form>

      <p className="text-center text-sm font-light text-foreground/65">
        Already have an account?{" "}
        <Link
          href={`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`}
          className="font-medium text-foreground underline underline-offset-4"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
