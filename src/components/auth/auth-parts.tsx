import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

/** Re-exported so a form imports its rules and its fields from one place. */
export { EMAIL_PATTERN, PASSWORD_MIN_LENGTH } from "@/lib/auth-rules";

/**
 * A labelled field. The label is a real `<label for>` rather than a
 * placeholder, so it survives typing and is read out by a screen reader; the
 * error is tied to the input with aria-describedby for the same reason.
 */
export function AuthField({
  id,
  label,
  type,
  value,
  onChange,
  autoComplete,
  error,
  disabled,
  autoFocus,
}: {
  id: string;
  label: string;
  type: "email" | "password";
  value: string;
  onChange: (value: string) => void;
  autoComplete: string;
  error?: string;
  disabled?: boolean;
  autoFocus?: boolean;
}) {
  const errorId = `${id}-error`;

  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-sm font-light">
        {label}
      </Label>
      <Input
        id={id}
        name={id}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        autoComplete={autoComplete}
        disabled={disabled}
        autoFocus={autoFocus}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className="h-12 text-base"
      />
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
