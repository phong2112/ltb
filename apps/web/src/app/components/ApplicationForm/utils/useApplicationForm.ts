import { useId, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { previewApplicationCv } from "@/app/apis/requests";
import { useData } from "@/app/data";
import { useLanguage } from "@/app/services/i18n-service";
import { initialForm } from "../constants";
import type { ApplicationFormProps, CvPreviewState, FormErrors, FormState, ScreeningQuestion, TextFieldName } from "../types";
import { getScreeningAnswerError, validateCvFile } from ".";

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

  const fieldId = (name: string) => `${idPrefix}-${name}`;

  function clearErrors(...names: string[]) {
    setErrors((previous) => {
      const next = { ...previous };
      names.forEach((name) => delete next[name]);
      delete next.submit;
      return next;
    });
  }

  function updateTextField(name: TextFieldName, value: string) {
    delete cvAutofilledValuesRef.current[name];
    setForm((current) => ({ ...current, [name]: value }));
    clearErrors(name);
  }

  function setForm(nextForm: FormState | ((current: FormState) => FormState)) {
    setFormState((current) => {
      const resolved = typeof nextForm === "function"
        ? (nextForm as (current: FormState) => FormState)(current)
        : nextForm;
      formRef.current = resolved;
      return resolved;
    });
  }

  function updateQuestionAnswer(question: ScreeningQuestion, value: string) {
    setQuestionAnswers((current) => ({ ...current, [question.id]: value }));
    setQuestionAnswerError(question, value);
  }

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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    const formElement = event.currentTarget;
    const nextErrors = validate();
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      window.requestAnimationFrame(() => {
        const firstInvalidField = formElement.querySelector<HTMLElement>("[aria-invalid='true']");
        firstInvalidField?.focus({ preventScroll: true });
        firstInvalidField?.scrollIntoView({ behavior: "smooth", block: "center" });
      });
      return;
    }

    setSubmitting(true);
    setErrors({});

    try {
      await addCandidate({
        name: form.name,
        email: form.email,
        phone: form.phone,
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

    setCvFile(file);
    void previewCvFile(file, cvPreviewRequestId.current);
  }

  function removeCvFile() {
    cvPreviewRequestId.current += 1;
    clearPreviousCvAutofill();
    setCvFile(null);
    setCvPreview({ status: "idle", appliedFields: [] });
    if (fileInputRef.current) fileInputRef.current.value = "";
    clearErrors("cv");
  }

  async function previewCvFile(file: File, requestId: number) {
    setCvPreview({ status: "loading", appliedFields: [] });

    try {
      const result = await previewApplicationCv(file, job.locations);
      if (requestId !== cvPreviewRequestId.current) return;

      const suggestions: Partial<Pick<FormState, "name" | "email" | "phone" | "applicationArea">> = {
        ...(result.profile.fullName ? { name: result.profile.fullName } : {}),
        ...(result.profile.email ? { email: result.profile.email } : {}),
        ...(result.profile.phone ? { phone: result.profile.phone } : {}),
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
      ? (["name", "email", "phone", "applicationArea"] satisfies TextFieldName[])
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
