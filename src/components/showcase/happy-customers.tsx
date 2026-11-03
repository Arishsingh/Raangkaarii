"use client";

import * as React from "react";
import { Camera, Heart, Star } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Feedback } from "@/lib/showcase-store";

const FIRST_PAGE = 8;

/**
 * A masonry wall: customer photos and message screenshots come in every
 * shape, so each keeps its own proportions instead of being cropped to a
 * grid. Tapping one opens it full size — a screenshot has to be readable.
 */
export function HappyCustomers({ feedback }: { feedback: Feedback[] }) {
  const [showAll, setShowAll] = React.useState(false);
  const [open, setOpen] = React.useState<Feedback | null>(null);

  if (feedback.length === 0) return null;

  const shown = showAll ? feedback : feedback.slice(0, FIRST_PAGE);

  return (
    <section aria-labelledby="happy-customers-title" className="bg-muted/40 py-14 sm:py-20">
      <div className="mx-auto w-full max-w-[1600px] px-5 sm:px-8">
        <div className="mb-10 text-center">
          <p className="mb-3 inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.18em] text-foreground/60">
            <Star className="size-3.5 fill-amber-400 text-amber-400" strokeWidth={0} />
            Real people, real love
          </p>
          <h2 id="happy-customers-title" className="text-4xl sm:text-5xl">
            <span className="font-light">Our Happy </span>
            <span className="font-serif italic">Customers</span>
          </h2>
          <p className="mx-auto mt-3 max-w-md text-sm font-light text-foreground/60">
            Real customers in Rangkaarii outfits, and the messages they sent us.
          </p>
        </div>

        <ul className="columns-2 gap-3 sm:gap-4 md:columns-3 lg:columns-4">
          {shown.map((entry) => (
            <li key={entry.id} className="mb-3 break-inside-avoid sm:mb-4">
              <figure className="overflow-hidden rounded-2xl border bg-card">
                <button
                  type="button"
                  onClick={() => setOpen(entry)}
                  className="group relative block w-full"
                  aria-label={`View ${entry.name ? `${entry.name}'s` : "this"} feedback full size`}
                >
                  {/* Plain img: the wall depends on each file's natural ratio. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={entry.image}
                    alt={entry.quote || (entry.name ? `Feedback from ${entry.name}` : "Customer feedback")}
                    loading="lazy"
                    className="w-full transition-transform duration-700 ease-out group-hover:scale-[1.03]"
                  />
                  <span className="absolute left-2.5 top-2.5 inline-flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-medium text-black backdrop-blur">
                    <Heart className="size-3 fill-rose-500 text-rose-500" strokeWidth={0} />
                    Happy customer
                  </span>
                </button>

                {entry.rating > 0 || entry.quote || entry.name ? (
                  <figcaption className="space-y-1.5 p-3.5 sm:p-4">
                    {entry.rating > 0 ? (
                      <span
                        className="flex gap-0.5"
                        role="img"
                        aria-label={`Rated ${entry.rating} out of 5`}
                      >
                        {Array.from({ length: 5 }).map((_, index) => (
                          <Star
                            key={index}
                            className={
                              index < entry.rating
                                ? "size-3.5 fill-amber-400 text-amber-400"
                                : "size-3.5 text-foreground/20"
                            }
                            strokeWidth={index < entry.rating ? 0 : 1.5}
                          />
                        ))}
                      </span>
                    ) : null}
                    {entry.quote ? (
                      <blockquote className="font-serif text-base leading-snug">
                        “{entry.quote}”
                      </blockquote>
                    ) : null}
                    {entry.name ? (
                      <p className="text-xs font-light text-foreground/60">— {entry.name}</p>
                    ) : null}
                  </figcaption>
                ) : null}
              </figure>
            </li>
          ))}
        </ul>

        <div className="mt-8 flex flex-col items-center gap-4">
          {feedback.length > FIRST_PAGE ? (
            <button
              type="button"
              onClick={() => setShowAll((value) => !value)}
              className="rounded-full border border-foreground px-7 py-2.5 text-sm font-light transition-colors hover:bg-foreground hover:text-background"
            >
              {showAll ? "Show fewer" : `See all ${feedback.length} reviews`}
            </button>
          ) : null}
          <p className="inline-flex items-center gap-1.5 text-xs font-light text-foreground/55">
            <Camera className="size-3.5" strokeWidth={1.5} />
            Tag us on Instagram to be featured
          </p>
        </div>
      </div>

      <Dialog open={open !== null} onOpenChange={(value) => !value && setOpen(null)}>
        <DialogContent className="max-h-[92dvh] max-w-[min(92vw,40rem)] overflow-y-auto p-0 sm:max-w-[min(92vw,40rem)]">
          <DialogTitle className="sr-only">
            {open?.name ? `Feedback from ${open.name}` : "Customer feedback"}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {open?.quote || "A customer photo or message."}
          </DialogDescription>
          {open ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={open.image} alt="" className="w-full rounded-t-lg" />
              {open.quote || open.name ? (
                <div className="p-5">
                  {open.quote ? (
                    <p className="font-serif text-lg leading-snug">“{open.quote}”</p>
                  ) : null}
                  {open.name ? (
                    <p className="mt-2 text-sm font-light text-foreground/60">— {open.name}</p>
                  ) : null}
                </div>
              ) : null}
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </section>
  );
}
