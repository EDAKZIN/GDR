import { createElement, useEffect, useState } from "react";
import {
  AlignLeft,
  Calendar,
  CalendarClock,
  Check,
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  FileText,
  FileType,
  Folder,
  Hash,
  Image as ImageIcon,
  KeyRound,
  Link2,
  List,
  Mail,
  Pencil,
  Save,
  Tag,
  Trash2,
  Trash,
  ToggleLeft,
  X,
} from "lucide-react";
import type { ComponentType } from "react";
import type { Field } from "../../core/fields";
import { getFieldTypeHandler } from "../../core/fields";
import { useT } from "../../i18n";
import { formatLocalizedDate, formatLocalizedDateTime, formatRelativeTime } from "../../core/utils/relativeTime";
import { useRecordStore } from "../../stores";
import { FieldRenderer } from "../forms/fields";
import { ConfirmModal } from "../components/ConfirmModal";
import {
  btnDangerGhost,
  btnPrimary,
  btnSecondary,
  chipNeutral,
  modalBackdrop,
  modalFooter,
  modalHeader,
  modalPanel,
} from "../components/uiStyles";
import { formatValue } from "./recordValues";

/** Icono representativo por tipo de campo para las filas de la ficha. */
const FIELD_TYPE_ICONS: Record<string, ComponentType<{ className?: string }>> = {
  boolean: ToggleLeft,
  date: Calendar,
  datetime: CalendarClock,
  email: Mail,
  file_path: Folder,
  image: ImageIcon,
  long_text: AlignLeft,
  number: Hash,
  password: KeyRound,
  select: List,
  tags: Tag,
  text: FileType,
  url: Link2,
};

function fieldTypeIcon(type: string): ComponentType<{ className?: string }> {
  return FIELD_TYPE_ICONS[type] ?? FileText;
}

/** Badge genérico para valores categóricos (Sí/No, select). */
function ValueBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center rounded-full border border-zinc-700 bg-zinc-800 px-2.5 py-0.5 text-xs font-medium text-zinc-200">
      {label}
    </span>
  );
}

function ChipList({ items }: { items: readonly unknown[] }) {
  return (
    <span className="flex flex-wrap gap-1.5">
      {items.map((item, index) => (
        <span
          key={`${String(item)}:${String(index)}`}
          className="inline-flex items-center gap-1 rounded-full border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 text-xs font-medium text-sky-200"
        >
          <Tag className="h-3 w-3 opacity-70" />
          {String(item)}
        </span>
      ))}
    </span>
  );
}

