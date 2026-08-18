import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import {
  deleteTalentPoolEntry,
  getAdminJobs,
  getTalentPoolEntry,
  promoteTalentPoolEntry,
  retryTalentPoolAiVerification,
  updateTalentPoolEntry,
} from "@/app/apis/requests";
import type { ApiTalentPoolEntry } from "@/app/apis/models";
import type { ApiJob } from "@/app/data";
import { notificationService } from "@/app/services/notification.service";
import { useLanguage } from "@/app/services/i18n-service";
import { EMPTY_FORM, POLL_INTERVAL_MS } from "./constants";
import { formFromEntry, splitValues } from "./utils";
import type { ProfileForm } from "./types";

/**
 * Manages all state, data-fetching, polling, and mutation handlers for the TalentPoolDetail page.
 *
 * Polls the entry every {@link POLL_INTERVAL_MS} while its status is PENDING or EXTRACTING,
 * but only updates the form when the user has no unsaved changes (`isDirty === false`).
 */
export function useTalentPoolDetail(id: string | undefined, returnTo: string) {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [entry, setEntry] = useState<ApiTalentPoolEntry | null>(null);
  const [jobs, setJobs] = useState<ApiJob[]>([]);
  const [form, setForm] = useState<ProfileForm>(EMPTY_FORM);
  const [promoteJobId, setPromoteJobId] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isPromoting, setIsPromoting] = useState(false);
  const [isVerifyingAi, setIsVerifyingAi] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setIsLoading(true);
    Promise.all([getTalentPoolEntry(id), getAdminJobs()])
      .then(([loadedEntry, loadedJobs]) => {
        if (cancelled) return;
        setEntry(loadedEntry);
        setForm(formFromEntry(loadedEntry));
        setJobs(loadedJobs);
        setError("");
      })
      .catch(loadError => {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : t("talentPool.detailLoadError"));
      })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, [id, t]);

  useEffect(() => {
    if (!id || !entry || (entry.status !== "PENDING" && entry.status !== "EXTRACTING")) return;
    const timer = window.setInterval(() => {
      void getTalentPoolEntry(id).then(updated => {
        setEntry(updated);
        if (!isDirty) setForm(formFromEntry(updated));
      }).catch(() => undefined);
    }, POLL_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [entry, id, isDirty]);

  function updateField(field: keyof ProfileForm, value: string) {
    setForm(current => ({ ...current, [field]: value }));
    setIsDirty(true);
  }

  async function handleSave() {
    if (!id || !entry) return;
    setIsSaving(true);
    const toastId = notificationService.loading(t("talentPool.saving"));
    try {
      const updated = await updateTalentPoolEntry(id, {
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        title: form.title.trim(),
        skills: splitValues(form.skills),
        notes: form.notes.trim(),
      });
      setEntry(updated);
      setForm(formFromEntry(updated));
      setIsDirty(false);
      notificationService.success(t("talentPool.saved"), toastId);
    } catch (saveError) {
      notificationService.error(saveError, t("talentPool.saveError"), toastId);
    } finally {
      setIsSaving(false);
    }
  }

  async function handlePromote() {
    if (!id || !entry || !promoteJobId) return;
    setIsPromoting(true);
    const toastId = notificationService.loading(t("talentPool.promoting"));
    try {
      const result = await promoteTalentPoolEntry(id, promoteJobId);
      setEntry(current => current ? { ...current, promotedApplicationId: result.applicationId } : current);
      notificationService.success(t("talentPool.promoted"), toastId);
    } catch (promoteError) {
      notificationService.error(promoteError, t("talentPool.promoteError"), toastId);
    } finally {
      setIsPromoting(false);
    }
  }

  async function handleVerifyAi() {
    if (!id || !entry || isVerifyingAi) return;
    setIsVerifyingAi(true);
    const toastId = notificationService.loading(t("talentPool.verifyingAi"));
    try {
      const updated = await retryTalentPoolAiVerification(id);
      setEntry(updated);
      if (!isDirty) setForm(formFromEntry(updated));
      notificationService.success(t("talentPool.verifyAiQueued"), toastId);
    } catch (verificationError) {
      notificationService.error(verificationError, t("talentPool.verifyAiError"), toastId);
    } finally {
      setIsVerifyingAi(false);
    }
  }

  async function handleDelete() {
    if (!id) return;
    setIsDeleting(true);
    try {
      await deleteTalentPoolEntry(id);
      notificationService.success(t("talentPool.deleted"));
      navigate(returnTo, { replace: true });
    } catch (deleteError) {
      notificationService.error(deleteError, t("talentPool.deleteError"));
      setIsDeleting(false);
    }
  }

  return {
    entry,
    jobs,
    form,
    promoteJobId,
    isLoading,
    isSaving,
    isPromoting,
    isVerifyingAi,
    isDeleting,
    isDirty,
    error,
    setPromoteJobId,
    updateField,
    handleSave,
    handlePromote,
    handleVerifyAi,
    handleDelete,
  };
}
