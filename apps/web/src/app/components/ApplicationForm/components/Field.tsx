import type { ReactNode } from "react";

type FieldProps = {
  label: string;
  id: string;
  error?: string;
  children: ReactNode;
};

export function Field({ label, id, error, children }: FieldProps) {
  const required = label.trim().endsWith("*");
  const visibleLabel = required ? label.trim().slice(0, -1).trimEnd() : label;

  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-muted-foreground"
      >
        {visibleLabel}
        {required && <span className="ml-0.5 text-primary">*</span>}
      </label>
      {children}
      {error && (
        <p
          id={`${id}-error`}
          role="alert"
          className="mt-1.5 text-xs font-semibold text-red-600"
        >
          {error}
        </p>
      )}
    </div>
  );
}
