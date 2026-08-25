import { useCallback, useEffect, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  GripVertical,
  MoreVertical,
  Pencil,
  Plus,
  RotateCcw,
  Trash2,
  X,
} from "lucide-react";
import { getFieldTypeHandler } from "../../core/fields";
import type { Field } from "../../core/fields";
import { getDb } from "../../database/client";
import { createFieldsRepository } from "../../database/repositories";
import { useT } from "../../i18n";
import { ConfirmModal } from "../components/ConfirmModal";
import { ReorderContainer, ReorderItem } from "../components/LongPressReorder";
import { useLongPressReorder } from "../components/useLongPressReorder";
import { FieldModal } from "./FieldModal";

const fieldsRepository = createFieldsRepository(getDb);

function typeLabel(type: string): string {
  return getFieldTypeHandler(type).label;
}

interface MenuAction {
  label: string;
  icon: typeof Pencil;
  run: () => void;
  danger?: boolean;
  disabled?: boolean;
}

type ModalState =
  { kind: "create" } | { kind: "edit"; field: Field } | { kind: "hardDelete"; field: Field } | null;

function FieldBadges({ field }: { field: Field }) {
  const { t } = useT();
  return (
    <span className="flex flex-wrap items-center gap-1.5 text-[11px] text-zinc-500">
      <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-zinc-400">
        {typeLabel(field.type)}
      </span>
      {field.required ? (
        <span className="rounded bg-sky-500/15 px-1.5 py-0.5 text-sky-300">{t("comun.obligatorio")}</span>
      ) : null}
      {field.searchable ? (
        <span className="rounded bg-sky-500/15 px-1.5 py-0.5 text-sky-300">{t("comun.buscable")}</span>
      ) : null}
    </span>
  );
}

/** Menú contextual de una fila de campo (editar, ordenar, deshabilitar…). */
function FieldRowMenu({
  field,
  isFirst,
  isLast,
  onEdit,
  onMove,
  onToggleEnabled,
  onDelete,
  onClose,
}: {
  field: Field;
  isFirst: boolean;
  isLast: boolean;
  onEdit: () => void;
  onMove: (delta: -1 | 1) => void;
  onToggleEnabled: () => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const { t } = useT();
  const actions: MenuAction[] = [
    { label: t("comun.editar"), icon: Pencil, run: onEdit },
    {
      label: t("comun.subir"),
      icon: ArrowUp,
      disabled: isFirst || !field.enabled,
      run: () => {
        onMove(-1);
      },
    },
    {
      label: t("comun.bajar"),
      icon: ArrowDown,
      disabled: isLast || !field.enabled,
      run: () => {
        onMove(1);
      },
    },
    field.enabled
      ? { label: t("comun.deshabilitar"), icon: X, run: onToggleEnabled }
      : { label: t("comun.habilitar"), icon: RotateCcw, run: onToggleEnabled },
    {
      label: t("comun.quitar"),
      icon: Trash2,
      danger: true,
      run: onDelete,
    },
  ];

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="absolute right-2 top-9 z-50 flex min-w-36 flex-col overflow-hidden rounded-lg border border-zinc-700 bg-zinc-900 py-1 shadow-2xl">
        {actions.map((action) => (
          <button
            key={action.label}
            type="button"
            className={`flex items-center gap-2 px-3 py-1.5 text-left text-xs transition-colors ${
              action.danger === true
                ? "text-rose-300 hover:bg-rose-500/10"
                : "text-zinc-200 hover:bg-zinc-800"
            } disabled:pointer-events-none disabled:opacity-40`}
            disabled={action.disabled === true}
            onClick={() => {
              onClose();
              action.run();
            }}
          >
            <action.icon className="h-3.5 w-3.5" />
            {action.label}
          </button>
        ))}
      </div>
    </>
  );
}

/**
 * TAB «Plantilla»: lista ordenable de campos del formulario con alta y
 * edición en modal, deshabilitados y papelera de campos eliminados.
 * Cada cambio avisa al padre para refrescar los campos de los registros.
 */
