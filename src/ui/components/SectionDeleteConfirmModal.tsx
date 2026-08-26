import { useEffect, useState } from "react";
import { TriangleAlert } from "lucide-react";
import type { Section } from "../../core/sections";
import { useT } from "../../i18n";
import { useSectionStore } from "../../stores/useSectionStore";
import {
  btnDangerSolid,
  btnSecondary,
  modalBackdrop,
  modalPanel,
} from "./uiStyles";

/**
 * Modal de elección al eliminar una sección CON sub-secciones vivas:
 * «Eliminar todo» (cascada a la papelera) o «Conservar sub-secciones»
 * (solo la madre a la papelera y las hijas suben al nivel del abuelo).
 * Esc y el clic en el fondo cancelan.
 */
export function SectionDeleteConfirmModal({
  section,
  onClose,
}: {
  section: Section;
  onClose: () => void;
}) {
  const { t } = useT();
  const softDeleteSection = useSectionStore((store) => store.softDeleteSection);
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

  async function run(keepChildren: boolean): Promise<void> {
    setBusy(true);
    try {
      await softDeleteSection(section.id, keepChildren ? { keepChildren } : undefined);
      onClose();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className={modalBackdrop}
      onClick={() => {
        if (!busy) {
          onClose();
        }
      }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-label={t("secciones.eliminarConHijasTitulo")}
        className={`${modalPanel} max-w-sm gap-3 p-5`}
        onClick={(event) => {
          event.stopPropagation();
        }}
      >
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-rose-500/15 text-rose-300">
            <TriangleAlert className="h-4.5 w-4.5" />
          </span>
          <h2 className="text-sm font-semibold text-zinc-100">
            {t("secciones.eliminarConHijasTitulo")}
          </h2>
        </div>

        <p className="text-xs leading-relaxed text-zinc-400">
          {t("secciones.eliminarConHijasDesc", { n: section.name })}
        </p>

        <footer className="mt-1 flex flex-wrap items-center justify-end gap-2">
          <button type="button" className={btnSecondary} onClick={onClose} disabled={busy}>
            {t("comun.cancelar")}
          </button>
          <button
            type="button"
            className={btnSecondary}
            disabled={busy}
            onClick={() => {
              void run(true);
            }}
          >
            {t("secciones.conservarHijas")}
          </button>
          <button
            type="button"
            className={btnDangerSolid(true)}
            disabled={busy}
            onClick={() => {
              void run(false);
            }}
          >
            {t("secciones.eliminarTodo")}
          </button>
        </footer>
      </div>
    </div>
  );
}
