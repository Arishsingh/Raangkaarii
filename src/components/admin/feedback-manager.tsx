"use client";

import * as React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Loader2, Star, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import { TextArea, TextInput } from "@/components/admin/field";
import { MediaUpload } from "@/components/admin/media-upload";
import { Button } from "@/components/ui/button";
import { createFeedback, removeFeedback } from "@/app/admin/showcase/actions";
import type { Feedback } from "@/lib/showcase-store";
import { cn } from "@/lib/utils";

type Draft = { image: string; name: string; quote: string; rating: number };

function Stars({
  value,
  onChange,
}: {
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="flex items-center gap-0.5" role="radiogroup" aria-label="Stars">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          role="radio"
          aria-checked={value === star}
          aria-label={`${star} star${star === 1 ? "" : "s"}`}
          // Tapping the current rating again clears it: no stars shown.
          onClick={() => onChange(value === star ? 0 : star)}
          className="p-0.5"
        >
          <Star
            className={cn(
              "size-4",
              star <= value ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40",
            )}
          />
        </button>
      ))}
    </div>
  );
}

export function FeedbackManager({ feedback }: { feedback: Feedback[] }) {
  const router = useRouter();
  const [drafts, setDrafts] = React.useState<Draft[]>([]);
  const [publishing, startPublish] = React.useTransition();
  const [removing, setRemoving] = React.useState<string | null>(null);

  const update = (index: number, patch: Partial<Draft>) =>
    setDrafts((current) =>
      current.map((draft, at) => (at === index ? { ...draft, ...patch } : draft)),
    );

  const publish = () =>
    startPublish(async () => {
      let added = 0;
      const failed: Draft[] = [];
      for (const draft of drafts) {
        const result = await createFeedback(draft);
        if (result.ok) added += 1;
        else failed.push(draft);
      }
      // Anything that did not go up stays in the tray to try again.
      setDrafts(failed);
      if (added > 0) {
        toast.success(`Added ${added} to the homepage.`);
        router.refresh();
      }
      if (failed.length > 0) toast.error(`${failed.length} could not be saved.`);
    });

  const remove = async (id: string) => {
    setRemoving(id);
    const result = await removeFeedback(id);
    setRemoving(null);
    if (result.ok) {
      toast.success("Removed from the homepage.");
      router.refresh();
    } else {
      toast.error(result.message);
    }
  };

  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <h3 className="font-heading text-base font-medium">
        Customer feedback{" "}
        <span className="text-sm font-normal text-muted-foreground">
          {feedback.length} on the homepage
        </span>
      </h3>
      <p className="mt-0.5 max-w-xl text-xs text-muted-foreground">
        Upload photos of customers in their outfits, or screenshots of their
        WhatsApp and Instagram messages. A name and a line are optional.
      </p>

      <div className="mt-4">
        <MediaUpload
          kind="image"
          onUploaded={(url) =>
            setDrafts((current) =>
              current.some((draft) => draft.image === url)
                ? current
                : [...current, { image: url, name: "", quote: "", rating: 5 }],
            )
          }
        />
      </div>

      {drafts.length > 0 ? (
        <div className="mt-5 rounded-lg border border-dashed border-primary/50 bg-muted/40 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-medium">
              Ready to add ({drafts.length})
            </p>
            <Button type="button" onClick={publish} disabled={publishing}>
              {publishing ? <Loader2 className="size-4 animate-spin" /> : null}
              Add {drafts.length} to homepage
            </Button>
          </div>
          <ul className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {drafts.map((draft, index) => (
              <li key={draft.image} className="flex gap-3 rounded-lg bg-background p-3">
                <div className="relative h-36 w-28 shrink-0 overflow-hidden rounded-md bg-muted">
                  <Image src={draft.image} alt="" fill sizes="112px" unoptimized className="object-cover" />
                  <button
                    type="button"
                    onClick={() =>
                      setDrafts((current) => current.filter((_, at) => at !== index))
                    }
                    aria-label="Discard this photo"
                    className="absolute right-1 top-1 grid size-6 place-items-center rounded bg-background/85"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  <TextInput
                    value={draft.name}
                    onChange={(event) => update(index, { name: event.target.value })}
                    placeholder="Name (optional)"
                    maxLength={80}
                    className="h-8"
                  />
                  <TextArea
                    value={draft.quote}
                    onChange={(event) => update(index, { quote: event.target.value })}
                    placeholder="What they said (optional)"
                    rows={2}
                    maxLength={400}
                    className="min-h-16 text-xs"
                  />
                  <Stars value={draft.rating} onChange={(rating) => update(index, { rating })} />
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {feedback.length > 0 ? (
        <ul className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          {feedback.map((entry) => (
            <li key={entry.id} className="group">
              <div className="relative aspect-[4/5] overflow-hidden rounded-md border border-input bg-muted">
                <Image src={entry.image} alt="" fill sizes="160px" unoptimized className="object-cover" />
                <Button
                  type="button"
                  variant="destructive"
                  size="icon-xs"
                  className="absolute right-1 top-1"
                  onClick={() => remove(entry.id)}
                  disabled={removing === entry.id}
                  aria-label="Remove from homepage"
                >
                  {removing === entry.id ? <Loader2 className="animate-spin" /> : <Trash2 />}
                </Button>
              </div>
              {entry.name || entry.quote ? (
                <p className="mt-1 line-clamp-2 text-[0.7rem] text-muted-foreground">
                  {entry.name ? <span className="font-medium text-foreground">{entry.name}</span> : null}
                  {entry.name && entry.quote ? " · " : null}
                  {entry.quote}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      ) : drafts.length === 0 ? (
        <p className="mt-5 rounded-lg border border-dashed border-input px-4 py-6 text-center text-sm text-muted-foreground">
          No feedback yet. The section stays hidden on the homepage until you add some.
        </p>
      ) : null}
    </section>
  );
}
