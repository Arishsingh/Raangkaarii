import type { Metadata } from "next";
import localFont from "next/font/local";

import { Providers } from "@/components/providers";
import "./globals.css";

/**
 * Self-hosted from ./fonts rather than next/font/google: the production build
 * server cannot reach Google Fonts, and a failed fetch fails the whole build.
 * Latin subset only, as before.
 */
const poppins = localFont({
  variable: "--font-poppins",
  display: "swap",
  src: [
    { path: "./fonts/poppins-300.woff2", weight: "300", style: "normal" },
    { path: "./fonts/poppins-400.woff2", weight: "400", style: "normal" },
    { path: "./fonts/poppins-500.woff2", weight: "500", style: "normal" },
    { path: "./fonts/poppins-600.woff2", weight: "600", style: "normal" },
  ],
});

const cormorant = localFont({
  variable: "--font-cormorant",
  display: "swap",
  src: [
    { path: "./fonts/cormorant-garamond-400.woff2", weight: "400", style: "normal" },
    { path: "./fonts/cormorant-garamond-500.woff2", weight: "500", style: "normal" },
    { path: "./fonts/cormorant-garamond-600.woff2", weight: "600", style: "normal" },
  ],
});

const parisienne = localFont({
  variable: "--font-parisienne",
  display: "swap",
  src: [{ path: "./fonts/parisienne-400.woff2", weight: "400", style: "normal" }],
});

const geistMono = localFont({
  variable: "--font-geist-mono",
  display: "swap",
  src: [{ path: "./fonts/geist-mono-400.woff2", weight: "400", style: "normal" }],
});

export const metadata: Metadata = {
  title: "Rangkaarii — Branded Pakistani Suits",
  description:
    "New shapes, fresh prints, instant favourites. Womenswear, menswear, kids and home.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${poppins.variable} ${cormorant.variable} ${parisienne.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
