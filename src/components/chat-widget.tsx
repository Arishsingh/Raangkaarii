"use client";

import * as React from "react";
import { motion } from "motion/react";
import { MessageSquare, Send, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Turn = { role: "user" | "model"; text: string };

const GREETING: Turn = {
  role: "model",
  text: "Hi — I'm the Rangkaarii assistant. Ask me about sizing, fabrics, styling, or finding a piece.",
};

const SUGGESTIONS = [
  "What's good for hot weather?",
  "How do I care for embroidery?",
  "Help me pick a size",
];

export function ChatWidget() {
  const [open, setOpen] = React.useState(false);
  const [turns, setTurns] = React.useState<Turn[]>([GREETING]);
  const [draft, setDraft] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [turns, pending]);

  const send = React.useCallback(
    async (text: string) => {
      const message = text.trim();
      if (!message || pending) return;

      const next: Turn[] = [...turns, { role: "user", text: message }];
      setTurns(next);
      setDraft("");
      setError(null);
      setPending(true);

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          // The greeting is ours, not part of the conversation history.
          body: JSON.stringify({ messages: next.slice(1) }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? "Request failed");
        setTurns([...next, { role: "model", text: data.reply }]);
      } catch (caught) {
        setError(
          caught instanceof Error
            ? caught.message
            : "Something went wrong — please try again.",
        );
      } finally {
        setPending(false);
      }
    },
    [pending, turns],
  );

  return (
    <>
      {open ? (
        <motion.div
          initial={{ opacity: 0, y: 12, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.18 }}
          role="dialog"
          aria-label="Chat with Rangkaarii"
          className="fixed bottom-24 right-6 z-50 flex h-[min(560px,70vh)] w-[min(380px,calc(100vw-3rem))] flex-col overflow-hidden rounded-2xl border bg-card shadow-2xl"
        >
          <header className="flex items-center justify-between border-b px-4 py-3">
            <div>
              <p className="font-serif text-lg leading-none">Rangkaarii</p>
              <p className="mt-1 text-xs font-light text-foreground/60">
                Usually replies instantly
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Close chat"
              onClick={() => setOpen(false)}
            >
              <X className="size-4" />
            </Button>
          </header>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
            {turns.map((turn, index) => (
              <p
                key={index}
                className={cn(
                  "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm font-light leading-relaxed whitespace-pre-wrap",
                  turn.role === "user"
                    ? "ml-auto bg-foreground text-background"
                    : "bg-muted",
                )}
              >
                {turn.text}
              </p>
            ))}

            {pending ? (
              <p className="flex gap-1 rounded-2xl bg-muted px-3.5 py-3 w-fit">
                {[0, 150, 300].map((delay) => (
                  <span
                    key={delay}
                    className="size-1.5 animate-bounce rounded-full bg-foreground/40"
                    style={{ animationDelay: `${delay}ms` }}
                  />
                ))}
              </p>
            ) : null}

            {error ? (
              <p className="text-xs font-light text-destructive">{error}</p>
            ) : null}

            {turns.length === 1 && !pending ? (
              <div className="flex flex-wrap gap-2 pt-1">
                {SUGGESTIONS.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => send(suggestion)}
                    className="rounded-full border px-3 py-1.5 text-xs font-light transition-colors hover:bg-muted"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <form
            onSubmit={(event) => {
              event.preventDefault();
              send(draft);
            }}
            className="flex items-center gap-2 border-t p-3"
          >
            <Input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Ask a question…"
              aria-label="Message"
              disabled={pending}
              className="border-0 shadow-none focus-visible:ring-0"
            />
            <Button
              type="submit"
              size="icon"
              aria-label="Send message"
              disabled={pending || !draft.trim()}
            >
              <Send className="size-4" />
            </Button>
          </form>
        </motion.div>
      ) : null}

      <motion.button
        type="button"
        aria-label={open ? "Close chat" : "Open chat"}
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.95 }}
        className="flex size-12 animate-in items-center justify-center rounded-full bg-neutral-900 text-white shadow-lg fade-in zoom-in-95 fill-mode-both duration-500 delay-500"
      >
        {open ? <X className="size-5" /> : <MessageSquare className="size-5" />}
      </motion.button>
    </>
  );
}
