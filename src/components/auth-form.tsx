"use client";

import * as React from "react";
import { useAuth, useClerk } from "@clerk/nextjs";

import { Button } from "@/components/ui/button";

type ClerkError = { message?: string; longMessage?: string } | null;

/**
 * The browser can hold a sign-up/sign-in id that no longer exists server-side
 * (abandoned attempt, restarted instance). Clerk reports it as a failed GET.
 */
function isStaleAttempt(error: ClerkError) {
  const text =
    `${error?.message ?? ""} ${error?.longMessage ?? ""}`.toLowerCase();
  return (
    // Covers both wordings Clerk uses: "No sign up attempt was found" and
    // "No sign up was found with id sua_…".
    /no sign (up|in) (attempt )?was found/.test(text) ||
    text.includes("unable to complete a get request for this client") ||
    text.includes("is invalid for this client")
  );
}

function readError(error: ClerkError, fallback = "Something went wrong.") {
  if (!error) return fallback;
  return error.longMessage ?? error.message ?? fallback;
}

/* Google's brand mark keeps its four colours; it must not inherit currentColor. */
function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden>
      <path
        fill="#4285F4"
        d="M23.52 12.27c0-.79-.07-1.54-.2-2.27H12v4.51h6.47a5.53 5.53 0 0 1-2.4 3.63v3.01h3.88c2.27-2.09 3.57-5.17 3.57-8.88z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.94-2.91l-3.88-3.01c-1.08.72-2.45 1.16-4.06 1.16-3.13 0-5.78-2.11-6.72-4.96H1.29v3.09A11.99 11.99 0 0 0 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.28 14.28a7.2 7.2 0 0 1 0-4.56V6.63H1.29a12 12 0 0 0 0 10.74l3.99-3.09z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.44-3.44C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.69 1.29 6.63l3.99 3.09C6.22 6.86 8.87 4.75 12 4.75z"
      />
    </svg>
  );
}

/**
 * Google is the only way in.
 *
 * Email and password were removed deliberately: there is nothing to remember,
 * nothing to reset, and no password for us to hold. Both pages render the same
 * single action — only the wording changes, because someone who clicks "Sign
 * in" and turns out to be new should still land in their account rather than
 * be sent to a different page to start again.
 */
