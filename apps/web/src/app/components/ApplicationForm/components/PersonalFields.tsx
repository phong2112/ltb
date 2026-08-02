import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/Common/select";
import { APPLICATION_AREA_OPTIONS, fieldControlClassName } from "../constants";
import { Field } from "./Field";
import type { FormErrors, FormState, TextFieldName, Translate } from "../types";

type PersonalFieldsProps = {
  errors: FormErrors;
  fieldId: (name: string) => string;
  form: FormState;
  jobLocations: string[];
  t: Translate;
  updateTextField: (name: TextFieldName, value: string) => void;
};

export function PersonalFields({
  errors,
  fieldId,
  form,
  jobLocations,
  t,
  updateTextField,
}: PersonalFieldsProps) {
  const availableApplicationAreas = APPLICATION_AREA_OPTIONS.filter((area) =>
    jobLocations.includes(area.value),
  );

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("apply.nameLabel")} id={fieldId("name")} error={errors.name}>
          <input
            id={fieldId("name")}
            required
            value={form.name}
            onChange={(event) => updateTextField("name", event.target.value)}
            placeholder={t("apply.namePlaceholder")}
            autoComplete="name"
            aria-invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? `${fieldId("name")}-error` : undefined}
            className={`${fieldControlClassName} ${errors.name ? "border-red-300 focus:border-red-500" : "border-border"}`}
          />
        </Field>
        <Field label={t("apply.emailLabel")} id={fieldId("email")} error={errors.email}>
          <input
            id={fieldId("email")}
            type="email"
            required
            value={form.email}
            onChange={(event) => updateTextField("email", event.target.value)}
            placeholder="lan@email.com"
            autoComplete="email"
            inputMode="email"
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? `${fieldId("email")}-error` : undefined}
            className={`${fieldControlClassName} ${errors.email ? "border-red-300 focus:border-red-500" : "border-border"}`}
          />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("apply.phoneLabel")} id={fieldId("phone")} error={errors.phone}>
          <input
            id={fieldId("phone")}
            type="tel"
            required
            value={form.phone}
            onChange={(event) => updateTextField("phone", event.target.value)}
            placeholder="0912 345 678"
            autoComplete="tel"
            inputMode="tel"
            aria-invalid={Boolean(errors.phone)}
            aria-describedby={errors.phone ? `${fieldId("phone")}-error` : undefined}
            className={`${fieldControlClassName} ${errors.phone ? "border-red-300 focus:border-red-500" : "border-border"}`}
          />
        </Field>

        <Field label={t("apply.areaLabel")} id={fieldId("application-area")} error={errors.applicationArea}>
          <Select
            value={form.applicationArea}
            onValueChange={(value) => updateTextField("applicationArea", value)}
          >
            <SelectTrigger
              id={fieldId("application-area")}
              aria-invalid={Boolean(errors.applicationArea)}
              aria-describedby={errors.applicationArea ? `${fieldId("application-area")}-error` : undefined}
              className={`h-[42px] cursor-pointer rounded-xl bg-input-background px-3 text-sm font-semibold focus-visible:ring-0 data-[size=default]:h-[42px] ${errors.applicationArea ? "border-red-300 focus-visible:border-red-500" : "border-border focus-visible:border-primary"}`}
            >
              <SelectValue placeholder={t("apply.areaSelect")} />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-border bg-white p-1 shadow-lg">
              {availableApplicationAreas.map((area) => (
                <SelectItem key={area.value} value={area.value} className="cursor-pointer rounded-lg font-semibold">
                  {t(area.labelKey)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>
    </>
  );
}
