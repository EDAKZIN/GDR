import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  ArrowDown,
  ArrowUp,
  Check,
  ChevronLeft,
  ChevronRight,
  Eye,
  LayoutList,
  ListFilter,
  MoreVertical,
  Pencil,
  Plus,
  RotateCcw,
  Trash2,
  X,
} from "lucide-react";
import type { Field } from "../../core/fields";
import {
  formatLocalizedDateTime,
  formatRelativeTime,
} from "../../core/utils/relativeTime";
import { useT } from "../../i18n";
import { useRecordStore } from "../../stores";
import { ConfirmModal } from "../components/ConfirmModal";
import { EmptyState } from "../components/EmptyState";
import { FloatingMenu, type FloatingMenuAnchor } from "../components/FloatingMenu";
import {
  btnPrimary,
  btnPrimaryLg,
  chipAccent,
} from "../components/uiStyles";
import { formatValue, valueSearchText } from "./recordValues";

const PAGE_SIZE = 20;
const VISIBLE_FIELD_LIMIT = 5;

/** Tipos con comparación natural para ordenar por columna. */
const SORTABLE_TYPES: ReadonlySet<string> = new Set([
  "boolean",
  "date",
  "datetime",
  "email",
  "number",
  "select",
  "text",
  "url",
]);

type SortKey = string;

interface SortState {
  key: SortKey;
  direction: "asc" | "desc";
}

const DEFAULT_SORT: SortState = { key: "created_at", direction: "desc" };

/**
 * Comparador de valores crudos según el tipo del campo. Los valores vacíos
 * quedan al final del orden ascendente.
 */
function compareValues(a: unknown, b: unknown, type: string): number {
  if (type === "number") {
    const left = typeof a === "number" ? a : Number.NaN;
    const right = typeof b === "number" ? b : Number.NaN;
    if (Number.isNaN(left) && Number.isNaN(right)) {
      return 0;
    }
    if (Number.isNaN(left)) {
      return 1;
    }
    if (Number.isNaN(right)) {
      return -1;
    }
    return left - right;
  }
  if (type === "boolean") {
    return (a === true ? 1 : 0) - (b === true ? 1 : 0);
  }
  const left = typeof a === "string" ? a : "";
  const right = typeof b === "string" ? b : "";
  if (left === "" || right === "") {
    if (left === right) {
      return 0;
    }
    return left === "" ? 1 : -1;
  }
  return left.localeCompare(right, undefined, { sensitivity: "base" });
}

