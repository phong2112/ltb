import { useEffect, useMemo, useState } from "react";
import { useLocation, useSearchParams } from "react-router";
import { useData } from "@/app/data";
import { exportCandidateCvs } from "@/app/apis/requests";
import { notificationService } from "@/app/services/notification.service";
import { useLanguage } from "@/app/services/i18n-service";
import ListPagination from "@/app/components/ListPagination";
import { ApplicantList, ApplicantSearch, ApplicantsEmptyState, ApplicantsHeader } from "./components";
import { APPLICANTS_PER_PAGE } from "./constants";
import type { JobApplicantsAsideProps } from "./types";
import { filterApplicants, getSortedJobCandidates, paginateApplicants } from "./utils";

export default function JobApplicantsAside({ jobId }: JobApplicantsAsideProps) {
  const { candidates } = useData();
  const { language, t } = useLanguage();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState(() => searchParams.get("applicantQ") ?? "");
  const [page, setPage] = useState(() => readPositivePage(searchParams, "applicantPage"));
  const [isExporting, setIsExporting] = useState(false);

  const jobCandidates = useMemo(
    () => getSortedJobCandidates(candidates, jobId),
    [candidates, jobId],
  );
  const filteredCandidates = useMemo(
    () => filterApplicants(jobCandidates, search),
    [jobCandidates, search],
  );
  const { activePage, visibleCandidates } = paginateApplicants(filteredCandidates, page, APPLICANTS_PER_PAGE);
  const exportableCount = jobCandidates.filter(candidate => Boolean(candidate.cvFile)).length;

  async function handleExport() {
    if (!exportableCount || isExporting) return;
    setIsExporting(true);
    const toastId = notificationService.loading("Đang tạo file ZIP CV...");
    try {
      await exportCandidateCvs({ scope: "job", jobId });
      notificationService.success("Đã tải file ZIP CV", toastId);
    } catch (error) {
      notificationService.error(error, "Không thể xuất CV", toastId);
    } finally {
      setIsExporting(false);
    }
  }

  useEffect(() => {
    setPage(1);
  }, [jobId, search]);

  useEffect(() => {
    setSearch(searchParams.get("applicantQ") ?? "");
    setPage(readPositivePage(searchParams, "applicantPage"));
  }, [searchParams]);

  useEffect(() => {
    const next = new URLSearchParams(searchParams);
    setOptionalParam(next, "applicantQ", search.trim());
    setOptionalParam(next, "applicantPage", page > 1 ? String(page) : "");
    if (next.toString() !== searchParams.toString()) setSearchParams(next, { replace: true });
  }, [page, search, searchParams, setSearchParams]);

  const returnTo = `${location.pathname}${location.search}`;

  return (
    <aside className="self-start overflow-hidden rounded-2xl border border-border/80 bg-white shadow-[0_10px_30px_rgba(120,70,86,0.06)] xl:sticky xl:top-20 xl:col-start-2 xl:row-start-1 xl:row-span-2 xl:max-h-[calc(100vh-6rem)]">
      <ApplicantsHeader count={jobCandidates.length} subtitle={t("admin.applications")} title={t("admin.jobApplicants")} exportableCount={exportableCount} exporting={isExporting} onExport={() => void handleExport()} />

      {jobCandidates.length > 0 ? (
        <>
          <ApplicantSearch
            clearLabel={t("common.clearFilters")}
            countLabel={t("admin.jobApplicantsCount")}
            filteredCount={filteredCandidates.length}
            placeholder={t("admin.searchJobApplicants")}
            search={search}
            totalCount={jobCandidates.length}
            onChange={setSearch}
          />

          {visibleCandidates.length > 0 ? (
            <ApplicantList candidates={visibleCandidates} language={language} returnTo={returnTo} />
          ) : (
            <ApplicantsEmptyState
              clearLabel={t("common.clearFilters")}
              mode="no-results"
              title={t("admin.noMatchingJobApplicants")}
              onClearSearch={() => setSearch("")}
            />
          )}

          <ListPagination
            currentPage={activePage}
            pageSize={APPLICANTS_PER_PAGE}
            totalItems={filteredCandidates.length}
            onPageChange={setPage}
          />
        </>
      ) : (
        <ApplicantsEmptyState
          clearLabel={t("common.clearFilters")}
          hint={t("admin.noJobApplicantsHint")}
          mode="no-applicants"
          title={t("admin.noJobApplicants")}
        />
      )}
    </aside>
  );
}

function readPositivePage(searchParams: URLSearchParams, key: string) {
  const value = Number(searchParams.get(key));
  return Number.isInteger(value) && value > 0 ? value : 1;
}

function setOptionalParam(params: URLSearchParams, key: string, value: string) {
  if (value) {
    params.set(key, value);
  } else {
    params.delete(key);
  }
}
