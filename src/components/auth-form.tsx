"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useClerk, useSignIn, useSignUp } from "@clerk/nextjs";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** Matches the instance password policy (Clerk → password_settings.min_length). */
const PASSWORD_MIN_LENGTH = 15;

/** Holds typed values across a recovery reload. */
const RECOVERY_KEY = "rangkaarii:auth-recovery";

/** Ensures the automatic recovery reload only ever happens once. */
const AUTO_RESET_KEY = "rangkaarii:auth-auto-reset";

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

/** Registration blocked because the identifier already belongs to a user. */
function isTakenIdentifier(error: ClerkError) {
  const text =
    `${error?.message ?? ""} ${error?.longMessage ?? ""}`.toLowerCase();
  return text.includes("taken") || text.includes("already exists");
}

/** Sign in blocked because no user matches the identifier. */
function isUnknownAccount(error: ClerkError) {
  const text =
    `${error?.message ?? ""} ${error?.longMessage ?? ""}`.toLowerCase();
  return (
    text.includes("couldn't find your account") ||
    text.includes("could not find your account") ||
    text.includes("identifier not found")
  );
}

function readError(error: ClerkError, fallback = "Something went wrong.") {
  if (!error) return fallback;
  return error.longMessage ?? error.message ?? fallback;
}

/* Google's brand mark keeps its four colours; it must not inherit currentColor. */
function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
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

