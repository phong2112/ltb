import { Send } from "lucide-react";
import { ConsentField, CvUploadField, Field, PersonalFields, ScreeningQuestions } from "./components";
import { fieldControlClassName } from "./constants";
import type { ApplicationFormProps } from "./types";
import { useApplicationForm } from "./utils/useApplicationForm";

export { ApplicationJobSummary } from "./components";

export default function ApplicationForm({ job, onSuccess, variant = "page" }: ApplicationFormProps) {
  const {
    clearErrors,
    cvFile,
    cvPreview,
    autofillLoadingFields,
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
  } = useApplicationForm({ job, onSuccess });

  const submitButton = (
    <button
      type="submit"
      disabled={submitting}
      className="flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-[10px] bg-primary px-5 py-3 text-sm font-bold text-white shadow-sm transition-[background-color,box-shadow,transform] hover:bg-primary/90 hover:shadow-md focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-primary/25 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-65 disabled:hover:shadow-sm"
    >
      <Send size={16} /> {submitting ? t("common.loading") : t("apply.submit")}
    </button>
  );

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      aria-busy={submitting || cvPreview.status === "loading"}
      className={variant === "dialog" ? "flex min-h-0 flex-1 flex-col" : undefined}
    >
      <div className={variant === "dialog" ? "scrollbar-dialog min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain bg-muted/20 px-5 py-5 sm:px-6" : "space-y-5"}>
        <CvUploadField
          cvFile={cvFile}
          cvPreview={cvPreview}
          error={errors.cv}
          fieldId={fieldId}
          fileInputRef={fileInputRef}
          handleCvFileChange={handleCvFileChange}
          removeCvFile={removeCvFile}
          t={t}
        />

        <PersonalFields
          errors={errors}
          fieldId={fieldId}
          form={form}
          jobLocations={job.locations}
          loadingFields={autofillLoadingFields}
          t={t}
          updateTextField={updateTextField}
        />

        <Field label={t("apply.noteLabel")} id={fieldId("note")}>
          <textarea
            id={fieldId("note")}
            rows={3}
            value={form.note}
            onChange={(event) => updateTextField("note", event.target.value)}
            placeholder={t("apply.notePlaceholder")}
            className={`${fieldControlClassName} min-h-[94px] resize-y border-border/80 leading-5`}
          />
        </Field>

        <ScreeningQuestions
          errors={errors}
          fieldId={fieldId}
          questions={job.questions}
          questionAnswers={questionAnswers}
          setQuestionAnswerError={setQuestionAnswerError}
          t={t}
          updateQuestionAnswer={updateQuestionAnswer}
        />

        <ConsentField
          clearErrors={clearErrors}
          errors={errors}
          fieldId={fieldId}
          form={form}
          setForm={setForm}
          t={t}
        />

        {variant === "page" && (
          <div>
            {errors.submit && <p role="alert" className="mb-2 text-xs font-semibold text-red-600">{errors.submit}</p>}
            {submitButton}
          </div>
        )}
      </div>

      {variant === "dialog" && (
        <div className="flex-none border-t border-border bg-white px-5 py-3 shadow-[0_-8px_24px_rgba(74,37,50,0.05)] sm:px-6 sm:py-4">
          {errors.submit && <p role="alert" className="mb-2 text-xs font-semibold text-red-600">{errors.submit}</p>}
          {submitButton}
        </div>
      )}
    </form>
  );
}
