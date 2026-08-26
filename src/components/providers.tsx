"use client";

import * as React from "react";
import { ThemeProvider } from "@/components/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      /* Storefront is light-only: ignore the OS dark preference. */
      enableSystem={false}
      forcedTheme="light"
      disableTransitionOnChange
    >
      <TooltipProvider delayDuration={200}>{children}</TooltipProvider>
      <Toaster position="top-center" richColors />
    </ThemeProvider>
  );
}
