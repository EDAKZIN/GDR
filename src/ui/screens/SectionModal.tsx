import { useEffect, useState } from "react";
import { X } from "lucide-react";
import type { Section } from "../../core/sections";
import { useT } from "../../i18n";
import { useSectionStore } from "../../stores";
import { IconRenderer } from "../components/IconRenderer";
import { SUGGESTED_ICON_NAMES } from "../components/iconNames";
import {
  btnPrimary,
  btnSecondary,
  inputClass,
  modalBackdrop,
  modalPanel,
} from "../components/uiStyles";

export interface SectionModalProps {
  mode:
    | { kind: "create"; parentId?: string | null; parentName?: string }
    | { kind: "edit"; section: Section };
  onClose: () => void;
}

/** Modal ligero para crear o editar una sección (nombre, descripción, icono). */
export function SectionModal({ mode, onClose }: SectionModalProps) {
  const { t } = useT();
  const createSection = useSectionStore((store) => store.createSection);
  const updateSection = useSectionStore((store) => store.updateSection);
  const [name, setName] = useState(mode.kind === "edit" ? mode.section.name : "");
  const [description, setDescription] = useState(
    mode.kind === "edit" ? (mode.section.description ?? "") : "",
  );
  const [icon, setIcon] = useState(mode.kind === "edit" ? (mode.section.icon ?? "") : "");
  const [allowChildren, setAllowChildren] = useState(
    mode.kind === "edit" ? mode.section.allowChildren : true,
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Esc cierra el modal salvo durante el guardado.
  useEffect(() => {
    if (saving) {
      return;
    }
    function onKeyDown(event: KeyboardEvent): void {
      if (event.key === "Escape") {
        onClose();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [saving, onClose]);

  async function submit(): Promise<void> {
    setSaving(true);
    setError(null);
    try {
      const payload = {
        name,
        description: description.trim() === "" ? null : description.trim(),
        icon: icon.trim() === "" ? null : icon.trim(),
        allowChildren,
      };
      if (mode.kind === "create") {
        await createSection({ ...payload, parentId: mode.parentId });
      } else {
        await updateSection(mode.section.id, payload);
      }
      onClose();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : String(submitError));
      setSaving(false);
    }
  }

  return (
    <div className={modalBackdrop}>
      <form
        className={`${modalPanel} max-w-md gap-3 p-5`}
        onSubmit={(event) => {
          event.preventDefault();
          if (!saving && name.trim() !== "") {
            void submit();
          }
        }}
      >
        <header className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-zinc-100">
            {mode.kind === "edit" ? t("secciones.editar") : t("secciones.nueva")}
          </h2>
          <button
            type="button"
            className="rounded-md border border-zinc-700 p-1 text-zinc-400 transition-colors hover:text-zinc-100"
            onClick={onClose}
            aria-label={t("comun.cerrar")}
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        {mode.kind === "create" && mode.parentName !== undefined ? (
          <p className="rounded-md border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-500">
            {t("secciones.subseccionDe")} <span className="font-medium text-sky-300">{mode.parentName}</span>
          </p>
        ) : null}

        <label className="flex flex-col gap-1 text-xs font-medium text-zinc-400">
          {t("comun.nombre")}
          <input
            className={inputClass}
            value={name}
            onChange={(event) => {
              setName(event.target.value);
            }}
            autoFocus
            required
            maxLength={200}
          />
        </label>

        <label className="flex flex-col gap-1 text-xs font-medium text-zinc-400">
          {t("comun.descripcion")}
          <textarea
            className={`${inputClass} min-h-16 resize-y`}
            value={description}
            onChange={(event) => {
              setDescription(event.target.value);
            }}
            maxLength={2000}
          />
        </label>

        <div className="flex flex-col gap-1 text-xs font-medium text-zinc-400">
          {t("secciones.icono")}
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-md border border-zinc-700 bg-zinc-800 text-sky-300">
              <IconRenderer icon={icon} />
            </span>
            <input
              className={inputClass}
              value={icon}
              onChange={(event) => {
                setIcon(event.target.value);
              }}
              list="suggested-icons"
              placeholder={t("secciones.iconoPlaceholder")}
              maxLength={100}
            />
            <datalist id="suggested-icons">
              {SUGGESTED_ICON_NAMES.map((suggested) => (
                <option key={suggested} value={suggested} />
              ))}
            </datalist>
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-zinc-400">
            <input
              type="checkbox"
              className="h-3.5 w-3.5 shrink-0 accent-sky-500"
              checked={allowChildren}
              onChange={(event) => {
                setAllowChildren(event.target.checked);
              }}
            />
            {t("secciones.permitirSubsecciones")}
          </label>
          {!allowChildren ? (
            <p className="rounded-md border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-[11px] leading-relaxed text-zinc-500">
              {t("secciones.listaDirectaNota")}
            </p>
          ) : null}
        </div>

        {error !== null ? (
          <p className="rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
            {error}
          </p>
        ) : null}

        <footer className="mt-1 flex items-center justify-end gap-2">
          <button type="button" className={btnSecondary} onClick={onClose} disabled={saving}>
            {t("comun.cancelar")}
          </button>
          <button type="submit" className={btnPrimary} disabled={saving || name.trim() === ""}>
            {saving ? t("comun.guardando") : t("comun.guardar")}
          </button>
        </footer>
      </form>
    </div>
  );
}
