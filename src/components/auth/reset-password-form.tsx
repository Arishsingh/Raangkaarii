"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { AuthField, FormError, PASSWORD_MIN_LENGTH } from "@/components/auth/auth-parts";

type Values = { password: string; confirmPassword: string };

export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ defaultValues: { password: "", confirmPassword: "" } });
  const [error, setError] = React.useState("");
  const [expired, setExpired] = React.useState(false);

  const submit = handleSubmit(async ({ password, confirmPassword }) => {
    setError("");
    try {
      const response = await fetch("/api/password/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password, confirmPassword }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(body.error ?? "Could not reset your password. Please try again.");
        if (body.expired) setExpired(true);
        return;
      }
      router.replace("/login?reset=1");
    } catch (caught) {
      console.error("Reset password failed", caught);
      setError("Something went wrong. Please try again.");
    }
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-4xl">Choose a new password</h1>
        <p className="mt-2 text-sm font-light text-foreground/65">
          At least {PASSWORD_MIN_LENGTH} characters.
        </p>
      </div>

      <FormError>{error}</FormError>
      {expired ? (
        <Button asChild variant="outline" className="h-12 w-full text-base">
          <Link href="/forgot-password">Request a new link</Link>
        </Button>
      ) : null}

      <form onSubmit={submit} className="space-y-4" noValidate>
        <AuthField
          id="password"
          label="New password"
          type="password"
          autoComplete="new-password"
          error={errors.password?.message}
          disabled={isSubmitting}
          autoFocus
          registration={register("password", {
            required: "Please enter a new password.",
            minLength: {
              value: PASSWORD_MIN_LENGTH,
              message: `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`,
            },
          })}
        />
        <AuthField
          id="confirmPassword"
          label="Confirm new password"
          type="password"
          autoComplete="new-password"
          error={errors.confirmPassword?.message}
          disabled={isSubmitting}
          registration={register("confirmPassword", {
            required: "Please confirm your new password.",
            validate: (value) => value === getValues("password") || "Passwords do not match.",
          })}
        />
        <Button type="submit" disabled={isSubmitting} className="h-12 w-full text-base">
          {isSubmitting ? "Saving…" : "Reset password"}
        </Button>
      </form>
    </div>
  );
}