export function AuthForm({ mode }: { mode: "sign-in" | "sign-up" }) {
  const router = useRouter();
  const clerk = useClerk();
  const { signIn } = useSignIn();
  const { signUp } = useSignUp();

  const [firstName, setFirstName] = React.useState("");
  const [lastName, setLastName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);
  const [step, setStep] = React.useState<"details" | "code">("details");
  const [code, setCode] = React.useState("");
  const [needsReset, setNeedsReset] = React.useState(false);
  const [existingAccount, setExistingAccount] = React.useState(false);
  const [missingAccount, setMissingAccount] = React.useState(false);

  /**
   * `reset()` only clears local state, so a client record still pointing at a
   * deleted attempt survives it. Destroying the client forces a fresh one.
   */
  /**
   * The stale attempt id lives in Clerk's browser client (cookie + local
   * storage), so destroying the resource is not enough — the storage has to go
   * too, otherwise the same dead id is rehydrated on the next attempt.
   */
  const clearAutoResetGuard = React.useCallback(() => {
    try {
      window.sessionStorage.removeItem(AUTO_RESET_KEY);
    } catch {
      // Nothing to clear.
    }
  }, []);

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
    // Keep what the user typed (never the password) across the reload.
    try {
      window.sessionStorage.setItem(
        RECOVERY_KEY,
        JSON.stringify({ firstName, lastName, email }),
      );
    } catch {
      // Not worth failing the recovery over.
    }
    await hardResetClient();
    window.location.reload();
  }, [email, firstName, hardResetClient, lastName]);

  const isSignUp = mode === "sign-up";
  const ready = isSignUp ? Boolean(signUp) : Boolean(signIn);

  React.useEffect(() => {
    try {
      const saved = window.sessionStorage.getItem(RECOVERY_KEY);
      if (!saved) return;
      window.sessionStorage.removeItem(RECOVERY_KEY);
      const values = JSON.parse(saved);
      setFirstName(values.firstName ?? "");
      setLastName(values.lastName ?? "");
      setEmail(values.email ?? "");
    } catch {
      // Nothing preserved; the form just starts empty.
    }
  }, []);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!ready || pending) return;
    setPending(true);
    setError(null);
    setExistingAccount(false);
    setMissingAccount(false);

    try {
      if (isSignUp) {
        // Registration happens on the server so a corrupted browser client
        // cannot block it; then we sign in normally with the new credentials.
        const response = await fetch("/api/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ firstName, lastName, email, password }),
        });
        const result = await response.json().catch(() => ({}));

        if (!response.ok) {
          if (result.existingAccount) setExistingAccount(true);
          throw new Error(result.error ?? "Could not create your account.");
        }

        if (!result.ticket) {
          throw new Error(
            "Account created — please sign in with your new details.",
          );
        }

        // A sign-in ticket completes in one step. A password sign-in would stop
        // at `needs_second_factor` here and never produce a session.
        let entered = await signIn!.ticket({ ticket: result.ticket });
        if (entered.error && isStaleAttempt(entered.error)) {
          await hardResetClient();
          entered = await signIn!.ticket({ ticket: result.ticket });
        }
        if (entered.error) {
          throw new Error(
            "Account created — please sign in with your new details.",
          );
        }

        await completeSignIn();
        clearAutoResetGuard();
        router.push("/dashboard");
        return;
      } else {
        let attempt = await signIn!.password({ identifier: email, password });
        if (attempt.error && isStaleAttempt(attempt.error)) {
          await hardResetClient();
          attempt = await signIn!.password({ identifier: email, password });
        }
        if (attempt.error) {
          if (isUnknownAccount(attempt.error)) {
            setMissingAccount(true);
            throw new Error("No account found with that email.");
          }
          throw new Error(readError(attempt.error, "Wrong email or password."));
        }
        // Password alone leaves the sign-in at `needs_second_factor` on this
        // instance, so send the email code and collect it before finalising.
        if (signIn!.status === "needs_second_factor") {
          const sent = await signIn!.mfa.sendEmailCode();
          if (sent.error) throw new Error(readError(sent.error));
          clearAutoResetGuard();
          setStep("code");
          return;
        }

        await completeSignIn();
        clearAutoResetGuard();
        router.push("/dashboard");
      }
    } catch (caught) {
      const message =
        caught instanceof Error ? caught.message : "Something went wrong.";

      // A stale client survived the in-place retry: purge its storage and
      // reload once, restoring what was typed. Guarded so it cannot loop.
      if (isStaleAttempt({ message })) {
        let alreadyTried = true;
        try {
          alreadyTried = window.sessionStorage.getItem(AUTO_RESET_KEY) === "1";
          window.sessionStorage.setItem(AUTO_RESET_KEY, "1");
        } catch {
          // Cannot track attempts, so fall through to the manual button.
        }
        if (!alreadyTried) {
          await startOver();
          return;
        }
        setNeedsReset(true);
      }

      setError(message);
    } finally {
      setPending(false);
    }
  };

  /**
   * Ticket and MFA flows both create the session on the sign-in resource;
   * `finalize()` fails outright when it cannot find one, so prefer activating
   * the session we were handed and only fall back to finalize.
   */
  const completeSignIn = React.useCallback(async () => {
    const sessionId = signIn?.createdSessionId;
    if (sessionId) {
      await clerk.setActive({ session: sessionId });
      return;
    }
    const done = await signIn!.finalize();
    if (done.error) throw new Error(readError(done.error));
  }, [clerk, signIn]);

  const verifyCode = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!ready || pending) return;
    setPending(true);
    setError(null);

    try {
      const verified = await signIn!.mfa.verifyEmailCode({ code });
      if (verified.error) {
        throw new Error(readError(verified.error, "That code did not work."));
      }
      await completeSignIn();
      router.push("/dashboard");
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Something went wrong.",
      );
    } finally {
      setPending(false);
    }
  };

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

    const start = async () => {
      const client = clerk.client;
      if (!client) throw new Error("Could not start Google sign in.");
      await (isSignUp
        ? client.signUp.authenticateWithRedirect(params)
        : client.signIn.authenticateWithRedirect(params));
    };

    try {
      await start();
    } catch (caught) {
      const clerkError = (
        caught as { errors?: { message?: string; longMessage?: string }[] }
      )?.errors?.[0];
      const detail = clerkError ?? {
        message: caught instanceof Error ? caught.message : undefined,
      };

      // A stale attempt on the client breaks SSO the same way it breaks
      // password sign-up, so rebuild the client and try once more.
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

  /* Clerk looks up this element by id; it must stay mounted across both steps. */
  const captcha = (
    <div key="clerk-captcha" id="clerk-captcha" className="empty:hidden" />
  );

  if (step === "code") {
    return (
      <>
        <form onSubmit={verifyCode} className="space-y-5">
          <div>
            <h1 className="font-serif text-4xl">Check your inbox</h1>
            <p className="mt-2 text-sm font-light text-foreground/65">
              For your security we sent a 6-digit code to {email}.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="code">Verification code</Label>
            <Input
              id="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              required
              value={code}
              onChange={(event) => setCode(event.target.value)}
              placeholder="123456"
            />
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <Button type="submit" disabled={pending} className="w-full">
            {pending ? "Verifying…" : "Verify and continue"}
          </Button>

          <button
            type="button"
            onClick={() => {
              setStep("details");
              setCode("");
              setError(null);
            }}
            className="w-full text-sm font-light underline underline-offset-4"
          >
            Back
          </button>
        </form>
        {captcha}
      </>
    );
  }

  return (
    <>
      <form onSubmit={submit} className="space-y-5">
        <div>
          <h1 className="font-serif text-4xl">
            {isSignUp ? "Create your account" : "Welcome back"}
          </h1>
          <p className="mt-2 text-sm font-light text-foreground/65">
            {isSignUp
              ? "Just a few details to get started."
              : "Welcome back! Please enter your details."}
          </p>
        </div>

        {isSignUp ? (
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="firstName">First name</Label>
              <Input
                id="firstName"
                autoComplete="given-name"
                required
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
                placeholder="Meher"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last name</Label>
              <Input
                id="lastName"
                autoComplete="family-name"
                value={lastName}
                onChange={(event) => setLastName(event.target.value)}
                placeholder="Kaur"
              />
            </div>
          </div>
        ) : null}

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Enter your email"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            autoComplete={isSignUp ? "new-password" : "current-password"}
            required
            minLength={isSignUp ? PASSWORD_MIN_LENGTH : undefined}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="••••••••"
          />
          {isSignUp ? (
            <p className="text-xs font-light text-foreground/55">
              At least {PASSWORD_MIN_LENGTH} characters.
            </p>
          ) : null}
        </div>

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
            {existingAccount ? (
              <Link
                href="/sign-in"
                className="inline-block text-sm font-medium underline underline-offset-4"
              >
                Sign in instead
              </Link>
            ) : null}
            {missingAccount ? (
              <Link
                href="/sign-up"
                className="inline-block text-sm font-medium underline underline-offset-4"
              >
                Create an account
              </Link>
            ) : null}
          </div>
        ) : null}

        <Button type="submit" disabled={pending || !ready} className="w-full">
          {pending ? "Please wait…" : isSignUp ? "Create account" : "Sign in"}
        </Button>

        <Button
          type="button"
          variant="outline"
          onClick={withGoogle}
          disabled={pending || !ready}
          className="w-full gap-2.5"
        >
          <GoogleMark />
          {isSignUp ? "Sign up with Google" : "Sign in with Google"}
        </Button>

        <p className="text-center text-sm font-light text-foreground/65">
          {isSignUp ? "Already have an account? " : "Don't have an account? "}
          <Link
            href={isSignUp ? "/sign-in" : "/sign-up"}
            className="font-medium underline underline-offset-4"
          >
            {isSignUp ? "Sign in" : "Sign up for free"}
          </Link>
        </p>
      </form>
      {captcha}
    </>
  );
}
