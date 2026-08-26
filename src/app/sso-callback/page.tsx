"use client";

import * as React from "react";
import Link from "next/link";
import { AuthenticateWithRedirectCallback } from "@clerk/nextjs";

export default function SSOCallbackPage() {
  // If Clerk cannot complete the handshake (cancelled at Google, expired
  // attempt) nothing navigates, so offer a way out instead of a dead spinner.
  const [stalled, setStalled] = React.useState(false);

  React.useEffect(() => {
    const timer = setTimeout(() => setStalled(true), 8000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 px-6 text-center">
      {stalled ? (
        <>
          <p className="font-serif text-2xl">That didn&apos;t go through</p>
          <p className="text-sm font-light text-foreground/65">
            The Google sign in was cancelled or timed out.
          </p>
          <Link
            href="/sign-in"
            className="mt-2 rounded-full bg-foreground px-7 py-3 text-sm font-medium text-background transition-opacity hover:opacity-85"
          >
            Back to sign in
          </Link>
        </>
      ) : (
        <p className="text-sm font-light text-foreground/60">Signing you in…</p>
      )}

      <AuthenticateWithRedirectCallback
        signInFallbackRedirectUrl="/dashboard"
        signUpFallbackRedirectUrl="/dashboard"
      />
    </div>
  );
}
