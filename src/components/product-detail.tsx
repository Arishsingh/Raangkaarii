"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, Heart, Star } from "lucide-react";
import { toast } from "sonner";

import { BannerVideo } from "@/components/banner-video";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCart } from "@/components/cart-provider";
import { useWishlist } from "@/components/wishlist-provider";
import type { Product } from "@/lib/products";
import {
  averageRating,
  loadReviews,
  saveReviews,
  seedReviews,
  type Review,
} from "@/lib/reviews";
import { cn } from "@/lib/utils";

function Stars({ value, className }: { value: number; className?: string }) {
  return (
    <span
      className={cn("flex gap-0.5", className)}
      aria-label={`${value} out of 5`}
    >
      {Array.from({ length: 5 }).map((_, index) => (
        <Star
          key={index}
          className={cn(
            "size-4",
            index < Math.round(value)
              ? "fill-foreground"
              : "fill-foreground/15",
          )}
          strokeWidth={0}
        />
      ))}
    </span>
  );
}

export function ProductDetail({ product }: { product: Product }) {
  const wishlist = useWishlist();
  const cart = useCart();
  const saved = wishlist?.has(product.id) ?? false;

  const [reviews, setReviews] = React.useState<Review[]>([]);
  const [size, setSize] = React.useState(product.sizes[0]);
  const [rating, setRating] = React.useState(5);
  const [author, setAuthor] = React.useState("");
  const [body, setBody] = React.useState("");

  // Seeded reviews plus anything written on this device.
  React.useEffect(() => {
    const stored = loadReviews();
    setReviews(
      [...seedReviews, ...stored].filter((r) => r.productId === product.id),
    );
  }, [product.id]);

  const average = averageRating(reviews);

  const submitReview = (event: React.FormEvent) => {
    event.preventDefault();
    if (!body.trim()) return;

    const review: Review = {
      id: `r-${Date.now()}`,
      productId: product.id,
      author: author.trim() || "Anonymous",
      rating,
      body: body.trim(),
      createdAt: Date.now(),
    };

    saveReviews([...loadReviews(), review]);
    setReviews((current) => [review, ...current]);
    setAuthor("");
    setBody("");
    setRating(5);
    toast.success("Thanks — your feedback is live.");
  };

  return (
    <div className="mx-auto w-full max-w-[1200px] px-5 py-8 sm:px-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav className="text-xs font-light text-foreground/50">
          <span>Your account</span>
          <span className="px-1.5">·</span>
          <span>{product.category}</span>
          <span className="px-1.5">·</span>
          <span className="text-foreground">{product.name}</span>
        </nav>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-light transition-colors hover:bg-muted"
        >
          <ArrowLeft className="size-4" strokeWidth={1.5} />
          Back to all pieces
        </Link>
      </div>

      <div className="mt-6 grid items-start gap-10 lg:grid-cols-2">
        <div className="aspect-[4/5] max-h-[560px] w-full overflow-hidden rounded-2xl border bg-muted">
          <BannerVideo
            src="/videos/banner.mp4"
            poster={product.image}
            label={product.alt}
          />
        </div>

        <div>
          <p className="text-xs font-medium tracking-[0.18em] text-foreground/50">
            {product.category.toUpperCase()}
          </p>
          <h1 className="mt-2 font-serif text-3xl leading-tight sm:text-4xl">
            {product.name}
          </h1>

          <div className="mt-3 flex items-center gap-2">
            <Stars value={average} />
            <span className="text-sm font-light text-foreground/60">
              {reviews.length > 0
                ? `${average} · ${reviews.length} review${reviews.length === 1 ? "" : "s"}`
                : "No reviews yet"}
            </span>
          </div>

          <p className="mt-5 text-2xl">
            ₹{product.price.toLocaleString("en-IN")}
          </p>
          <p className="mt-4 text-sm font-light leading-relaxed text-foreground/70">
            {product.blurb}
          </p>

          <dl className="mt-6 grid grid-cols-2 gap-y-3 text-sm font-light">
            <dt className="text-foreground/55">Fabric</dt>
            <dd>{product.fabric}</dd>
            <dt className="text-foreground/55">Colour</dt>
            <dd>{product.colour}</dd>
            <dt className="text-foreground/55">Occasion</dt>
            <dd>{product.occasion}</dd>
            <dt className="text-foreground/55">Availability</dt>
            <dd>{product.inStock ? "In stock" : "Made to order"}</dd>
          </dl>

          <div className="mt-7">
            <p className="text-sm font-medium">Size</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {product.sizes.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setSize(option)}
                  className={cn(
                    "min-w-12 rounded-full border px-4 py-2 text-sm font-light transition-colors",
                    size === option
                      ? "border-foreground bg-foreground text-background"
                      : "hover:bg-muted",
                  )}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-7 flex flex-wrap gap-3">
            <Button
              onClick={() => {
                cart?.add(product.id, size);
                toast.success(`${product.name} (${size}) added to your cart`);
              }}
              className="rounded-full px-8"
            >
              Add to cart
            </Button>
            <Button
              variant="outline"
              onClick={() => wishlist?.toggle(product.id)}
              className="gap-2 rounded-full px-6"
            >
              <Heart
                className={cn("size-4", saved && "fill-red-500 text-red-500")}
                strokeWidth={1.5}
              />
              {saved ? "Loved" : "Love this"}
            </Button>
          </div>
        </div>
      </div>

      {/* Feedback */}
      <section className="mt-16 border-t pt-10">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="font-serif text-2xl">Customer feedback</h2>
          {reviews.length > 0 ? (
            <p className="flex items-center gap-2 text-sm font-light text-foreground/65">
              <Stars value={average} />
              {average} out of 5 · {reviews.length} review
              {reviews.length === 1 ? "" : "s"}
            </p>
          ) : null}
        </div>

        <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
          {/* Reviews */}
          <div>
            {reviews.length === 0 ? (
              <div className="rounded-2xl border bg-card p-6">
                <p className="text-sm font-light text-foreground/60">
                  No feedback yet. Be the first to write about this piece.
                </p>
              </div>
            ) : (
              <ul className="space-y-4">
                {reviews.map((review) => (
                  <li key={review.id} className="rounded-2xl border bg-card">
                    <div className="p-5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-medium">{review.author}</p>
                        <time
                          dateTime={new Date(review.createdAt).toISOString()}
                          className="text-xs font-light text-foreground/50"
                        >
                          {new Date(review.createdAt).toLocaleDateString(
                            "en-IN",
                            {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            },
                          )}
                        </time>
                      </div>
                      <Stars value={review.rating} className="mt-2" />
                      <p className="mt-3 text-sm font-light leading-relaxed text-foreground/75">
                        {review.body}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Write feedback — padding lives on this wrapper, not the form */}
          <div className="rounded-2xl border bg-card lg:sticky lg:top-24">
            <div className="p-6">
              <h3 className="font-serif text-xl">Write feedback</h3>
              <p className="mt-1 text-sm font-light text-foreground/60">
                Share how it fits and how the fabric feels.
              </p>

              <form onSubmit={submitReview} className="mt-5 space-y-5">
                <div>
                  <p className="text-sm font-medium">Your rating</p>
                  <div className="mt-2 flex gap-1">
                    {[1, 2, 3, 4, 5].map((value) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setRating(value)}
                        aria-label={`${value} star${value === 1 ? "" : "s"}`}
                        aria-pressed={rating === value}
                        className="p-0.5"
                      >
                        <Star
                          className={cn(
                            "size-6 transition-colors",
                            value <= rating
                              ? "fill-foreground"
                              : "fill-foreground/15",
                          )}
                          strokeWidth={0}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="author">Name</Label>
                  <Input
                    id="author"
                    value={author}
                    onChange={(event) => setAuthor(event.target.value)}
                    placeholder="Optional"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="body">Your feedback</Label>
                  <textarea
                    id="body"
                    required
                    rows={4}
                    value={body}
                    onChange={(event) => setBody(event.target.value)}
                    placeholder="How does it fit? How does the fabric feel?"
                    className="w-full resize-none rounded-lg border bg-transparent px-3 py-2 text-sm outline-none transition-colors focus-visible:border-ring"
                  />
                </div>

                <Button type="submit" className="w-full rounded-full">
                  Post feedback
                </Button>
              </form>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
