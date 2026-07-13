import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";
import { useLanguage } from "@/app/i18n";

type PageItem = number | "ellipsis-start" | "ellipsis-end";

function getPageItems(currentPage: number, totalPages: number): PageItem[] {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, index) => index + 1);
  if (currentPage <= 4) return [1, 2, 3, 4, 5, "ellipsis-end", totalPages];
  if (currentPage >= totalPages - 3) return [1, "ellipsis-start", totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
  return [1, "ellipsis-start", currentPage - 1, currentPage, currentPage + 1, "ellipsis-end", totalPages];
}

type ListPaginationProps = {
  currentPage: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
};

export default function ListPagination({ currentPage, pageSize, totalItems, onPageChange }: ListPaginationProps) {
  const { t } = useLanguage();
  const totalPages = Math.ceil(totalItems / pageSize);

  if (totalPages <= 1) return null;

  const goToPage = (page: number) => {
    onPageChange(Math.min(Math.max(page, 1), totalPages));
  };

  return (
    <nav aria-label={t("common.pagination")} className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3">
      <span className="text-xs text-muted-foreground">
        {t("common.page")} {currentPage}/{totalPages}
      </span>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => goToPage(currentPage - 1)}
          disabled={currentPage === 1}
          aria-label={t("common.previousPage")}
          className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-pink-50 hover:text-primary disabled:pointer-events-none disabled:opacity-40"
        >
          <ChevronLeft size={16} />
        </button>
        {getPageItems(currentPage, totalPages).map(item => (
          typeof item === "number" ? (
            <button
              key={item}
              type="button"
              onClick={() => goToPage(item)}
              aria-label={`${t("common.page")} ${item}`}
              aria-current={item === currentPage ? "page" : undefined}
              className={`flex size-8 items-center justify-center rounded-lg text-xs font-bold transition-colors ${item === currentPage ? "bg-primary text-white" : "text-muted-foreground hover:bg-pink-50 hover:text-primary"}`}
            >
              {item}
            </button>
          ) : (
            <span key={item} className="flex size-8 items-center justify-center text-muted-foreground" aria-hidden="true">
              <MoreHorizontal size={15} />
            </span>
          )
        ))}
        <button
          type="button"
          onClick={() => goToPage(currentPage + 1)}
          disabled={currentPage === totalPages}
          aria-label={t("common.nextPage")}
          className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-pink-50 hover:text-primary disabled:pointer-events-none disabled:opacity-40"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </nav>
  );
}
