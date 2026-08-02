import { useId, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { useData } from "@/app/data";
import { useLanguage } from "@/app/services/i18n-service";
import { initialForm } from "../constants";
import type { ApplicationFormProps, FormErrors, FormState, ScreeningQuestion, TextFieldName } from "../types";
import { getScreeningAnswerError, validateCvFile } from ".";

export function useApplicationForm({ job, onSuccess }: Pick<ApplicationFormProps, "job" | "onSuccess">) {
  const { addCandidate } = useData();
  const { t } = useLanguage();
  const idPrefix = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<FormState>(initialForm);
  const [questionAnswers, setQuestionAnswers] = useState<Record<string, string>>({});
  const [cvFile, setCvFile] = useState<File | null>(null);
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
    setForm((current) => ({ ...current, [name]: value }));
    clearErrors(name);
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
    setCvFile(null);
    clearErrors("cv");

    if (!file) return;

    const error = validateCvFile(file, t);
    if (error) {
      setErrors((previous) => ({ ...previous, cv: error }));
      event.target.value = "";
      return;
    }

    setCvFile(file);
  }

  function removeCvFile() {
    setCvFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    clearErrors("cv");
  }

  return {
    clearErrors,
    cvFile,
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
