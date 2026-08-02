import type { ReactNode } from "react";

type FormFieldProps = {
  label: string;
  children: ReactNode;
  error?: string;
  hint?: string;
  span2?: boolean;
};

export function FormField({ label, children, error, hint, span2 }: FormFieldProps) {
  return (
    <div className={span2 ? "sm:col-span-2" : ""}>
      <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-foreground">{label}</label>
      {children}
      <div className="mt-1 min-h-4 text-[11px] leading-4">
        {error ? <span className="font-semibold text-red-600">{error}</span> : hint ? <span className="text-muted-foreground">{hint}</span> : null}
      </div>
    </div>
  );
}
