import * as React from "react";

import { cn } from "@/lib/utils";

/** Shared shell so every control in the admin form lines up the same way. */
export function Field({
  label,
  hint,
  className,
  children,
}: {
  label: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={cn("flex flex-col gap-1.5", className)}>
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      {children}
      {hint ? <span className="text-xs text-muted-foreground">{hint}</span> : null}
    </label>
  );
}

const controlClasses =
  "h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none transition focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/40 disabled:opacity-50";

export function TextInput(props: React.ComponentProps<"input">) {
  return <input {...props} className={cn(controlClasses, props.className)} />;
}

export function Select(props: React.ComponentProps<"select">) {
  return (
    <select {...props} className={cn(controlClasses, "pr-8", props.className)} />
  );
}

export function TextArea(props: React.ComponentProps<"textarea">) {
  return (
    <textarea
      {...props}
      className={cn(controlClasses, "h-auto min-h-20 py-2", props.className)}
    />
  );
}

/** A checkbox that reads as a chip, used for sizes, badges and collections. */
export function CheckChip({
  name,
  value,
  label,
  defaultChecked,
}: {
  name: string;
  value: string;
  label: string;
  defaultChecked?: boolean;
}) {
  return (
    <label className="group inline-flex cursor-pointer items-center gap-2 rounded-full border border-input bg-background px-3 py-1.5 text-xs transition hover:border-ring has-checked:border-primary has-checked:bg-primary has-checked:text-primary-foreground">
      <input
        type="checkbox"
        name={name}
        value={value}
        defaultChecked={defaultChecked}
        className="size-3.5 accent-current"
      />
      {label}
    </label>
  );
}
