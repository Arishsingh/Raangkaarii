"use client";

import * as React from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { AuthField, EMAIL_PATTERN, FormError } from "@/components/auth/auth-parts";

export function ForgotPasswordForm() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<{ email: string }>({ defaultValues: { email: "" } });
  const [error, setError] = React.useState("");
  /** What the server reported for the address just submitted. */
  const [result, setResult] = React.useState<{
    email: string;
    status: "sent" | "no_account" | "rate_limited";
  } | null>(null);

  const submit = handleSubmit(async ({ email }) => {
    setError("");
    try {
      const response = await fetch("/api/password/forgot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(body.error ?? "Something went wrong. Please try again.");
        return;
      }
      setResult({ email: email.trim(), status: body.status ?? "sent" });
    } catch (caught) {
      console.error("Forgot password failed", caught);
      setError("Something went wrong. Please try again.");
    }
  });

  if (result?.status === "sent") {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-serif text-4xl">Check your email</h1>
          <p
            role="status"
            className="mt-4 rounded-lg border border-emerald-600/30 bg-emerald-600/5 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-400"
          >
            Email sent to <span className="font-medium">{result.email}</span>.
          </p>
          <p className="mt-3 text-sm font-light leading-relaxed text-foreground/65">
            Open the link in it to choose a new password. It works for 30 minutes.
            Don&apos;t see it within a couple of minutes? Check your spam folder.
          </p>
        </div>
        <Button asChild className="h-12 w-full text-base">
          <Link href="/login">Back to sign in</Link>
        </Button>
      </div>
    );
  }

  if (result?.status === "no_account") {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-serif text-4xl">No account found</h1>
          <p className="mt-3 text-sm font-light leading-relaxed text-foreground/65">
            There&apos;s no Rangkaarii account for{" "}
            <span className="font-medium text-foreground">{result.email}</span>, so no
            email was sent. Check the spelling, try another address, or create an
            account.
          </p>
        </div>
        <div className="space-y-3">
          <Button asChild className="h-12 w-full text-base">
            <Link href="/signup">Create an account</Link>
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-12 w-full text-base"
            onClick={() => setResult(null)}
          >
            Try another email
          </Button>
        </div>
      </div>
    );
  }

  if (result?.status === "rate_limited") {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-serif text-4xl">Too many requests</h1>
          <p className="mt-3 text-sm font-light leading-relaxed text-foreground/65">
            We&apos;ve already sent several reset links to{" "}
            <span className="font-medium text-foreground">{result.email}</span> in the
            last hour, so no new email was sent. Use the most recent one in your inbox
            (check spam too), or try again in an hour.
          </p>
        </div>
        <Button asChild className="h-12 w-full text-base">
          <Link href="/login">Back to sign in</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-4xl">Forgot password?</h1>
        <p className="mt-2 text-sm font-light text-foreground/65">
          Enter your email and we&apos;ll send you a link to reset it.
        </p>
      </div>

      <FormError>{error}</FormError>

      <form onSubmit={submit} className="space-y-4" noValidate>
        <AuthField
          id="email"
          label="Email"
          type="email"
          autoComplete="email"
          error={errors.email?.message}
          disabled={isSubmitting}
          autoFocus
          registration={register("email", {
            required: "Please enter your email address.",
            pattern: { value: EMAIL_PATTERN, message: "Please enter a valid email address." },
          })}
        />
        <Button type="submit" disabled={isSubmitting} className="h-12 w-full text-base">
          {isSubmitting ? "Sending…" : "Send reset link"}
        </Button>
      </form>

      <p className="text-center text-sm font-light text-foreground/65">
        Remembered it?{" "}
        <Link href="/login" className="font-medium text-foreground underline underline-offset-4">
          Sign in
        </Link>
      </p>
    </div>
  );
}