/** Celda formateada según el tipo: contraseña oculta, booleano como badge… */
function CellValue({ field, value }: { field: Field; value: unknown }) {
  const { t } = useT();
  if (field.type === "password") {
    const empty = typeof value !== "string" || value === "";
    if (empty) {
      return <span className="text-zinc-600">—</span>;
    }
    return <span className="font-mono text-zinc-500">••••••••</span>;
  }
  if (field.type === "boolean") {
    const on = value === true;
    return (
      <span
        className={`inline-flex items-center rounded px-1 py-0.5 ${
          on ? "bg-sky-500/15 text-sky-300" : "bg-zinc-800 text-zinc-500"
        }`}
        title={on ? t("comun.si") : t("comun.no")}
      >
        {on ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
      </span>
    );
  }
  if (field.type === "image" && typeof value === "string" && value !== "") {
    return (
      <img
        src={value}
        alt={field.name}
        loading="lazy"
        className="h-8 w-8 rounded border border-zinc-700 object-cover"
      />
    );
  }
  const text = formatValue(field, value);
  if (text === "—") {
    return <span className="text-zinc-600">—</span>;
  }
  return <span>{text}</span>;
}

interface RowMenuAction {
  label: string;
  icon: typeof Eye;
  danger?: boolean;
  run: () => void;
}

/** Menú ⋮ de fila: Ver / Editar / Eliminar (o Restaurar en la papelera). */
function RecordRowMenu({
  anchor,
  actions,
  onClose,
}: {
  anchor: FloatingMenuAnchor;
  actions: readonly RowMenuAction[];
  onClose: () => void;
}) {
  return (
    <FloatingMenu anchor={anchor} widthClass="w-32" onClose={onClose}>
      {actions.map((action) => (
        <button
          key={action.label}
          type="button"
          className={`flex items-center gap-2 px-3 py-1.5 text-left text-xs transition-colors ${
            action.danger === true
              ? "text-rose-300 hover:bg-rose-500/10"
              : "text-zinc-200 hover:bg-zinc-800"
          }`}
          onClick={() => {
            onClose();
            action.run();
          }}
        >
          <action.icon className="h-3.5 w-3.5" />
          {action.label}
        </button>
      ))}
    </FloatingMenu>
  );
}

/**
 * TABLA densa de registros (estilo panel administrativo): una fila por
 * registro, columnas según los primeros campos habilitados de la plantilla,
 * menú ⋮ por fila, filtro local pequeño, paginación y orden por columna.
 */
export function RecordsTable({
  formName,
  onGoToTemplate,
  onOpenWorkspace,
  templateCtaLabel,
  createDisabledReason,
}: {
  /** Nombre del formulario (encabezado de la tabla). */
  formName: string;
  /** Abre la pestaña Plantilla cuando el workspace la incluye. */
  onGoToTemplate?: () => void;
  /** Abre el workspace completo del formulario (secciones planas). */
  onOpenWorkspace?: () => void;
  /** Texto del CTA cuando la plantilla no tiene campos. */
  templateCtaLabel?: string;
  /** Si no es null: «Nuevo registro» deshabilitado con este motivo. */
  createDisabledReason?: string | null;
}) {
  const { t } = useT();
  const items = useRecordStore((state) => state.items);
  const trashedItems = useRecordStore((state) => state.trashedItems);
  const fields = useRecordStore((state) => state.fields);
  const showDeleted = useRecordStore((state) => state.showDeleted);
  const loading = useRecordStore((state) => state.loading);
  const error = useRecordStore((state) => state.error);
  const setShowDeleted = useRecordStore((state) => state.setShowDeleted);
  const openCreate = useRecordStore((state) => state.openCreate);
  const openRecord = useRecordStore((state) => state.openRecord);
  const restoreItem = useRecordStore((state) => state.restoreItem);
  const deleteItem = useRecordStore((state) => state.deleteItem);
  const hardDeleteRecord = useRecordStore((state) => state.hardDeleteRecord);

  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortState>(DEFAULT_SORT);
  const [page, setPage] = useState(1);
  const [menu, setMenu] = useState<{ recordId: string; anchor: FloatingMenuAnchor } | null>(
    null,
  );
  const [deleteRecordId, setDeleteRecordId] = useState<string | null>(null);
  const [hardDeleteRecordId, setHardDeleteRecordId] = useState<string | null>(
    null,
  );

  // La papelera muestra SOLO eliminados (trashedItems), nunca mezclados.
  const displayItems = showDeleted ? trashedItems : items;

  // Columnas: los primeros campos habilitados de la plantilla.
  const visibleFields = useMemo(
    () => fields.slice(0, VISIBLE_FIELD_LIMIT),
    [fields],
  );

  const valuesByRecord = useMemo(() => {
    const map = new Map<string, Map<string, unknown>>();
    for (const { record, values } of displayItems) {
      map.set(
        record.id,
        new Map(values.map((entry) => [entry.fieldId, entry.value])),
      );
    }
    return map;
  }, [displayItems]);

  // Filtro local + orden por columna, ambos en cliente (la lista ya está cargada).
  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const matching =
      needle === ""
        ? displayItems
        : displayItems.filter(({ title, values }) => {
            if (title.toLowerCase().includes(needle)) {
              return true;
            }
            return values.some((entry) =>
              valueSearchText(entry.value).toLowerCase().includes(needle),
            );
          });
    const result = [...matching];
    const sortField = visibleFields.find((field) => field.id === sort.key);
    if (sortField !== undefined) {
      result.sort((left, right) => {
        const leftValues = valuesByRecord.get(left.record.id);
        const rightValues = valuesByRecord.get(right.record.id);
        return compareValues(
          leftValues?.get(sortField.id),
          rightValues?.get(sortField.id),
          sortField.type,
        );
      });
    } else if (sort.key === "created_at" || sort.key === "updated_at") {
      const timestampKey = sort.key;
      result.sort((left, right) => {
        const leftValue =
          timestampKey === "created_at"
            ? left.record.createdAt
            : left.record.updatedAt;
        const rightValue =
          timestampKey === "created_at"
            ? right.record.createdAt
            : right.record.updatedAt;
        return leftValue.localeCompare(rightValue);
      });
    }
    return sort.direction === "desc" ? result.reverse() : result;
  }, [displayItems, query, sort, visibleFields, valuesByRecord]);

  const totalCount = rows.length;
  const pageCount = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pageRows = useMemo(
    () => rows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [rows, currentPage],
  );
  const from = totalCount === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const to = Math.min(currentPage * PAGE_SIZE, totalCount);

  // Cambiar filtro u orden vuelve a la primera página. Ajuste de estado
  // durante el render (patrón oficial de React), sin efectos.
  const [resetKey, setResetKey] = useState("");
  const pageResetKey = `${query}\u0000${sort.key}\u0000${sort.direction}`;
  if (pageResetKey !== resetKey) {
    setResetKey(pageResetKey);
    setPage(1);
  }

  // Esc cierra el menú ⋮ de fila.
  useEffect(() => {
    if (menu === null) {
      return;
    }
    function onKeyDown(event: KeyboardEvent): void {
      if (event.key === "Escape") {
        setMenu(null);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [menu]);

  function toggleSort(key: SortKey): void {
    setSort((previous) =>
      previous.key === key
        ? { key, direction: previous.direction === "asc" ? "desc" : "asc" }
        : { key, direction: "asc" },
    );
  }

  /** Ver y editar de un paso: abre el detalle y entra en modo edición. */
  function editRecord(recordId: string): void {
    void openRecord(recordId).then(() => {
      useRecordStore.getState().startEditing();
    });
  }

  const hasFields = fields.length > 0;
  const isEmpty = !loading && displayItems.length === 0;

  function sortableHeader(label: string, key: SortKey): ReactNode {
    const active = sort.key === key;
    return (
      <button
        type="button"
        className={`inline-flex items-center gap-1 transition-colors hover:text-sky-300 ${
          active ? "text-sky-300" : ""
        }`}
        onClick={() => {
          toggleSort(key);
        }}
        title={active ? t("comun.cambiarOrden") : t("comun.ordenar")}
      >
        {label}
        {active ? (
          sort.direction === "asc" ? (
            <ArrowUp className="h-3 w-3" />
          ) : (
            <ArrowDown className="h-3 w-3" />
          )
        ) : null}
      </button>
    );
  }

  return (
    <section className="flex min-h-0 flex-1 flex-col gap-2">
      {/* Encabezado: nombre + contador, filtro local y acciones */}
      <header className="flex shrink-0 flex-wrap items-center gap-2">
        <h2 className="shrink-0 text-sm font-semibold text-zinc-100">
          {formName}
        </h2>
        <span
          className={chipAccent}
          title={t("registros.registrosCargados")}
        >
          {String(displayItems.length)}
        </span>

        {/* Filtro pequeño integrado a la tabla (no sustituye a Ctrl+F) */}
        <label
          className="relative ml-1 flex w-44 min-w-0 items-center rounded-md border border-zinc-800 bg-zinc-900 px-2 py-1 transition-colors focus-within:border-sky-400"
          title={t("registros.filtroTitle")}
        >
          <ListFilter className="mr-1.5 h-3 w-3 shrink-0 text-zinc-600" />
          <input
            type="text"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
            }}
            placeholder={t("registros.filtroPlaceholder")}
            aria-label={t("registros.filtroAria")}
            maxLength={120}
            className="w-full min-w-0 bg-transparent text-xs text-zinc-100 outline-none placeholder:text-zinc-600"
          />
          {query !== "" ? (
            <button
              type="button"
              aria-label={t("registros.quitarFiltro")}
              className="ml-1 shrink-0 rounded p-0.5 text-zinc-600 transition-colors hover:text-zinc-200"
              onClick={() => {
                setQuery("");
              }}
            >
              <X className="h-3 w-3" />
            </button>
          ) : null}
        </label>

        <div className="ml-auto flex shrink-0 items-center gap-2">
          <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs text-zinc-400">
            <input
              type="checkbox"
              className="h-3.5 w-3.5 accent-sky-500"
              checked={showDeleted}
              onChange={(event) => {
                setShowDeleted(event.target.checked);
              }}
            />
            {t("papelera.boton")}
          </label>
          {!showDeleted && hasFields ? (
            <button
              type="button"
              className={btnPrimary}
              onClick={openCreate}
              disabled={createDisabledReason != null}
              title={createDisabledReason ?? t("registros.nuevo")}
            >
              <Plus className="h-4 w-4" />
              {t("registros.nuevo")}
            </button>
          ) : null}
        </div>
      </header>

      {error !== null ? (
        <p className="shrink-0 rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
          {error}
        </p>
      ) : null}

      {!hasFields && !showDeleted ? (
        /* Sin campos en la plantilla todavía. */
        <EmptyState
          icon={LayoutList}
          title={t("plantilla.sinCampos")}
          description={t("plantilla.anadirCamposNota")}
        >
          {onGoToTemplate !== undefined ? (
            <button type="button" className={`mt-1 ${btnPrimaryLg}`} onClick={onGoToTemplate}>
              <Plus className="h-4 w-4" />
              {templateCtaLabel ?? t("plantilla.irAPestana")}
            </button>
          ) : onOpenWorkspace !== undefined ? (
            <button type="button" className={`mt-1 ${btnPrimaryLg}`} onClick={onOpenWorkspace}>
              <Plus className="h-4 w-4" />
              {t("plantilla.editarPlantillaFormulario")}
            </button>
          ) : null}
        </EmptyState>
      ) : loading && displayItems.length === 0 ? (
        <p className="py-8 text-center text-sm text-zinc-500">
          {t("registros.cargando")}
        </p>
      ) : isEmpty ? (
        <EmptyState
          icon={LayoutList}
          title={showDeleted ? t("registros.papeleraVacia") : t("registros.sinRegistros")}
          description={
            showDeleted
              ? t("registros.papeleraVaciaDesc")
              : t("registros.sinRegistrosDesc")
          }
        >
          {!showDeleted && hasFields ? (
            <button
              type="button"
              className={`mt-1 ${btnPrimaryLg}`}
              onClick={openCreate}
              disabled={createDisabledReason != null}
              title={createDisabledReason ?? undefined}
            >
              <Plus className="h-4 w-4" />
              {t("registros.nuevo")}
            </button>
          ) : null}
        </EmptyState>
      ) : (
        <>
          <div className="min-h-0 flex-1 overflow-auto rounded-lg border border-zinc-800">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="sticky top-0 z-10 border-b border-zinc-800 bg-zinc-950">
                  {visibleFields.map((field) => (
                    <th
                      key={field.id}
                      scope="col"
                      className="whitespace-nowrap px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-500"
                    >
                      {SORTABLE_TYPES.has(field.type)
                        ? sortableHeader(field.name, field.id)
                        : field.name}
                    </th>
                  ))}
                  <th
                    scope="col"
                    className="whitespace-nowrap px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-500"
                  >
                    {sortableHeader(t("registros.creado"), "created_at")}
                  </th>
                  <th
                    scope="col"
                    className="whitespace-nowrap px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-500"
                  >
                    {sortableHeader(t("registros.modificado"), "updated_at")}
                  </th>
                  <th scope="col" className="w-10 px-2 py-2">
                    <span className="sr-only">{t("comun.acciones")}</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/70">
                {pageRows.map(({ record, title }) => {
                  const deleted = record.deletedAt !== null;
                  const values = valuesByRecord.get(record.id);
                  return (
                    <tr
                      key={record.id}
                      role={deleted ? undefined : "button"}
                      tabIndex={deleted ? undefined : 0}
                      className={`transition-colors odd:bg-zinc-950/40 ${
                        deleted
                          ? "opacity-60"
                          : "cursor-pointer hover:bg-zinc-900"
                      }`}
                      onClick={() => {
                        if (!deleted) {
                          void openRecord(record.id);
                        }
                      }}
                      onKeyDown={(event) => {
                        if (!deleted && (event.key === "Enter" || event.key === " ")) {
                          event.preventDefault();
                          void openRecord(record.id);
                        }
                      }}
                    >
                      {visibleFields.map((field) => (
                        <td
                          key={field.id}
                          className="max-w-56 truncate px-3 py-2 text-zinc-200"
                        >
                          <CellValue field={field} value={values?.get(field.id)} />
                        </td>
                      ))}
                      <td
                        className="whitespace-nowrap px-3 py-2 text-zinc-500"
                        title={formatLocalizedDateTime(record.createdAt)}
                      >
                        {formatRelativeTime(record.createdAt)}
                      </td>
                      <td
                        className="whitespace-nowrap px-3 py-2 text-zinc-500"
                        title={formatLocalizedDateTime(record.updatedAt)}
                      >
                        {formatRelativeTime(record.updatedAt)}
                      </td>
                      <td className="relative px-2 py-2 text-right">
                        <button
                          type="button"
                          aria-label={t("comun.accionesDe", { n: title })}
                          title={t("comun.acciones")}
                          className={`rounded-md p-1 text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-100 ${
                            menu?.recordId === record.id ? "" : "opacity-60"
                          }`}
                          onClick={(event) => {
                            event.stopPropagation();
                            // Capturar el rect ANTES del updater: React pone
                            // currentTarget en null al salir del handler.
                            const rect = event.currentTarget.getBoundingClientRect();
                            setMenu((previous) =>
                              previous !== null && previous.recordId === record.id
                                ? null
                                : {
                                    recordId: record.id,
                                    anchor: rect,
                                  },
                            );
                          }}
                        >
                          <MoreVertical className="h-3.5 w-3.5" />
                        </button>
                        {menu !== null && menu.recordId === record.id ? (
                          <RecordRowMenu
                            anchor={menu.anchor}
                            actions={
                              deleted
                                ? [
                                    {
                                      label: t("comun.restaurar"),
                                      icon: RotateCcw,
                                      run: () => {
                                        void restoreItem(record.id);
                                      },
                                    },
                                    {
                                      label: t("papelera.eliminarDefinitivo"),
                                      icon: Trash2,
                                      danger: true,
                                      run: () => {
                                        setHardDeleteRecordId(record.id);
                                      },
                                    },
                                  ]
                                : [
                                    {
                                      label: t("comun.ver"),
                                      icon: Eye,
                                      run: () => {
                                        void openRecord(record.id);
                                      },
                                    },
                                    {
                                      label: t("comun.editar"),
                                      icon: Pencil,
                                      run: () => {
                                        editRecord(record.id);
                                      },
                                    },
                                    {
                                      label: t("comun.eliminar"),
                                      icon: Trash2,
                                      danger: true,
                                      run: () => {
                                        setDeleteRecordId(record.id);
                                      },
                                    },
                                  ]
                            }
                            onClose={() => {
                              setMenu(null);
                            }}
                          />
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
                {pageRows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={visibleFields.length + 3}
                      className="px-3 py-6 text-center text-sm text-zinc-500"
                    >
                      {t("registros.ningunoCoincide", { n: query.trim() })}
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          {/* Paginación */}
          <footer className="flex shrink-0 flex-wrap items-center justify-between gap-2 pt-0.5">
            <p className="text-[11px] tabular-nums text-zinc-500">
              {t("registros.mostrando", { a: from, b: to, c: totalCount })}
            </p>
            <div className="flex items-center gap-1">
              <button
                type="button"
                aria-label={t("registros.paginaAnterior")}
                title={t("registros.anterior")}
                className="rounded-md border border-zinc-800 p-1 text-zinc-400 transition-colors hover:border-sky-400 hover:text-sky-300 disabled:pointer-events-none disabled:opacity-40"
                disabled={currentPage <= 1}
                onClick={() => {
                  setPage(Math.max(1, currentPage - 1));
                }}
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <span className="min-w-14 text-center text-[11px] tabular-nums text-zinc-400">
                {String(currentPage)} / {String(pageCount)}
              </span>
              <button
                type="button"
                aria-label={t("registros.paginaSiguiente")}
                title={t("registros.siguiente")}
                className="rounded-md border border-zinc-800 p-1 text-zinc-400 transition-colors hover:border-sky-400 hover:text-sky-300 disabled:pointer-events-none disabled:opacity-40"
                disabled={currentPage >= pageCount}
                onClick={() => {
                  setPage(Math.min(pageCount, currentPage + 1));
                }}
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </footer>
        </>
      )}

      {deleteRecordId !== null ? (
        <ConfirmModal
          title={t("registros.eliminarTitulo")}
          message={t("registros.eliminarMensaje")}
          confirmLabel={t("comun.eliminar")}
          onConfirm={() => deleteItem(deleteRecordId)}
          onClose={() => {
            setDeleteRecordId(null);
          }}
        />
      ) : null}

      {hardDeleteRecordId !== null ? (
        <ConfirmModal
          title={t("papelera.eliminarDefinitivoTitulo")}
          message={t("papelera.eliminarDefinitivoMensaje")}
          confirmLabel={t("papelera.eliminarDefinitivo")}
          onConfirm={() => hardDeleteRecord(hardDeleteRecordId)}
          onClose={() => {
            setHardDeleteRecordId(null);
          }}
        />
      ) : null}
    </section>
  );
}
