"use client";

import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const shopLinks = [
  { label: "Home", href: "/" },
  { label: "New In", href: "/collections/new-in" },
  { label: "Womens", href: "/collections/womens" },
  { label: "Sale", href: "/collections/sale" },
];

const helpLinks = [
  { label: "Size Guide", href: "/collections/womens" },
  { label: "Shipping & Returns", href: "/collections/womens" },
  { label: "Privacy Policy", href: "/collections/womens" },
  { label: "Terms & Conditions", href: "/collections/womens" },
];

/* Brand marks are hand-rolled: lucide dropped its social icon set in v1. */
const socials = [
  {
    label: "Instagram",
    path: "M12 2.16c3.2 0 3.58.01 4.85.07 3.25.15 4.77 1.69 4.92 4.92.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.15 3.23-1.66 4.77-4.92 4.92-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-3.26-.15-4.77-1.7-4.92-4.92C2.17 15.58 2.16 15.2 2.16 12s.01-3.58.07-4.85C2.38 3.92 3.89 2.38 7.15 2.23 8.42 2.17 8.8 2.16 12 2.16zM12 0C8.74 0 8.33.01 7.05.07 2.7.27.28 2.69.08 7.05.01 8.33 0 8.74 0 12s.01 3.67.07 4.95c.2 4.36 2.62 6.78 6.98 6.98C8.33 23.99 8.74 24 12 24s3.67-.01 4.95-.07c4.35-.2 6.78-2.62 6.98-6.98.06-1.28.07-1.69.07-4.95s-.01-3.67-.07-4.95c-.2-4.35-2.62-6.78-6.98-6.98C15.67.01 15.26 0 12 0zm0 5.84a6.16 6.16 0 100 12.32 6.16 6.16 0 000-12.32zm0 10.16a4 4 0 110-8 4 4 0 010 8zm6.4-11.85a1.44 1.44 0 100 2.88 1.44 1.44 0 000-2.88z",
  },
  {
    label: "Facebook",
    path: "M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.09 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.69 4.53-4.69 1.31 0 2.68.24 2.68.24v2.97h-1.51c-1.49 0-1.96.93-1.96 1.89v2.25h3.33l-.53 3.49h-2.8V24C19.61 23.09 24 18.1 24 12.07z",
  },
  {
    label: "TikTok",
    path: "M12.53.02C13.84 0 15.14.01 16.44 0c.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z",
  },
  {
    label: "YouTube",
    path: "M23.5 6.19a3.02 3.02 0 00-2.12-2.14C19.5 3.55 12 3.55 12 3.55s-7.5 0-9.38.5A3.02 3.02 0 00.5 6.19C0 8.08 0 12 0 12s0 3.92.5 5.81a3.02 3.02 0 002.12 2.14c1.88.5 9.38.5 9.38.5s7.5 0 9.38-.5a3.02 3.02 0 002.12-2.14C24 15.92 24 12 24 12s0-3.92-.5-5.81zM9.55 15.57V8.43L15.82 12l-6.27 3.57z",
  },
];

export function SiteFooter({ locked = false }: { locked?: boolean }) {
  const [email, setEmail] = React.useState("");

  const subscribe = (event: React.FormEvent) => {
    event.preventDefault();
    if (!email) return;
    toast.success("You're on the list — welcome to Rangkaarii.");
    setEmail("");
  };

  return (
    <footer>
      {/* Full-bleed video banner */}
      {locked ? null : (
      <div className="relative h-[60vh] min-h-[420px] w-full overflow-hidden">
        <video
          className="absolute inset-0 size-full object-cover"
          poster="/hero-4.png"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          aria-hidden
        >
          <source src="/videos/footer.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-black/35" />

        <div className="relative flex h-full flex-col items-center justify-center px-5 text-center text-white">
          <span className="flex size-14 items-center justify-center rounded-2xl bg-white/95 font-script text-3xl leading-none text-neutral-900">
            R
          </span>

          <h2 className="mt-6 text-3xl leading-snug sm:text-4xl">
            <span className="font-light">Dress your everyday,</span>
            <br />
            <span className="font-light">because </span>
            <span className="font-serif italic">style is</span>
            <span className="font-light"> personal</span>
          </h2>

          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/collections/womens"
              className="rounded-full bg-white px-7 py-3 text-sm font-medium text-neutral-900 transition-colors hover:bg-white/90"
            >
              Shop Womens
            </Link>
            <Link
              href="/collections/new-in"
              className="rounded-full border border-white/80 px-7 py-3 text-sm font-medium transition-colors hover:bg-white/15"
            >
              New In
            </Link>
          </div>
        </div>
      </div>
      )}

      {/* Dark footer */}
      <div className="bg-neutral-800 text-white">
        <div className="mx-auto w-full max-w-[1200px] px-5 py-14 sm:px-8">
          <div className="text-center">
            <h3 className="text-xl">
              <span className="font-light">Get </span>
              <span className="font-serif italic">Updates</span>
              <span className="font-light"> From Rangkaarii</span>
            </h3>

            <form
              onSubmit={subscribe}
              className="mx-auto mt-5 flex max-w-md items-center gap-2 rounded-full bg-white/10 p-1"
            >
              <Input
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="Email address"
                aria-label="Email address"
                className="border-0 bg-transparent text-white placeholder:text-white/50 focus-visible:ring-0 dark:bg-transparent"
              />
              <Button
                type="submit"
                className="shrink-0 rounded-full bg-blush px-6 text-blush-foreground hover:bg-blush/90"
              >
                Sign Up
              </Button>
            </form>

            <p className="mx-auto mt-4 max-w-sm text-sm font-light text-white/70">
              Be the first to know about new arrivals, restocks, and exclusive
              offers.
            </p>
          </div>

          <hr className="my-12 border-white/15" />

          <div
            className={cn(
              "grid gap-10 sm:grid-cols-2",
              locked ? "lg:grid-cols-2" : "lg:grid-cols-4",
            )}
          >
            {locked ? (
              <span className="font-script text-4xl leading-none">Rangkaarii</span>
            ) : (
              <Link href="/" className="font-script text-4xl leading-none">
                Rangkaarii
              </Link>
            )}

            {locked ? null : (
              <nav className="flex flex-col gap-3">
                {shopLinks.map((link) => (
                  <Link
                    key={link.label}
                    href={link.href}
                    className="text-sm font-light text-white/80 transition-colors hover:text-white pointer-coarse:py-1.5"
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>
            )}

            {locked ? null : (
              <nav className="flex flex-col gap-3">
                {helpLinks.map((link) => (
                  <Link
                    key={link.label}
                    href={link.href}
                    className="text-sm font-light text-white/80 transition-colors hover:text-white pointer-coarse:py-1.5"
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>
            )}

            <div>
              <p className="text-sm font-light leading-relaxed text-white/80">
                Follow us for new arrivals, styling notes, and a look inside the
                atelier.
              </p>
              <div className="mt-4 flex gap-2.5">
                {socials.map((social) => (
                  <a
                    key={social.label}
                    href="#"
                    aria-label={social.label}
                    className="flex size-9 items-center justify-center rounded-full bg-blush text-blush-foreground transition-opacity hover:opacity-80 pointer-coarse:size-11"
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor" className="size-4">
                      <path d={social.path} />
                    </svg>
                  </a>
                ))}
              </div>
            </div>
          </div>

          <p className="mt-12 text-center text-xs font-light text-white/55">
            © {new Date().getFullYear()} Rangkaarii. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
