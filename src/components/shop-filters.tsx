"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

export type FilterGroup = {
  heading: string;
  options: { label: string; count: number }[];
};

export function ShopFilters({
  groups,
  selected,
  onToggle,
  onResetGroup,
  price,
  onPriceChange,
  maxPrice,
}: {
  groups: FilterGroup[];
  selected: Record<string, string[]>;
  onToggle: (heading: string, option: string) => void;
  onResetGroup: (heading: string) => void;
  price: number;
  onPriceChange: (value: number) => void;
  maxPrice: number;
}) {
  const [expanded, setExpanded] = React.useState<Record<string, boolean>>({});

  return (
    <aside className="space-y-8">
      {groups.map((group) => {
        const isOpen = expanded[group.heading];
        const visible = isOpen ? group.options : group.options.slice(0, 6);
        const chosen = selected[group.heading] ?? [];

        return (
          <div key={group.heading}>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">{group.heading}</h3>
              {chosen.length > 0 ? (
                <button
                  type="button"
                  onClick={() => onResetGroup(group.heading)}
                  className="text-xs font-light text-foreground/55 transition-colors hover:text-foreground"
                >
                  Reset
                </button>
              ) : null}
            </div>

            <ul className="mt-3 space-y-2.5">
              {visible.map((option) => {
                const checked = chosen.includes(option.label);
                return (
                  <li key={option.label}>
                    <label className="flex cursor-pointer items-center gap-2.5 text-sm font-light">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => onToggle(group.heading, option.label)}
                        className="sr-only"
                      />
                      <span
                        aria-hidden
                        className={cn(
                          "flex size-4 shrink-0 items-center justify-center rounded border transition-colors",
                          checked
                            ? "border-foreground bg-foreground text-background"
                            : "border-foreground/30",
                        )}
                      >
                        {checked ? (
                          <svg viewBox="0 0 12 12" className="size-2.5 fill-none stroke-current stroke-2">
                            <path d="M2 6.5 4.5 9 10 3.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        ) : null}
                      </span>
                      <span className="flex-1">{option.label}</span>
                      <span className="text-xs font-light text-foreground/45">
                        {option.count}
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>

            {group.options.length > 6 ? (
              <button
                type="button"
                onClick={() =>
                  setExpanded((current) => ({
                    ...current,
                    [group.heading]: !current[group.heading],
                  }))
                }
                className={cn(
                  "mt-4 w-full rounded-full py-2 text-xs font-medium transition-colors",
                  isOpen
                    ? "border hover:bg-muted"
                    : "bg-foreground text-background hover:opacity-85",
                )}
              >
                {isOpen ? "Show less" : "Show more"}
              </button>
            ) : null}
          </div>
        );
      })}

      <div>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">Price</h3>
          {price < maxPrice ? (
            <button
              type="button"
              onClick={() => onPriceChange(maxPrice)}
              className="text-xs font-light text-foreground/55 transition-colors hover:text-foreground"
            >
              Reset
            </button>
          ) : null}
        </div>
        <input
          type="range"
          min={0}
          max={maxPrice}
          step={100}
          value={price}
          onChange={(event) => onPriceChange(Number(event.target.value))}
          aria-label="Maximum price"
          className="mt-4 w-full accent-foreground"
        />
        <div className="mt-2 flex justify-between text-xs font-light text-foreground/55">
          <span>₹0</span>
          <span>Up to ₹{price.toLocaleString("en-IN")}</span>
        </div>
      </div>
    </aside>
  );
}
