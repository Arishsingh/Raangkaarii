"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import {
  AuthField,
  EMAIL_PATTERN,
  FormError,
  PASSWORD_MIN_LENGTH,
} from "@/components/auth/auth-parts";
import { safeCallbackUrl } from "@/lib/auth-redirect";

type SignupValues = {
  email: string;
  password: string;
  confirmPassword: string;
};

export function SignupForm() {
  const params = useSearchParams();
  const callbackUrl = safeCallbackUrl(params.get("callbackUrl"));

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<SignupValues>({
    defaultValues: { email: "", password: "", confirmPassword: "" },
  });
  const [error, setError] = React.useState("");
  const [sentTo, setSentTo] = React.useState("");

  /**
   * The same three rules the server applies, run here so the answer is
   * immediate. Nothing below depends on them having passed — `/api/register`
   * re-checks every one.
   */
  const submit = handleSubmit(async ({ email, password, confirmPassword }) => {
    setError("");

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
        return;
      }

      /**
       * No automatic sign-in: the account only works once the emailed link
       * has been opened, which proves the address belongs to whoever typed it.
       */
      setSentTo(email.trim());
    } catch (caught) {
      console.error("Sign up failed", caught);
      setError("Something went wrong. Please try again.");
    }
  });

  if (sentTo) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-serif text-4xl">Confirm your email</h1>
          <p className="mt-3 text-sm font-light leading-relaxed text-foreground/65">
            We&apos;ve sent a link to{" "}
            <span className="font-medium text-foreground">{sentTo}</span>. Open it to
            finish creating your account, then sign in. It works for 24 hours.
            Don&apos;t see it? Check your spam folder.
          </p>
        </div>
        <Button asChild className="h-12 w-full text-base">
          <Link href={`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`}>
            Go to sign in
          </Link>
        </Button>
      </div>
    );
  }

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
          autoComplete="email"
          error={errors.email?.message}
          disabled={isSubmitting}
          autoFocus
          registration={register("email", {
            required: "Please enter your email address.",
            pattern: {
              value: EMAIL_PATTERN,
              message: "Please enter a valid email address.",
            },
          })}
        />
        <AuthField
          id="password"
          label="Password"
          type="password"
          autoComplete="new-password"
          error={errors.password?.message}
          disabled={isSubmitting}
          registration={register("password", {
            required: "Please enter a password.",
            minLength: {
              value: PASSWORD_MIN_LENGTH,
              message: `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`,
            },
          })}
        />
        <AuthField
          id="confirmPassword"
          label="Confirm Password"
          type="password"
          autoComplete="new-password"
          error={errors.confirmPassword?.message}
          disabled={isSubmitting}
          registration={register("confirmPassword", {
            validate: (value) =>
              value === getValues("password") || "Passwords do not match.",
          })}
        />

        <Button type="submit" disabled={isSubmitting} className="h-12 w-full text-base">
          {isSubmitting ? "Creating account…" : "Create Account"}
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
