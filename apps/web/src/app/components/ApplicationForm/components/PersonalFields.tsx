import { LoaderCircle } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/Common/select";
import { APPLICATION_AREA_OPTIONS, fieldControlClassName } from "../constants";
import { Field } from "./Field";
import type { FormErrors, FormState, TextFieldName, Translate } from "../types";

type PersonalFieldsProps = {
  errors: FormErrors;
  fieldId: (name: string) => string;
  form: FormState;
  jobLocations: string[];
  loadingFields: TextFieldName[];
  t: Translate;
  updateTextField: (name: TextFieldName, value: string) => void;
};

export function PersonalFields({
  errors,
  fieldId,
  form,
  jobLocations,
  loadingFields,
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
          <div className="relative">
            <input
              id={fieldId("name")}
              required
              disabled={isLoadingField(loadingFields, "name")}
              value={form.name}
              onChange={(event) => updateTextField("name", event.target.value)}
              placeholder={t("apply.namePlaceholder")}
              autoComplete="name"
              aria-invalid={Boolean(errors.name)}
              aria-describedby={errors.name ? `${fieldId("name")}-error` : undefined}
              className={`${fieldControlClassName} ${isLoadingField(loadingFields, "name") ? "pr-9" : ""} ${errors.name ? "border-red-300 focus:border-red-500" : "border-border/80"}`}
            />
            <FieldLoadingIndicator active={isLoadingField(loadingFields, "name")} />
          </div>
        </Field>
        <Field label={t("apply.emailLabel")} id={fieldId("email")} error={errors.email}>
          <div className="relative">
            <input
              id={fieldId("email")}
              type="email"
              required
              disabled={isLoadingField(loadingFields, "email")}
              value={form.email}
              onChange={(event) => updateTextField("email", event.target.value)}
              placeholder="lan@email.com"
              autoComplete="email"
              inputMode="email"
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? `${fieldId("email")}-error` : undefined}
              className={`${fieldControlClassName} ${isLoadingField(loadingFields, "email") ? "pr-9" : ""} ${errors.email ? "border-red-300 focus:border-red-500" : "border-border/80"}`}
            />
            <FieldLoadingIndicator active={isLoadingField(loadingFields, "email")} />
          </div>
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("apply.phoneLabel")} id={fieldId("phone")} error={errors.phone}>
          <div className="relative">
            <input
              id={fieldId("phone")}
              type="tel"
              required
              disabled={isLoadingField(loadingFields, "phone")}
              value={form.phone}
              onChange={(event) => updateTextField("phone", event.target.value)}
              placeholder="0912 345 678"
              autoComplete="tel"
              inputMode="tel"
              aria-invalid={Boolean(errors.phone)}
              aria-describedby={errors.phone ? `${fieldId("phone")}-error` : undefined}
              className={`${fieldControlClassName} ${isLoadingField(loadingFields, "phone") ? "pr-9" : ""} ${errors.phone ? "border-red-300 focus:border-red-500" : "border-border/80"}`}
            />
            <FieldLoadingIndicator active={isLoadingField(loadingFields, "phone")} />
          </div>
        </Field>

        <Field label={t("apply.linkedinLabel")} id={fieldId("linkedin-url")} error={errors.linkedinUrl}>
          <div className="relative">
            <input
              id={fieldId("linkedin-url")}
              type="url"
              disabled={isLoadingField(loadingFields, "linkedinUrl")}
              value={form.linkedinUrl}
              onChange={(event) => updateTextField("linkedinUrl", event.target.value)}
              placeholder={t("apply.linkedinPlaceholder")}
              autoComplete="url"
              inputMode="url"
              aria-invalid={Boolean(errors.linkedinUrl)}
              aria-describedby={errors.linkedinUrl ? `${fieldId("linkedin-url")}-error` : undefined}
              className={`${fieldControlClassName} ${isLoadingField(loadingFields, "linkedinUrl") ? "pr-9" : ""} ${errors.linkedinUrl ? "border-red-300 focus:border-red-500" : "border-border/80"}`}
            />
            <FieldLoadingIndicator active={isLoadingField(loadingFields, "linkedinUrl")} />
          </div>
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("apply.areaLabel")} id={fieldId("application-area")} error={errors.applicationArea}>
          <Select
            value={form.applicationArea}
            onValueChange={(value) => updateTextField("applicationArea", value)}
          >
            <SelectTrigger
              id={fieldId("application-area")}
              disabled={isLoadingField(loadingFields, "applicationArea")}
              aria-invalid={Boolean(errors.applicationArea)}
              aria-describedby={errors.applicationArea ? `${fieldId("application-area")}-error` : undefined}
              className={`h-[42px] cursor-pointer rounded-[10px] bg-white px-3 text-sm font-semibold shadow-sm focus-visible:ring-0 data-[size=default]:h-[42px] ${errors.applicationArea ? "border-red-300 focus-visible:border-red-500" : "border-border/80 focus-visible:border-primary"}`}
            >
              <SelectValue placeholder={t("apply.areaSelect")} />
              {isLoadingField(loadingFields, "applicationArea") && (
                <LoaderCircle className="size-4 animate-spin text-primary" />
              )}
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

function isLoadingField(loadingFields: TextFieldName[], field: TextFieldName) {
  return loadingFields.includes(field);
}

function FieldLoadingIndicator({ active }: { active: boolean }) {
  if (!active) return null;

  return (
    <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-primary" aria-hidden="true">
      <LoaderCircle className="size-4 animate-spin" />
    </span>
  );
}