export function AuthForm({ mode }: { mode: "sign-in" | "sign-up" }) {
  const clerk = useClerk();
  /**
   * The gate is Clerk's own load state, not the sign-in/sign-up hooks.
   *
   * Those hooks hand back a "future" resource that is truthy the moment the
   * component mounts, while `clerk.client` — the thing the redirect actually
   * needs — is still null. Treating the resource as readiness left the button
   * enabled before there was a client, so the first click threw instead of
   * going anywhere.
   */
  const { isLoaded } = useAuth();

  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);
  const [needsReset, setNeedsReset] = React.useState(false);

  const isSignUp = mode === "sign-up";
  const ready = isLoaded;

  /**
   * The stale attempt id lives in Clerk's browser client (cookie + local
   * storage), so destroying the resource is not enough — the storage has to go
   * too, otherwise the same dead id is rehydrated on the next attempt.
   */
  const purgeClerkStorage = React.useCallback(() => {
    try {
      for (const entry of document.cookie.split(";")) {
        const name = entry.split("=")[0]?.trim();
        if (!name || !/clerk|^__client|^__session/i.test(name)) continue;
        for (const path of ["/", window.location.pathname]) {
          document.cookie = `${name}=; Max-Age=0; path=${path}`;
          document.cookie = `${name}=; Max-Age=0; path=${path}; domain=${window.location.hostname}`;
        }
      }
      for (const storage of [window.localStorage, window.sessionStorage]) {
        for (const key of Object.keys(storage)) {
          if (/clerk/i.test(key)) storage.removeItem(key);
        }
      }
    } catch {
      // Storage can be unavailable (private mode); the reload still helps.
    }
  }, []);

  const hardResetClient = React.useCallback(async () => {
    try {
      await clerk.client?.destroy();
    } catch {
      // Already gone — a new client is created on the next request.
    }
    purgeClerkStorage();
    try {
      await clerk.client?.create();
    } catch {
      // Clerk creates one lazily on the next request if this fails.
    }
  }, [clerk, purgeClerkStorage]);

  const startOver = React.useCallback(async () => {
    await hardResetClient();
    window.location.reload();
  }, [hardResetClient]);

  const withGoogle = async () => {
    if (!ready || pending) return;
    setError(null);
    setNeedsReset(false);
    setPending(true);

    const origin = window.location.origin;
    // `authenticateWithRedirect` is the counterpart to the
    // <AuthenticateWithRedirectCallback /> mounted on /sso-callback: it
    // navigates the browser to Google itself.
    const params = {
      strategy: "oauth_google" as const,
      redirectUrl: `${origin}/sso-callback`,
      redirectUrlComplete: `${origin}/dashboard`,
    };

    /**
     * `clerk.client` can still be null for a moment after Clerk reports itself
     * loaded, and it is replaced outright by a hard reset. Wait briefly for it
     * rather than throwing on the first look — a click that lands in that gap
     * should feel slow, not broken.
     */
    const waitForClient = async () => {
      for (let attempt = 0; attempt < 25; attempt += 1) {
        if (clerk.client) return clerk.client;
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      return null;
    };

    /**
     * Always start from `signIn`, on both pages.
     *
     * Starting from `signUp` breaks the moment the Google account already
     * exists: Clerk cannot create a second account for it, so it hands off to
     * a transfer flow, and that handoff drops `redirectUrlComplete` — which
     * lands the person on Clerk's own hosted portal instead of the shop.
     * `signIn` has no such problem in the other direction, because
     * <AuthenticateWithRedirectCallback /> transfers a genuinely new account
     * into a sign-up on its own.
     */
    const start = async () => {
      const client = await waitForClient();
      if (!client) {
        throw new Error(
          "Sign in did not finish loading. Please refresh and try again.",
        );
      }
      await client.signIn.authenticateWithRedirect(params);
    };

    try {
      await start();
    } catch (caught) {
      // Clerk's own error carries the reason; the generic fallback below never
      // does, so log the whole thing before it is flattened to one sentence.
      console.error("Google sign in failed", caught);

      const clerkError = (
        caught as { errors?: { message?: string; longMessage?: string }[] }
      )?.errors?.[0];
      const detail = clerkError ?? {
        message: caught instanceof Error ? caught.message : undefined,
      };

      // A stale attempt on the client breaks SSO, so rebuild the client and
      // try once more before giving the person something to click.
      if (isStaleAttempt(detail)) {
        try {
          await hardResetClient();
          await start();
          return;
        } catch {
          setNeedsReset(true);
        }
      }
      setError(readError(detail, "Could not start Google sign in."));
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="space-y-6">
      {/**
       * Bot protection is on for this instance with the "smart" widget, and
       * Clerk mounts that widget into this element. Without it every sign-up —
       * including the OAuth redirect, which still runs the check — fails
       * before it reaches Google, with no message worth showing.
       */}
      <div id="clerk-captcha" className="empty:hidden" />

      <div>
        <h1 className="font-serif text-4xl">
          {isSignUp ? "Create your account" : "Welcome back"}
        </h1>
        <p className="mt-2 text-sm font-light text-foreground/65">
          {isSignUp
            ? "One tap with Google and you are in — no password to set."
            : "Sign in with the Google account you used before."}
        </p>
      </div>

      <Button
        type="button"
        onClick={withGoogle}
        disabled={pending || !ready}
        variant="outline"
        className="h-13 w-full gap-3 text-base"
      >
        <GoogleMark />
        {pending
          ? "Taking you to Google…"
          : isSignUp
            ? "Sign up with Google"
            : "Sign in with Google"}
      </Button>

      {error ? (
        <div className="space-y-2">
          <p className="text-sm text-destructive">{error}</p>
          {needsReset ? (
            <button
              type="button"
              onClick={startOver}
              className="text-sm font-medium underline underline-offset-4"
            >
              Reset and try again
            </button>
          ) : null}
        </div>
      ) : null}

      {/* Both pages do the same thing, so there is nowhere else to send
          someone — say so rather than offer a pointless second door. */}
      <p className="text-center text-sm font-light text-foreground/65">
        {isSignUp
          ? "Already have an account? Signing in with Google will find it."
          : "New here? Signing in with Google creates your account."}
      </p>
    </div>
  );
}
