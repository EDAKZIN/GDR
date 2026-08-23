import { useEffect, useState } from "react";
import { TriangleAlert } from "lucide-react";
import {
  btnDangerSolid,
  btnSecondary,
  modalPanel,
} from "./uiStyles";

export interface ConfirmModalProps {
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void | Promise<void>;
  onClose: () => void;
}

/**
 * Modal ligero de confirmación para acciones destructivas.
 * Esc y el clic en el fondo lo cierran sin ejecutar la acción.
 */
export function ConfirmModal({
  title,
  message,
  confirmLabel = "Eliminar",
  danger = true,
  onConfirm,
  onClose,
}: ConfirmModalProps) {
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (busy) {
      return;
    }
    function onKeyDown(event: KeyboardEvent): void {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [busy, onClose]);

  async function confirm(): Promise<void> {
    setBusy(true);
    try {
      await onConfirm();
      onClose();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4"
      onClick={() => {
        if (!busy) {
          onClose();
        }
      }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-label={title}
        className={`${modalPanel} max-w-sm gap-3 p-5`}
        onClick={(event) => {
          event.stopPropagation();
        }}
      >
        <div className="flex items-center gap-2.5">
          <span
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
              danger ? "bg-rose-500/15 text-rose-300" : "bg-sky-500/15 text-sky-300"
            }`}
          >
            <TriangleAlert className="h-4.5 w-4.5" />
          </span>
          <h2 className="text-sm font-semibold text-zinc-100">{title}</h2>
        </div>

        <p className="text-xs leading-relaxed text-zinc-400">{message}</p>

        <footer className="mt-1 flex items-center justify-end gap-2">
          <button type="button" className={btnSecondary} onClick={onClose} disabled={busy}>
            Cancelar
          </button>
          <button
            type="button"
            className={btnDangerSolid(danger)}
            onClick={() => {
              void confirm();
            }}
            disabled={busy}
          >
            {busy ? "Procesando…" : confirmLabel}
          </button>
        </footer>
      </div>
    </div>
  );
}
