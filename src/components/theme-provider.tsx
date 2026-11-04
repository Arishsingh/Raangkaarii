"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";

/**
 * next-themes renders an inline <script> that sets the theme before first
 * paint. React 19 warns about any executable <script> rendered on the client,
 * even though this one has already run from the server HTML. On the client we
 * mark it as inert JSON so React stays quiet; the server copy is untouched, so
 * the no-flash behaviour still works.
 */
const scriptProps =
  typeof window === "undefined"
    ? undefined
    : ({ type: "application/json", suppressHydrationWarning: true } as const);

export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  return (
    <NextThemesProvider scriptProps={scriptProps} {...props}>
      {children}
    </NextThemesProvider>
  );
}
