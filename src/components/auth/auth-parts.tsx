import * as React from "react";
import { Eye, EyeOff } from "lucide-react";
import type { UseFormRegisterReturn } from "react-hook-form";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/** Re-exported so a form imports its rules and its fields from one place. */
export { EMAIL_PATTERN, PASSWORD_MIN_LENGTH } from "@/lib/auth-rules";

/**
 * A labelled field. The label is a real `<label for>` rather than a
 * placeholder, so it survives typing and is read out by a screen reader; the
 * error is tied to the input with aria-describedby for the same reason.
 *
 * `registration` is react-hook-form's `register(...)` return value — it wires
 * up name/onChange/onBlur/ref, so the field stays uncontrolled and validation
 * lives in the form's rules rather than in per-keystroke state here.
 */
export function AuthField({
  id,
  label,
  type,
  autoComplete,
  error,
  disabled,
  autoFocus,
  registration,
}: {
  id: string;
  label: string;
  type: "email" | "password";
  autoComplete: string;
  error?: string;
  disabled?: boolean;
  autoFocus?: boolean;
  registration: UseFormRegisterReturn;
}) {
  const errorId = `${id}-error`;
  const [revealed, setRevealed] = React.useState(false);
  const isPassword = type === "password";

  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-sm font-light">
        {label}
      </Label>
      <div className="relative">
        <Input
          id={id}
          type={isPassword && revealed ? "text" : type}
          autoComplete={autoComplete}
          disabled={disabled}
          autoFocus={autoFocus}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={cn("h-12 text-base", isPassword && "pr-11")}
          {...registration}
        />
        {isPassword ? (
          <button
            type="button"
            onClick={() => setRevealed((current) => !current)}
            disabled={disabled}
            tabIndex={-1}
            aria-label={revealed ? "Hide password" : "Show password"}
            className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-foreground/50 transition-colors hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
          >
            {revealed ? <EyeOff className="size-4.5" /> : <Eye className="size-4.5" />}
          </button>
        ) : null}
      </div>
      {error ? (
        <p id={errorId} className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/**
 * A failure that belongs to the whole form rather than one field. `role`
 * announces it the moment it appears, and the box holds its shape so a long
 * message cannot push the buttons around.
 */
export function FormError({ children }: { children: React.ReactNode }) {
  if (!children) return null;
  return (
    <p
      role="alert"
      className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
    >
      {children}
    </p>
  );
}
