import { useEffect, useRef } from "react";
import { AlertTriangle, X } from "lucide-react";

type ConfirmDialogProps = {
  open: boolean;
  eyebrow: string;
  title: string;
  copy: string;
  confirmLabel: string;
  cancelLabel: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export default function ConfirmDialog({ open, eyebrow, title, copy, confirmLabel, cancelLabel, destructive = false, onConfirm, onCancel }: ConfirmDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    cancelRef.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [open, onCancel]);

  if (!open) return null;

  return <div className="confirm-dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onCancel(); }}>
    <section className={`confirm-dialog${destructive ? " destructive" : ""}`} role="dialog" aria-modal="true" aria-labelledby="confirm-dialog-title" aria-describedby="confirm-dialog-copy">
      <div className="confirm-dialog-heading"><span className="confirm-dialog-icon"><AlertTriangle size={19} /></span><button type="button" className="confirm-dialog-close" onClick={onCancel} aria-label={cancelLabel}><X size={17} /></button></div>
      <p className="eyebrow">{eyebrow}</p>
      <h2 id="confirm-dialog-title">{title}</h2>
      <p id="confirm-dialog-copy">{copy}</p>
      <div className="confirm-dialog-actions"><button ref={cancelRef} type="button" className="secondary-button compact" onClick={onCancel}>{cancelLabel}</button><button type="button" className={`primary-button small${destructive ? " danger" : ""}`} onClick={onConfirm}>{confirmLabel}</button></div>
    </section>
  </div>;
}
