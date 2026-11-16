import { TriangleAlert } from "lucide-react";

import type { DatabaseStatus } from "@/lib/db";

/** Shown across the admin panel when the product database cannot be used. */
export function DatabaseNotice({ status }: { status: DatabaseStatus }) {
  if (status === "ok") return null;

  return (
    <div
      role="alert"
      className="mb-6 flex gap-3 rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm"
    >
      <TriangleAlert className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden />
      <div>
        {status === "quota" ? (
          <>
            <p className="font-medium">The database needs an upgrade.</p>
            <p className="mt-1 text-muted-foreground">
              The Neon database has passed its plan&apos;s storage quota, so products, orders and
              media cannot be loaded or saved. Nothing has been deleted — upgrade the Neon plan
              in the Neon console and everything comes back. Until then the site shows the last
              copy it saved, and changes made here will not be stored.
            </p>
          </>
        ) : (
          <>
            <p className="font-medium">The database cannot be reached.</p>
            <p className="mt-1 text-muted-foreground">
              Check your connection and DATABASE_URL. Changes made here will not be saved until it
              is back.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