/** Fila etiqueta→valor de la ficha, con renderizado rico por tipo de campo. */
function ValueRow({
  field,
  value,
  revealed,
  copied,
  onToggleReveal,
  onCopied,
  onOpenImage,
}: {
  field: Field;
  value: unknown;
  revealed: boolean;
  copied: boolean;
  onToggleReveal: () => void;
  onCopied: () => void;
  onOpenImage: (src: string) => void;
}) {
  const { t } = useT();
  const typeIcon = createElement(fieldTypeIcon(field.type), {
    className: "h-3.5 w-3.5 shrink-0 text-zinc-600",
  });
  const handler = getFieldTypeHandler(field.type);
  const empty = handler.isEmpty(value);
  const formatted = empty ? "—" : formatValue(field, value);

  let content;
  if (empty) {
    content = <span className="break-all text-sm text-zinc-600">—</span>;
  } else if (field.type === "password") {
    content = (
      <span className="flex items-center gap-1.5">
        <span className="break-all font-mono text-sm text-zinc-100">
          {revealed && typeof value === "string" ? value : formatted}
        </span>
        <button
          type="button"
          aria-label={revealed ? t("registros.ocultarContrasena") : t("registros.mostrarContrasena")}
          title={revealed ? t("registros.ocultar") : t("registros.mostrar")}
          className="shrink-0 rounded-md p-1 text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-100"
          onClick={onToggleReveal}
        >
          {revealed ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
        </button>
        {typeof value === "string" ? (
          <button
            type="button"
            aria-label={t("registros.copiarContrasena")}
            title={t("registros.copiarContrasena")}
            className="shrink-0 rounded-md p-1 text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-100"
            onClick={() => {
              void navigator.clipboard.writeText(value);
              onCopied();
            }}
          >
            {copied ? <Check className="h-3.5 w-3.5 text-sky-300" /> : <Copy className="h-3.5 w-3.5" />}
          </button>
        ) : null}
      </span>
    );
  } else if (field.type === "boolean") {
    content = <ValueBadge label={value === true ? t("comun.si") : t("comun.no")} />;
  } else if (field.type === "select") {
    content = <ValueBadge label={formatted} />;
  } else if ((field.type === "tags" || field.type === "multiselect") && Array.isArray(value)) {
    content = <ChipList items={value} />;
  } else if (field.type === "image" && typeof value === "string") {
    content = (
      <button
        type="button"
        title={t("registros.verEnGrande")}
        className="group relative inline-block max-w-full cursor-zoom-in overflow-hidden rounded-lg border border-zinc-700"
        onClick={() => {
          onOpenImage(value);
        }}
      >
        <img
          src={value}
          alt={field.name}
          className="max-h-48 w-auto object-contain transition-transform duration-150 group-hover:scale-[1.02]"
        />
        <span className="absolute inset-x-0 bottom-0 flex items-center justify-center bg-black/60 py-1 text-[10px] uppercase tracking-wide text-zinc-300 opacity-0 transition-opacity group-hover:opacity-100">
          {t("registros.ampliar")}
        </span>
      </button>
    );
  } else if (field.type === "url" && typeof value === "string") {
    content = (
      <a
        href={value}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1 break-all text-sm text-sky-300 underline decoration-sky-500/40 underline-offset-2 hover:decoration-sky-300"
      >
        {formatted}
        <ExternalLink className="h-3.5 w-3.5 shrink-0" />
      </a>
    );
  } else if (field.type === "email" && typeof value === "string") {
    content = (
      <a
        href={`mailto:${value}`}
        className="inline-flex items-center gap-1 break-all text-sm text-sky-300 underline decoration-sky-500/40 underline-offset-2 hover:decoration-sky-300"
      >
        <Mail className="h-3.5 w-3.5 shrink-0 opacity-70" />
        {formatted}
      </a>
    );
  } else if (field.type === "file_path" && typeof value === "string") {
    content = (
      <span className="flex min-w-0 items-center gap-1.5">
        <code className="min-w-0 break-all rounded bg-zinc-800/70 px-1.5 py-0.5 font-mono text-xs text-zinc-200">
          {value}
        </code>
        <button
          type="button"
          aria-label={t("registros.copiarRuta")}
          title={t("registros.copiarRuta")}
          className="shrink-0 rounded-md p-1 text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-100"
          onClick={() => {
            void navigator.clipboard.writeText(value);
            onCopied();
          }}
        >
          {copied ? <Check className="h-3.5 w-3.5 text-sky-300" /> : <Copy className="h-3.5 w-3.5" />}
        </button>
      </span>
    );
  } else if (field.type === "long_text" && typeof value === "string") {
    content = (
      <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-zinc-100">
        {value}
      </p>
    );
  } else if (field.type === "date") {
    content = (
      <span className="text-sm text-zinc-100">
        {formatLocalizedDate(String(value))}
      </span>
    );
  } else if (field.type === "datetime") {
    content = (
      <span className="text-sm text-zinc-100">
        {formatLocalizedDateTime(String(value))}
      </span>
    );
  } else {
    content = (
      <span className={`break-all text-sm ${formatted === "—" ? "text-zinc-600" : "text-zinc-100"}`}>
        {formatted}
      </span>
    );
  }

  return (
    <div className="grid grid-cols-[minmax(9rem,12rem)_1fr] items-start gap-4 py-3">
      <div className="flex items-center gap-2 pt-0.5">
        {typeIcon}
        <span className="truncate text-xs font-medium text-zinc-500" title={field.name}>
          {field.name}
        </span>
      </div>
      <div className="min-w-0">{content}</div>
    </div>
  );
}

/**
 * Ficha rica del registro activo según el modo de useRecordStore: vista con
 * cabecera jerárquica (título del registro, marcas relativas, papelera) y
 * filas etiqueta→valor por tipo; creación/edición con FieldRenderer y
 * validación required. Esc y el clic fuera cierran.
 */
export function RecordModal() {
  const { t } = useT();
  const mode = useRecordStore((state) => state.activeMode);
  const fields = useRecordStore((state) => state.fields);
  const activeId = useRecordStore((state) => state.activeId);
  const activeDetail = useRecordStore((state) => state.activeDetail);
  const draft = useRecordStore((state) => state.draft);
  const errors = useRecordStore((state) => state.errors);
  const saving = useRecordStore((state) => state.saving);
  const error = useRecordStore((state) => state.error);
  const setDraftValue = useRecordStore((state) => state.setDraftValue);
  const saveActive = useRecordStore((state) => state.saveActive);
  const startEditing = useRecordStore((state) => state.startEditing);
  const openRecord = useRecordStore((state) => state.openRecord);
  const closeActive = useRecordStore((state) => state.closeActive);
  const deleteActive = useRecordStore((state) => state.deleteActive);

  const [revealed, setRevealed] = useState<ReadonlySet<string>>(new Set());
  const [copiedFieldId, setCopiedFieldId] = useState<string | null>(null);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const open = mode !== "closed";

  // Esc cierra primero la imagen ampliada y después la ficha.
  useEffect(() => {
    if (lightboxSrc === null) {
      return;
    }
    function onKeyDown(event: KeyboardEvent): void {
      if (event.key === "Escape") {
        event.stopPropagation();
        setLightboxSrc(null);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [lightboxSrc]);

  useEffect(() => {
    // Con la imagen ampliada abierta, su propio efecto gestiona Esc; cerrar
    // aquí también dejaría la ficha entera (stopPropagation no aísla listeners
    // del mismo window).
    if (!open || saving || confirmingDelete || lightboxSrc !== null) {
      return;
    }
    function onKeyDown(event: KeyboardEvent): void {
      if (event.key === "Escape") {
        event.stopPropagation();
        closeActive();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, saving, confirmingDelete, lightboxSrc, closeActive]);

  if (!open) {
    return null;
  }

  /** Cancelar: en edición se vuelve a la vista; en creación se cierra. */
  function cancel(): void {
    if (mode === "edit" && activeId !== null) {
      void openRecord(activeId);
      return;
    }
    closeActive();
  }

  function toggleReveal(fieldId: string): void {
    setRevealed((previous) => {
      const next = new Set(previous);
      if (next.has(fieldId)) {
        next.delete(fieldId);
      } else {
        next.add(fieldId);
      }
      return next;
    });
  }

  function markCopied(fieldId: string): void {
    setCopiedFieldId(fieldId);
    window.setTimeout(() => {
      setCopiedFieldId((current) => (current === fieldId ? null : current));
    }, 1500);
  }

  const editing = mode === "create" || mode === "edit";
  const valuesByField =
    activeDetail !== null
      ? new Map(activeDetail.values.map((entry) => [entry.fieldId, entry.value]))
      : new Map<string, unknown>();

  // Título del registro: primer campo de texto con valor; si no, el primer
  // campo obligatorio con valor; si no, un título genérico.
  let recordTitle = t("registros.sinTituloFicha");
  if (!editing) {
    const titleField =
      fields.find(
        (field) =>
          field.type === "text" &&
          !getFieldTypeHandler(field.type).isEmpty(valuesByField.get(field.id)),
      ) ??
      fields.find(
        (field) =>
          field.required &&
          !getFieldTypeHandler(field.type).isEmpty(valuesByField.get(field.id)),
      );
    const rawTitle = titleField?.name !== undefined ? valuesByField.get(titleField.id) : undefined;
    if (typeof rawTitle === "string" && rawTitle.trim() !== "") {
      recordTitle = rawTitle;
    } else if (typeof rawTitle === "number") {
      recordTitle = String(rawTitle);
    }
  }

  const inTrash = activeDetail !== null && activeDetail.deletedAt !== null;

  return (
    <div
      className={modalBackdrop}
      onClick={() => {
        // Clic fuera cierra solo en vista y sin capas superpuestas; en
        // creación/edición se exige botón explícito para no perder el borrador.
        if (!editing && !saving && !confirmingDelete && lightboxSrc === null) {
          closeActive();
        }
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label={mode === "view" ? t("registros.detalleAria") : t("registros.edicionAria")}
        className={`${modalPanel} max-h-[92vh] max-w-3xl`}
        onClick={(event) => {
          event.stopPropagation();
        }}
      >
        {/* Cabecera jerárquica de la ficha */}
        <header className={`${modalHeader} items-start`}>
          <div className="flex min-w-0 flex-1 items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-zinc-800 bg-sky-500/10 text-sky-300">
              <FileText className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              {editing ? (
                <h2 className="truncate text-base font-semibold text-zinc-50">
                  {mode === "create" ? t("registros.nuevo") : t("registros.editarModal")}
                </h2>
              ) : (
                <>
                  <h2 className="truncate text-lg font-bold tracking-tight text-zinc-50" title={recordTitle}>
                    {recordTitle}
                  </h2>
                  {activeDetail !== null ? (
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      <span
                        className={`${chipNeutral} normal-case`}
                        title={t("registros.creadoChipTitle", { n: formatLocalizedDateTime(activeDetail.createdAt) })}
                      >
                        {t("registros.creadoChip", { n: formatRelativeTime(activeDetail.createdAt) })}
                      </span>
                      <span
                        className={`${chipNeutral} normal-case`}
                        title={t("registros.modificadoChipTitle", { n: formatLocalizedDateTime(activeDetail.updatedAt) })}
                      >
                        {t("registros.modificadoChip", { n: formatRelativeTime(activeDetail.updatedAt) })}
                      </span>
                      {inTrash ? (
                        <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-rose-500/40 bg-rose-500/10 px-2 py-0.5 text-[11px] font-semibold text-rose-300">
                          <Trash className="h-3 w-3" />
                          {t("registros.enPapelera")}
                        </span>
                      ) : null}
                    </div>
                  ) : null}
                </>
              )}
            </div>
          </div>

          {!editing ? (
            <div className="flex shrink-0 items-center gap-2">
              <button type="button" className={btnPrimary} onClick={startEditing}>
                <Pencil className="h-3.5 w-3.5" />
                {t("comun.editar")}
              </button>
              <button
                type="button"
                className={`${btnDangerGhost} px-3 py-1.5 text-xs font-semibold`}
                onClick={() => {
                  setConfirmingDelete(true);
                }}
              >
                <Trash2 className="h-3.5 w-3.5" />
                {t("comun.eliminar")}
              </button>
            </div>
          ) : null}

          <button
            type="button"
            className="rounded-md border border-zinc-700 p-1.5 text-zinc-400 transition-colors hover:text-zinc-100 disabled:opacity-50"
            onClick={() => {
              if (editing) {
                cancel();
              } else {
                closeActive();
              }
            }}
            aria-label={t("comun.cerrar")}
            disabled={saving}
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {error !== null ? (
            <p className="mb-3 rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
              {error}
            </p>
          ) : null}

          {editing ? (
            <div className="space-y-4">
              {fields.map((field) => (
                <FieldRenderer
                  key={field.id}
                  field={field}
                  value={draft[field.id]}
                  error={errors[field.id] ?? null}
                  onChange={(value) => {
                    setDraftValue(field.id, value);
                  }}
                  disabled={saving}
                />
              ))}
              {fields.length === 0 ? (
                <p className="py-6 text-sm text-zinc-500">
                  {t("plantilla.anadirCamposNota")}
                </p>
              ) : null}
              {Object.keys(errors).length > 0 ? (
                <p className="text-xs font-medium text-rose-400">
                  {t("registros.revisaErrores")}
                </p>
              ) : null}
            </div>
          ) : (
            <div className="divide-y divide-zinc-800/80 rounded-lg border border-zinc-800 bg-zinc-950/40 px-4 py-1">
              {fields.map((field) => (
                <ValueRow
                  key={field.id}
                  field={field}
                  value={valuesByField.get(field.id)}
                  revealed={revealed.has(field.id)}
                  copied={copiedFieldId === field.id}
                  onToggleReveal={() => {
                    toggleReveal(field.id);
                  }}
                  onCopied={() => {
                    markCopied(field.id);
                  }}
                  onOpenImage={setLightboxSrc}
                />
              ))}
              {fields.length === 0 ? (
                <p className="py-6 text-sm text-zinc-500">
                  {t("plantilla.anadirCamposNota")}
                </p>
              ) : null}
            </div>
          )}
        </div>

        {editing ? (
          <footer className={modalFooter}>
            <button type="button" className={btnSecondary} onClick={cancel} disabled={saving}>
              {t("comun.cancelar")}
            </button>
            <button
              type="button"
              className={btnPrimary}
              onClick={() => {
                void saveActive();
              }}
              disabled={saving}
            >
              <Save className="h-3.5 w-3.5" />
              {saving ? t("comun.guardando") : t("comun.guardar")}
            </button>
          </footer>
        ) : null}
      </section>

      {/* Vista ampliada de imagen */}
      {lightboxSrc !== null ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t("registros.imagenAmpliadaAria")}
          className="fixed inset-0 z-[70] flex cursor-zoom-out items-center justify-center bg-black/85 p-6"
          onClick={() => {
            setLightboxSrc(null);
          }}
        >
          <img
            src={lightboxSrc}
            alt=""
            className="max-h-[88vh] max-w-full rounded-lg border border-zinc-700 object-contain shadow-2xl"
          />
          <button
            type="button"
            aria-label={t("registros.cerrarImagen")}
            className="absolute right-4 top-4 rounded-md border border-zinc-700 bg-zinc-900 p-2 text-zinc-300 transition-colors hover:text-zinc-100"
            onClick={(event) => {
              event.stopPropagation();
              setLightboxSrc(null);
            }}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : null}

      {confirmingDelete ? (
        <ConfirmModal
          title={t("registros.eliminarTitulo")}
          message={t("registros.eliminarMensaje")}
          confirmLabel={t("comun.eliminar")}
          onConfirm={() => deleteActive()}
          onClose={() => {
            setConfirmingDelete(false);
          }}
        />
      ) : null}
    </div>
  );
}
