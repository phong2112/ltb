import { useState } from "react";
import { FileCheck2, Send } from "lucide-react";
import { useNavigate } from "react-router";
import type { Job } from "@/app/data";
import ApplicationForm from "@/app/components/ApplicationForm";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/app/components/ui/dialog";
import { useLanguage } from "@/app/i18n";

type ApplicationDialogProps = {
  job: Job;
  triggerClassName: string;
};

export default function ApplicationDialog({
  job,
  triggerClassName,
}: ApplicationDialogProps) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { t } = useLanguage();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className={`${triggerClassName} cursor-pointer active:scale-[0.98]`}
        >
          <Send size={15} /> {t("jobDetail.applyNow")}
        </button>
      </DialogTrigger>
      <DialogContent className="flex h-[100dvh] max-h-[100dvh] w-full max-w-none flex-col gap-0 overflow-hidden rounded-none border-0 bg-white p-0 shadow-[0_24px_80px_rgba(74,37,50,0.25)] sm:h-[min(800px,calc(100dvh-2rem))] sm:w-[calc(100%-2rem)] sm:max-w-[620px] sm:rounded-2xl sm:border sm:border-primary/15">
        <DialogHeader className="flex-none border-b border-border bg-white px-5 py-5 pr-16 text-left sm:px-6 sm:pr-16">
          <div className="flex items-start gap-3">
            <div className="flex size-11 flex-none items-center justify-center rounded-full bg-primary/10 text-primary">
              <FileCheck2 size={20} strokeWidth={2.2} />
            </div>
            <div className="min-w-0">
              <DialogTitle
                className="text-xl font-black leading-tight text-foreground"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                {t("apply.formTitle")}
              </DialogTitle>
              <DialogDescription className="mt-1 max-w-md text-[13px] leading-5 text-muted-foreground">
                {t("jobDetail.applyBody")}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <ApplicationForm
          job={job}
          variant="dialog"
          onSuccess={() => {
            setOpen(false);
            navigate("/apply/success");
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
