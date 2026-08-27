"use client";

import * as React from "react";

type Point = { date: string; total: number; orders: number };

const rupees = (value: number) => `₹${value.toLocaleString("en-IN")}`;

function dayLabel(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });
}

/** Rounds the axis top to a clean number so ticks read 0 / 2,000 / 4,000. */
function niceCeiling(value: number) {
  if (value <= 0) return 1000;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  return Math.ceil(value / magnitude) * magnitude;
}

/**
 * One series over time, so: one hue, no legend (the heading names it), and a
 * per-bar tooltip rather than a number printed on every column.
 */
export function RevenueChart({ data }: { data: Point[] }) {
  const [hover, setHover] = React.useState<number | null>(null);

  const max = niceCeiling(Math.max(0, ...data.map((point) => point.total)));
  const ticks = [max, max / 2, 0];
  const empty = data.every((point) => point.total === 0);

  return (
    <figure className="rounded-xl border border-border bg-card p-5">
      <figcaption className="mb-1 font-heading text-sm font-medium">
        Revenue, last {data.length} days
      </figcaption>
      <p className="mb-5 text-xs text-muted-foreground">
        {empty
          ? "No orders recorded yet — the chart fills in as orders come through checkout."
          : "Hover a column for that day's total."}
      </p>

      <div className="flex gap-3">
        {/* Axis ticks sit outside the plot so the bars keep the full width. */}
        <div className="flex h-40 w-14 shrink-0 flex-col justify-between text-right text-[0.7rem] tabular-nums text-muted-foreground">
          {ticks.map((tick) => (
            <span key={tick}>{rupees(Math.round(tick))}</span>
          ))}
        </div>

        <div className="relative min-w-0 flex-1">
          <div aria-hidden className="absolute inset-0 flex flex-col justify-between">
            {ticks.map((tick) => (
              <div key={tick} className="h-px w-full bg-border" />
            ))}
          </div>

          {/* gap-0.5 is the 2px surface gap that separates touching columns. */}
          <div className="relative flex h-40 items-end gap-0.5">
            {data.map((point, index) => {
              const height = max > 0 ? (point.total / max) * 100 : 0;
              const active = hover === index;
              return (
                <div
                  key={point.date}
                  className="group relative flex h-full flex-1 items-end"
                  onMouseEnter={() => setHover(index)}
                  onMouseLeave={() => setHover(null)}
                >
                  <div
                    className="mx-auto w-full max-w-6 rounded-t bg-primary transition-opacity"
                    style={{
                      height: `${Math.max(height, point.total > 0 ? 2 : 0)}%`,
                      opacity: hover === null || active ? 1 : 0.45,
                    }}
                  />
                  {active ? (
                    <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 whitespace-nowrap rounded-md border border-border bg-popover px-2.5 py-1.5 text-xs shadow-md">
                      <p className="font-medium">{rupees(point.total)}</p>
                      <p className="text-muted-foreground">
                        {dayLabel(point.date)} ·{" "}
                        {point.orders === 1 ? "1 order" : `${point.orders} orders`}
                      </p>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>

          {/* Label only the ends, never every column. */}
          <div className="mt-2 flex justify-between text-[0.7rem] text-muted-foreground">
            <span>{data.length ? dayLabel(data[0].date) : ""}</span>
            <span>{data.length ? dayLabel(data[data.length - 1].date) : ""}</span>
          </div>
        </div>
      </div>
    </figure>
  );
}
