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
  const [sentTo, setSentTo] = React.useState("");

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
      setSentTo(email.trim());
    } catch (caught) {
      console.error("Forgot password failed", caught);
      setError("Something went wrong. Please try again.");
    }
  });

  if (sentTo) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-serif text-4xl">Check your email</h1>
          <p className="mt-3 text-sm font-light leading-relaxed text-foreground/65">
            If an account exists for <span className="font-medium text-foreground">{sentTo}</span>,
            we&apos;ve sent a link to reset your password. It works for 30 minutes.
            Don&apos;t see it? Check your spam folder.
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