export function TemplateTab({ formId, onChanged }: { formId: string; onChanged: () => void }) {
  const { t } = useT();
  const [fields, setFields] = useState<Field[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [menuFieldId, setMenuFieldId] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalState>(null);
  const [showTrash, setShowTrash] = useState(false);

  const refreshFields = useCallback(async () => {
    try {
      const loaded = await fieldsRepository.listByForm(formId, {
        includeDisabled: true,
        includeDeleted: true,
      });
      setFields(loaded);
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : String(loadError));
    }
  }, [formId]);

  // Carga inicial: el componente se monta con key={form.id}, así que el
  // efecto solo corre al montar. El setState ocurre en callbacks asíncronos.
  useEffect(() => {
    let cancelled = false;
    void fieldsRepository
      .listByForm(formId, { includeDisabled: true, includeDeleted: true })
      .then((loaded) => {
        if (!cancelled) {
          setFields(loaded);
          setError(null);
        }
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : String(loadError));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [formId]);

  // Esc cierra el menú contextual del campo (igual que en la tabla de
  // registros y en el árbol del drawer).
  useEffect(() => {
    if (menuFieldId === null) {
      return;
    }
    function onKeyDown(event: KeyboardEvent): void {
      if (event.key === "Escape") {
        setMenuFieldId(null);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [menuFieldId]);

  /** Ejecuta una acción de mantenimiento y sincroniza ambos listados. */
  async function runAction(action: () => Promise<unknown>): Promise<void> {
    try {
      await action();
      await refreshFields();
      onChanged();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : String(actionError));
    }
  }

  const activeFields = fields.filter((field) => field.deletedAt === null);
  const enabledFields = activeFields.filter((field) => field.enabled);
  const disabledFields = activeFields.filter((field) => !field.enabled);
  const deletedFields = fields.filter((field) => field.deletedAt !== null);

  // Reordenación por arrastre (mantener presionado el grip); los botones
  // Subir/Bajar del menú siguen siendo la alternativa accesible.
  const enabledIds = enabledFields.map((field) => field.id);
  const reorder = useLongPressReorder({
    orderedIds: enabledIds,
    onReorder: (orderedFieldIds) => {
      void runAction(() => fieldsRepository.reorder([...orderedFieldIds]));
    },
  });
  const enabledById = new Map(enabledFields.map((field) => [field.id, field]));
  const orderedEnabledFields = reorder.order.flatMap((id) => {
    const field = enabledById.get(id);
    return field === undefined ? [] : [field];
  });

  async function moveField(fieldId: string, delta: -1 | 1): Promise<void> {
    const index = enabledFields.findIndex((candidate) => candidate.id === fieldId);
    const target = index + delta;
    if (index === -1 || target < 0 || target >= enabledFields.length) {
      return;
    }
    const orderedIds = enabledFields.map((candidate) => candidate.id);
    const [moved] = orderedIds.splice(index, 1);
    orderedIds.splice(target, 0, moved);
    await runAction(() => fieldsRepository.reorder(orderedIds));
  }

  return (
    <section className="flex min-h-0 flex-1 flex-col gap-3">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-zinc-500">
          {t("plantilla.nota")}
        </p>
        <div className="flex shrink-0 items-center gap-2">
          {deletedFields.length > 0 ? (
            <button
              type="button"
              onClick={() => {
                setShowTrash((previous) => !previous);
                setMenuFieldId(null);
              }}
              title={t("plantilla.papeleraTitle")}
              aria-label={t("plantilla.papeleraTitle")}
              className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs transition-colors ${
                showTrash
                  ? "border-sky-500/50 bg-sky-500/15 text-sky-300"
                  : "border-zinc-700 bg-zinc-900 text-zinc-300 hover:border-sky-400 hover:text-zinc-100"
              }`}
            >
              <Trash2 className="h-3.5 w-3.5" />
              {t("plantilla.papeleraBoton", { n: deletedFields.length })}
            </button>
          ) : null}
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-md bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-sky-500"
            onClick={() => {
              setModal({ kind: "create" });
            }}
          >
            <Plus className="h-4 w-4" />
            {t("plantilla.anadirCampo")}
          </button>
        </div>
      </header>

      {error !== null ? (
        <p className="rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
          {error}
        </p>
      ) : null}

      {/* Papelera de campos eliminados */}
      {showTrash ? (
        <section className="flex flex-col gap-2 rounded-lg border border-dashed border-zinc-800 p-3">
          <h3 className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
            {t("plantilla.camposEliminados")}
          </h3>
          {deletedFields.length === 0 ? (
            <p className="py-2 text-center text-xs text-zinc-600">
              {t("plantilla.papeleraVacia")}
            </p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {deletedFields.map((field) => (
                <li
                  key={field.id}
                  className="flex flex-wrap items-center gap-2 rounded-md border border-zinc-800 bg-zinc-900/60 px-3 py-1.5 opacity-80"
                >
                  <span className="min-w-0 flex-1 truncate text-xs text-zinc-500 line-through">
                    {field.name} · {typeLabel(field.type)}
                  </span>
                  <button
                    type="button"
                    className="shrink-0 rounded-md border border-zinc-700 px-2 py-0.5 text-[11px] text-zinc-300 transition-colors hover:border-sky-400 hover:text-sky-300"
                    onClick={() => {
                      void runAction(() => fieldsRepository.restore(field.id));
                    }}
                  >
                    {t("comun.restaurar")}
                  </button>
                  <button
                    type="button"
                    className="shrink-0 rounded-md border border-rose-500/40 px-2 py-0.5 text-[11px] text-rose-300 transition-colors hover:bg-rose-500/10"
                    onClick={() => {
                      setModal({ kind: "hardDelete", field });
                    }}
                  >
                    {t("comun.borrar")}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}

      {/* Listado de campos */}
      {loading && activeFields.length === 0 ? (
        <p className="py-8 text-center text-sm text-zinc-500">{t("plantilla.cargando")}</p>
      ) : activeFields.length === 0 ? (
        <div className="flex min-h-48 flex-1 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-zinc-800 px-6 py-12 text-center">
          <Plus className="h-8 w-8 text-zinc-700" />
          <p className="max-w-sm text-sm leading-relaxed text-zinc-500">
            {t("plantilla.anadirCamposNota")}
          </p>
        </div>
      ) : (
        <ReorderContainer
          controller={reorder}
          className="min-h-0 flex-1 space-y-1.5 overflow-y-auto pr-1"
        >
          {orderedEnabledFields.map((field) => {
            const isDragging = reorder.draggingId === field.id;
            return (
              <ReorderItem
                key={field.id}
                controller={reorder}
                id={field.id}
                className={`relative ${
                  isDragging ? "z-10 scale-[1.02]" : reorder.draggingId !== null ? "opacity-60" : ""
                }`}
              >
                <div
                  className={`flex items-center gap-2 rounded-lg border px-3 py-2 transition-colors ${
                    isDragging
                      ? "border-sky-400/70 bg-zinc-900 shadow-xl shadow-sky-500/10 ring-2 ring-sky-400/40"
                      : "border-zinc-800 bg-zinc-900/60 hover:border-zinc-700"
                  }`}
                >
                  <button
                    type="button"
                    {...reorder.getGripProps(field.id)}
                    aria-label={t("plantilla.reordenarAria", { n: field.name })}
                    className={`shrink-0 cursor-grab rounded-md p-1 text-zinc-600 transition-colors hover:bg-zinc-800 hover:text-sky-300 ${
                      isDragging ? "cursor-grabbing text-sky-300" : ""
                    }`}
                  >
                    <GripVertical className="h-4 w-4" />
                  </button>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-zinc-100">
                      {field.name}
                    </span>
                    <FieldBadges field={field} />
                  </span>
                  <button
                    type="button"
                    aria-label={t("comun.menuDe", { n: field.name })}
                    className="shrink-0 rounded-md p-1 text-zinc-500 transition-colors hover:bg-zinc-700 hover:text-zinc-100"
                    onClick={() => {
                      setMenuFieldId(menuFieldId === field.id ? null : field.id);
                    }}
                  >
                    <MoreVertical className="h-4 w-4" />
                  </button>
                </div>
                {menuFieldId === field.id ? (
                  <FieldRowMenu
                    field={field}
                    isFirst={enabledFields[0]?.id === field.id}
                    isLast={enabledFields[enabledFields.length - 1]?.id === field.id}
                    onEdit={() => {
                      setModal({ kind: "edit", field });
                    }}
                    onMove={(delta) => {
                      void moveField(field.id, delta);
                    }}
                    onToggleEnabled={() => {
                      void runAction(() =>
                        field.enabled
                          ? fieldsRepository.disable(field.id)
                          : fieldsRepository.enable(field.id),
                      );
                    }}
                    onDelete={() => {
                      void runAction(() => fieldsRepository.softDelete(field.id));
                    }}
                    onClose={() => {
                      setMenuFieldId(null);
                    }}
                  />
                ) : null}
              </ReorderItem>
            );
          })}

          {disabledFields.length > 0 ? (
            <>
              <li className="pt-3 text-[11px] font-semibold uppercase tracking-wide text-zinc-600">
                {t("plantilla.deshabilitados")}
              </li>
              {disabledFields.map((field) => (
                <li key={field.id}>
                  <div className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/40 px-3 py-1.5 opacity-60">
                    <span className="min-w-0 flex-1 truncate text-xs text-zinc-400">
                      {field.name} · {typeLabel(field.type)}
                    </span>
                    <button
                      type="button"
                      title={t("comun.habilitar")}
                      aria-label={t("plantilla.habilitarDe", { n: field.name })}
                      className="shrink-0 rounded-md p-1 text-zinc-500 transition-colors hover:text-sky-300"
                      onClick={() => {
                        void runAction(() => fieldsRepository.enable(field.id));
                      }}
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      title={t("comun.quitar")}
                      aria-label={t("plantilla.quitarDe", { n: field.name })}
                      className="shrink-0 rounded-md p-1 text-zinc-500 transition-colors hover:text-rose-300"
                      onClick={() => {
                        void runAction(() => fieldsRepository.softDelete(field.id));
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </li>
              ))}
            </>
          ) : null}
        </ReorderContainer>
      )}

      {modal !== null && modal.kind !== "hardDelete" ? (
        <FieldModal
          formId={formId}
          field={modal.kind === "edit" ? modal.field : null}
          onSaved={() => {
            void refreshFields().then(onChanged);
          }}
          onClose={() => {
            setModal(null);
          }}
        />
      ) : null}

      {modal !== null && modal.kind === "hardDelete" ? (
        <ConfirmModal
          title={t("plantilla.eliminarCampoTitulo")}
          message={t("plantilla.eliminarCampoMensaje", { n: modal.field.name })}
          confirmLabel={t("comun.borrar")}
          onConfirm={() => runAction(() => fieldsRepository.hardDelete(modal.field.id))}
          onClose={() => {
            setModal(null);
          }}
        />
      ) : null}
    </section>
  );
}
