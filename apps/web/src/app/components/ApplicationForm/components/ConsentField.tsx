import { Link } from "react-router";
import type { Dispatch, SetStateAction } from "react";
import type { FormErrors, FormState, Translate } from "@/app/components/ApplicationForm/types";

type ConsentFieldProps = {
  clearErrors: (name: string) => void;
  errors: FormErrors;
  fieldId: (name: string) => string;
  form: FormState;
  setForm: Dispatch<SetStateAction<FormState>>;
  t: Translate;
};

export function ConsentField({ clearErrors, errors, fieldId, form, setForm, t }: ConsentFieldProps) {
  return (
    <div className={`rounded-[12px] border p-3.5 transition-colors ${errors.agreed ? "border-red-300 bg-red-50/60" : "border-border/80 bg-white shadow-sm hover:border-primary/25"}`}>
      <div className="flex items-start gap-3">
        <input
          id={fieldId("agreed")}
          type="checkbox"
          required
          checked={form.agreed}
          onChange={(event) => {
            setForm((current) => ({ ...current, agreed: event.target.checked }));
            clearErrors("agreed");
          }}
          aria-invalid={Boolean(errors.agreed)}
          aria-describedby={errors.agreed ? `${fieldId("agreed")}-error` : undefined}
          className="mt-0.5 size-4 flex-none cursor-pointer accent-pink-600 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-primary/20"
        />
        <div className="min-w-0">
          <label htmlFor={fieldId("agreed")} className="block cursor-pointer text-xs font-normal leading-5 text-muted-foreground">
            {t("apply.agreeText")}
          </label>
          <Link
            to="/privacy"
            className="mt-1 inline-flex text-xs font-bold text-primary underline decoration-primary/30 underline-offset-2 hover:decoration-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
          >
            {t("apply.privacyPolicy")}
          </Link>
        </div>
      </div>
      {errors.agreed && (
        <p id={`${fieldId("agreed")}-error`} role="alert" className="ml-7 mt-2 text-xs font-semibold text-red-600">
          {errors.agreed}
        </p>
      )}
    </div>
  );
}
