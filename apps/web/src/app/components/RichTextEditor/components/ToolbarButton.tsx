import type { ReactNode } from "react";

type ToolbarButtonProps = {
  active?: boolean;
  disabled?: boolean;
  label: string;
  onClick: () => void;
  children: ReactNode;
};

export function ToolbarButton({ active, disabled, label, onClick, children }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      className={`flex size-8 cursor-pointer items-center justify-center rounded-lg transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${active ? "bg-primary text-white" : "text-muted-foreground hover:bg-primary/10 hover:text-primary"}`}
    >
      {children}
    </button>
  );
}

