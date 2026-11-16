"use client";

/**
 * Catches a panel that throws. The usual cause today is the database refusing
 * queries over its plan quota, so say that first rather than a bare crash.
 */
export default function AdminError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div role="alert" className="rounded-xl border border-destructive/40 bg-destructive/10 p-5 text-sm">
      <p className="font-medium">This page could not load.</p>
      <p className="mt-1 text-muted-foreground">
        The most likely cause is that the database needs an upgrade (Neon storage quota
        exceeded). Your data has not been deleted. Upgrade the plan in the Neon console, then try
        again.
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-3 rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted"
      >
        Try again
      </button>
    </div>
  );
}
