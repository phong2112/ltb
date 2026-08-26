import { useId, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { previewApplicationCv } from "@/app/apis/requests";
import { useData } from "@/app/data";
import { useLanguage } from "@/app/services/i18n-service";
import { track } from "@/app/services/analytics";
import { initialForm } from "@/app/components/ApplicationForm/constants";
import type { ApplicationFormProps, CvPreviewState, FormErrors, FormState, ScreeningQuestion, TextFieldName } from "@/app/components/ApplicationForm/types";
import { getScreeningAnswerError, validateCvFile } from ".";

/** Owns candidate application form state, validation, CV preview autofill, and submit behavior. */
export function useApplicationForm({ job, onSuccess }: Pick<ApplicationFormProps, "job" | "onSuccess">) {
  const { addCandidate } = useData();
  const { t } = useLanguage();
  const idPrefix = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cvPreviewRequestId = useRef(0);
  const cvAutofilledValuesRef = useRef<Partial<Record<TextFieldName, string>>>({});
  const formRef = useRef<FormState>(initialForm);
  const [form, setFormState] = useState<FormState>(initialForm);
  const [questionAnswers, setQuestionAnswers] = useState<Record<string, string>>({});
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [cvPreview, setCvPreview] = useState<CvPreviewState>({
    status: "idle",
    appliedFields: [],
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);

  /** Builds stable field IDs that keep labels and inputs connected. */
  const fieldId = (name: string) => `${idPrefix}-${name}`;

  /** Clears field-level errors and any stale submit error after user changes input. */
  function clearErrors(...names: string[]) {
    setErrors((previous) => {
      const next = { ...previous };
      names.forEach((name) => delete next[name]);
      delete next.submit;
      return next;
    });
  }

  /** Updates a candidate text field and marks prior CV autofill for that field as user-owned. */
  function updateTextField(name: TextFieldName, value: string) {
    delete cvAutofilledValuesRef.current[name];
    setForm((current) => ({ ...current, [name]: value }));
    clearErrors(name);
  }

  /** Keeps React state and a synchronous ref in sync for async CV preview callbacks. */
  function setForm(nextForm: FormState | ((current: FormState) => FormState)) {
    setFormState((current) => {
      const resolved = typeof nextForm === "function"
        ? (nextForm as (current: FormState) => FormState)(current)
        : nextForm;
      formRef.current = resolved;
      return resolved;
    });
  }

  /** Stores an answer and immediately refreshes validation for that screening question. */
  function updateQuestionAnswer(question: ScreeningQuestion, value: string) {
    setQuestionAnswers((current) => ({ ...current, [question.id]: value }));
    setQuestionAnswerError(question, value);
  }

  /** Adds or removes the error entry for one screening answer. */
  function setQuestionAnswerError(question: ScreeningQuestion, value: string) {
    const error = getScreeningAnswerError(question, value);

    setErrors((previous) => {
      const next = { ...previous };
      if (error) {
        next[`question-${question.id}`] = error;
      } else {
        delete next[`question-${question.id}`];
      }
      delete next.submit;
      return next;
    });
  }

  /** Validates all required candidate, CV, consent, and screening fields before submit. */
  function validate() {
    const nextErrors: FormErrors = {};
    if (!form.name.trim()) nextErrors.name = t("apply.nameRequired");
    if (!form.email.trim() || !/\S+@\S+\.\S+/.test(form.email)) nextErrors.email = t("apply.emailInvalid");

    const normalizedPhone = form.phone.replace(/[\s().-]/g, "");
    if (!form.phone.trim()) nextErrors.phone = t("apply.phoneRequired");
    else if (!/^\+?\d{8,15}$/.test(normalizedPhone)) nextErrors.phone = t("apply.phoneInvalid");

    if (!form.applicationArea || !job.locations.includes(form.applicationArea)) {
      nextErrors.applicationArea = t("apply.areaRequired");
    }

    if (!cvFile) nextErrors.cv = t("apply.cvRequired");
    if (cvFile) {
      const fileError = validateCvFile(cvFile, t);
      if (fileError) nextErrors.cv = fileError;
    }

    job.questions.forEach((question) => {
      const error = getScreeningAnswerError(question, questionAnswers[question.id] ?? "");
      if (error) nextErrors[`question-${question.id}`] = error;
    });

    if (!form.agreed) nextErrors.agreed = t("apply.agreeError");
    return nextErrors;
  }

  /** Submits a valid application and focuses the first invalid field when validation fails. */
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    const formElement = event.currentTarget;
    const nextErrors = validate();
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      track("form_validation_failed", { feature: "application", action: "submit", properties: { formId: "application", fieldCodes: Object.keys(nextErrors).map((field) => field.startsWith("question-") ? "screening_answer" : field), errorCodes: ["required_or_invalid"] } });
      window.requestAnimationFrame(() => {
        const firstInvalidField = formElement.querySelector<HTMLElement>("[aria-invalid='true']");
        firstInvalidField?.focus({ preventScroll: true });
        firstInvalidField?.scrollIntoView({ behavior: "smooth", block: "center" });
      });
      return;
    }

    track("application_funnel_step", { feature: "application", action: "submit", properties: { step: "submit_attempted" } });
    setSubmitting(true);
    setErrors({});

    try {
      await addCandidate({
        name: form.name,
        email: form.email,
        phone: form.phone,
        linkedinUrl: form.linkedinUrl,
        applicationArea: form.applicationArea,
        cvFile,
        note: form.note,
        jobId: job.id,
        jobTitle: job.title,
        status: "new",
        questionAnswers: job.questions.map((question) => ({
          questionId: question.id,
          answer: questionAnswers[question.id]?.trim() ?? "",
        })),
      });
      onSuccess();
    } catch (error) {
      setErrors({ submit: error instanceof Error ? error.message : t("apply.submitError") });
    } finally {
      setSubmitting(false);
    }
  }

  /** Handles CV selection, resets stale preview state, and starts server-side preview parsing. */
  function handleCvFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    cvPreviewRequestId.current += 1;
    clearPreviousCvAutofill();
    setCvFile(null);
    setCvPreview({ status: "idle", appliedFields: [] });
    clearErrors("cv");

    if (!file) return;

    const error = validateCvFile(file, t);
    if (error) {
      setErrors((previous) => ({ ...previous, cv: error }));
      event.target.value = "";
      return;
    }

    track("application_funnel_step", { feature: "application", action: "select_cv", properties: { step: "cv_selected" } });
    setCvFile(file);
    void previewCvFile(file, cvPreviewRequestId.current);
  }

  /** Removes the selected CV and rolls back only fields that were autofilled from that CV. */
  function removeCvFile() {
    cvPreviewRequestId.current += 1;
    clearPreviousCvAutofill();
    setCvFile(null);
    setCvPreview({ status: "idle", appliedFields: [] });
    if (fileInputRef.current) fileInputRef.current.value = "";
    clearErrors("cv");
  }

  /** Parses a CV preview and fills only empty form fields with extracted profile data. */
  async function previewCvFile(file: File, requestId: number) {
    setCvPreview({ status: "loading", appliedFields: [] });

    try {
      const result = await previewApplicationCv(file, job.locations);
      if (requestId !== cvPreviewRequestId.current) return;

      const suggestions: Partial<Pick<FormState, "name" | "email" | "phone" | "linkedinUrl" | "applicationArea">> = {
        ...(result.profile.fullName ? { name: result.profile.fullName } : {}),
        ...(result.profile.email ? { email: result.profile.email } : {}),
        ...(result.profile.phone ? { phone: result.profile.phone } : {}),
        ...(result.profile.linkedinUrl ? { linkedinUrl: result.profile.linkedinUrl } : {}),
        ...(result.profile.applicationArea && job.locations.includes(result.profile.applicationArea) ? { applicationArea: result.profile.applicationArea } : {}),
      };
      const appliedFields: TextFieldName[] = [];
      const autofilledValues: Partial<Record<TextFieldName, string>> = {};

      const nextForm = { ...formRef.current };

      for (const [name, value] of Object.entries(suggestions) as Array<[TextFieldName, string]>) {
        if (!value.trim() || formRef.current[name].trim()) continue;
        nextForm[name] = value;
        appliedFields.push(name);
        autofilledValues[name] = value;
      }

      if (appliedFields.length) {
        cvAutofilledValuesRef.current = autofilledValues;
        setForm(nextForm);
        setErrors((previous) => {
          const next = { ...previous };
          appliedFields.forEach((field) => delete next[field]);
          return next;
        });
      }

      setCvPreview({
        status: appliedFields.length ? "applied" : "empty",
        appliedFields,
      });
    } catch {
      if (requestId !== cvPreviewRequestId.current) return;
      setCvPreview({
        status: "failed",
        appliedFields: [],
      });
    }
  }

  /** Clears previous CV autofill values without deleting fields the user later edited. */
  function clearPreviousCvAutofill() {
    const autofilledValues = cvAutofilledValuesRef.current;
    const nextForm = { ...formRef.current };
    let changed = false;

    for (const [name, value] of Object.entries(autofilledValues) as Array<[TextFieldName, string]>) {
      if (nextForm[name] !== value) continue;
      nextForm[name] = "";
      changed = true;
    }

    cvAutofilledValuesRef.current = {};

    if (changed) {
      formRef.current = nextForm;
      setFormState(nextForm);
    }
  }

  return {
    clearErrors,
    cvFile,
    cvPreview,
    autofillLoadingFields: cvPreview.status === "loading"
      ? (["name", "email", "phone", "linkedinUrl", "applicationArea"] satisfies TextFieldName[])
      : [],
    errors,
    fieldId,
    fileInputRef,
    form,
    handleCvFileChange,
    handleSubmit,
    questionAnswers,
    removeCvFile,
    setForm,
    setQuestionAnswerError,
    submitting,
    t,
    updateQuestionAnswer,
    updateTextField,
  };
}
