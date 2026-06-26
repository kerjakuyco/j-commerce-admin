import { X } from "lucide-react";
import { useEffect, type ReactNode } from "react";

export function ActionSheet({
  open,
  title,
  eyebrow,
  closeLabel,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  eyebrow?: string;
  closeLabel: string;
  onClose: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return undefined;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, open]);

  if (!open) return null;

  return (
    <div className="action-sheet-layer" role="presentation">
      <button
        className="action-sheet-backdrop"
        type="button"
        aria-label={closeLabel}
        onClick={onClose}
      />
      <section
        className="action-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="action-sheet-title"
      >
        <header className="action-sheet-header">
          <div>
            {eyebrow && <span className="eyebrow">{eyebrow}</span>}
            <h2 id="action-sheet-title">{title}</h2>
          </div>
          <button
            className="icon-button action-sheet-close"
            type="button"
            aria-label={closeLabel}
            onClick={onClose}
          >
            <X size={16} aria-hidden="true" />
          </button>
        </header>
        <div className="action-sheet-body">{children}</div>
      </section>
    </div>
  );
}
