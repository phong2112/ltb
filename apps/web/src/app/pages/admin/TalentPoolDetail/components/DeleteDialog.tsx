import { useState } from "react";
import { Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/app/components/Common/alert-dialog";
import { useLanguage } from "@/app/services/i18n-service";

type Props = {
  name: string;
  isDeleting: boolean;
  onConfirm: () => void;
  t: ReturnType<typeof useLanguage>["t"];
};

export function DeleteDialog({ name, isDeleting, onConfirm, t }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="inline-flex h-10 items-center gap-2 rounded-lg border border-red-200 bg-white px-3 text-xs font-bold text-red-700 hover:bg-red-50">
        <Trash2 size={14} /> {t("talentPool.delete")}
      </button>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("talentPool.deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("talentPool.deleteDescription")} <strong>{name}</strong>.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("admin.cancel")}</AlertDialogCancel>
            <AlertDialogAction disabled={isDeleting} onClick={onConfirm} className="bg-red-600 text-white hover:bg-red-700">
              {isDeleting ? t("talentPool.deleting") : t("talentPool.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
