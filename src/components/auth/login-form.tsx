"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import {
  AuthField,
  EMAIL_PATTERN,
  FormError,
} from "@/components/auth/auth-parts";
import { safeCallbackUrl } from "@/lib/auth-redirect";

type LoginValues = {
  email: string;
  password: string;
};

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
  if (code === "AccessDenied") {
    return "That Google account's email isn't verified, so it can't be used to sign in.";
  }
  return "Something went wrong. Please try again.";
}

/**
 * The code thrown by authorize() in src/auth.ts. Anything else — a wrong
 * email or password alike — gets the one generic message.
 */
function messageForSignInCode(code: string | undefined) {
  if (code === "rate_limited") {
    return "Too many sign-in attempts. Please wait 15 minutes, or reset your password.";
  }
  return "Invalid email or password.";
}

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const callbackUrl = safeCallbackUrl(params.get("callbackUrl"));

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    defaultValues: { email: "", password: "" },
  });
  const [error, setError] = React.useState(() =>
    messageForProviderError(params.get("error")),
  );

  const submit = handleSubmit(async ({ email, password }) => {
    setError("");
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
        setError(messageForSignInCode(result?.code));
        return;
      }

      // refresh() so the server components re-render with the new session.
      router.replace(callbackUrl);
      router.refresh();
    } catch (caught) {
      console.error("Sign in failed", caught);
      setError("Something went wrong. Please try again.");
    }
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-4xl">Welcome back</h1>
        <p className="mt-2 text-sm font-light text-foreground/65">
          Sign in to your account
        </p>
      </div>

      <FormError>{error}</FormError>
      {params.get("reset") === "1" && !error ? (
        <p
          role="status"
          className="rounded-lg border border-emerald-600/30 bg-emerald-600/5 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-400"
        >
          Your password has been updated. Sign in with your new password.
        </p>
      ) : null}

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
          autoComplete="current-password"
          error={errors.password?.message}
          disabled={isSubmitting}
          registration={register("password", {
            required: "Please enter your password.",
          })}
        />
        <div className="-mt-1 flex justify-end">
          <Link
            href="/forgot-password"
            className="text-sm font-light text-foreground/65 underline-offset-4 transition-colors hover:text-foreground hover:underline"
          >
            Forgot password?
          </Link>
        </div>

        <Button type="submit" disabled={isSubmitting} className="h-12 w-full text-base">
          {isSubmitting ? "Signing in…" : "Sign In"}
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
