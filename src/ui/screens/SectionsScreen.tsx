import { useEffect, useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  FolderOpen,
  GripVertical,
  LayoutGrid,
  MoreVertical,
  Pencil,
  Plus,
  RotateCcw,
  Trash2,
  X,
} from "lucide-react";
import type { Section } from "../../core/sections";
import { getDb } from "../../database/client";
import { createSectionsRepository } from "../../database/repositories";
import { useT } from "../../i18n";
import { useSectionStore } from "../../stores";
import { ConfirmModal } from "../components/ConfirmModal";
import { EmptyState } from "../components/EmptyState";
import { FloatingMenu, type FloatingMenuAnchor } from "../components/FloatingMenu";
import { IconRenderer } from "../components/IconRenderer";
import { SectionDeleteConfirmModal } from "../components/SectionDeleteConfirmModal";
import {
  ReorderContainer,
  ReorderItem,
} from "../components/LongPressReorder";
import type { GripProps } from "../components/useLongPressReorder";
import { useLongPressReorder } from "../components/useLongPressReorder";
import { btnDangerGhost, btnPrimaryLg } from "../components/uiStyles";
import { showErrorToast } from "../menu/toastStore";
import { openSection } from "../navigation/openSection";
import { SectionModal } from "./SectionModal";

const sectionsRepository = createSectionsRepository(getDb);

type ModalState = { kind: "create" } | { kind: "edit"; section: Section } | null;

/** ¿Tiene la sección sub-secciones vivas (hijas directas no eliminadas)? */
function hasLiveChildren(sections: readonly Section[], id: string): boolean {
  return sections.some((section) => section.parentId === id);
}

interface MenuAction {
  label: string;
  icon: typeof Pencil;
  run: () => void;
  danger?: boolean;
  disabled?: boolean;
}

function SectionCardMenu({
  anchor,
  section,
  isFirst,
  isLast,
  onEdit,
  onDelete,
  onClose,
}: {
  anchor: FloatingMenuAnchor;
  section: Section;
  isFirst: boolean;
  isLast: boolean;
  onEdit: (section: Section) => void;
  onDelete: (section: Section) => void;
  onClose: () => void;
}) {
  const enableSection = useSectionStore((store) => store.enableSection);
  const disableSection = useSectionStore((store) => store.disableSection);
  const moveSection = useSectionStore((store) => store.moveSection);
  const { t } = useT();

  const actions: MenuAction[] = [
    {
      label: t("comun.editar"),
      icon: Pencil,
      run: () => {
        onEdit(section);
      },
    },
    {
      label: t("comun.subir"),
      icon: ArrowUp,
      run: () => {
        void moveSection(section.id, -1);
      },
      disabled: !section.enabled || isFirst,
    },
    {
      label: t("comun.bajar"),
      icon: ArrowDown,
      run: () => {
        void moveSection(section.id, 1);
      },
      disabled: !section.enabled || isLast,
    },
    section.enabled
      ? {
          label: t("comun.deshabilitar"),
          icon: X,
          run: () => {
            void disableSection(section.id);
          },
        }
      : {
          label: t("comun.habilitar"),
          icon: RotateCcw,
          run: () => {
            void enableSection(section.id);
          },
        },
    {
      label: t("comun.eliminar"),
      icon: Trash2,
      danger: true,
      run: () => {
        onDelete(section);
      },
    },
  ];

  return (
    <FloatingMenu anchor={anchor} widthClass="w-40" onClose={onClose}>
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
    </FloatingMenu>
  );
}

function SectionCard({
  section,
  formCount,
  isFirst,
  isLast,
  dragging,
  gripProps,
  onEdit,
  onDelete,
  onOpenMenu,
  menuOpen,
  menuAnchor,
}: {
  section: Section;
  formCount: number;
  isFirst: boolean;
  isLast: boolean;
  dragging: boolean;
  gripProps: GripProps;
  onEdit: (section: Section) => void;
  onDelete: (section: Section) => void;
  onOpenMenu: (anchor: FloatingMenuAnchor | null) => void;
  menuOpen: boolean;
  menuAnchor: FloatingMenuAnchor | null;
}) {
  const { t } = useT();

  return (
    <div
      role="button"
      tabIndex={0}
      className={`group relative flex cursor-pointer flex-col gap-3 rounded-xl border bg-zinc-900/70 p-4 transition-colors ${
        dragging
          ? "z-10 border-sky-400/70 bg-zinc-900 shadow-xl shadow-sky-500/10 ring-2 ring-sky-400/40"
          : "border-zinc-800 hover:border-sky-500/50 hover:bg-zinc-900"
      } ${section.enabled ? "" : "opacity-50"}`}
      onClick={() => {
        openSection(section.id);
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          openSection(section.id);
        }
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-sky-500/15 text-sky-300">
          <IconRenderer icon={section.icon} className="h-5 w-5" />
        </span>
        <div className="flex shrink-0 items-center gap-0.5">
          <button
            type="button"
            aria-label={t("plantilla.reordenarAria", { n: section.name })}
            {...gripProps}
            onClick={(event) => {
              event.stopPropagation();
            }}
            className={`shrink-0 cursor-grab touch-none rounded-md p-1 text-zinc-600 transition-colors hover:bg-zinc-700 hover:text-sky-300 focus-visible:opacity-100 group-hover:opacity-100 md:opacity-0 ${
              dragging ? "cursor-grabbing text-sky-300 opacity-100" : ""
            }`}
          >
            <GripVertical className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label={t("comun.menuDe", { n: section.name })}
            className="shrink-0 rounded-md p-1 text-zinc-500 transition-colors hover:bg-zinc-700 hover:text-zinc-100 focus-visible:opacity-100 group-hover:opacity-100 md:opacity-0"
            onClick={(event) => {
              event.stopPropagation();
              // Capturar el rect ANTES de usarlo: React pone currentTarget en
              // null al salir del handler.
              const rect = event.currentTarget.getBoundingClientRect();
              onOpenMenu(menuOpen ? null : rect);
            }}
          >
            <MoreVertical className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="min-w-0">
        <h3 className="truncate text-sm font-semibold text-zinc-100">
          {section.name}
        </h3>
        <p className="mt-1 line-clamp-2 min-h-8 text-xs leading-relaxed text-zinc-500">
          {section.description ?? t("comun.sinDescripcion")}
        </p>
      </div>

      <footer className="flex items-center justify-between text-[11px]">
        <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-zinc-400">
          {formCount === 1
            ? t("secciones.contadorUno")
            : t("secciones.contadorVarios", { n: formCount })}
        </span>
        {!section.enabled ? (
          <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-zinc-500">
            {t("secciones.deshabilitada")}
          </span>
        ) : null}
      </footer>

      {menuOpen && menuAnchor !== null ? (
        <SectionCardMenu
          anchor={menuAnchor}
          section={section}
          isFirst={isFirst}
          isLast={isLast}
          onEdit={onEdit}
          onDelete={onDelete}
          onClose={() => {
            onOpenMenu(null);
          }}
        />
      ) : null}
    </div>
  );
}

/**
 * Pantalla HOME: tarjetas de secciones con papelera. La búsqueda global vive
 * exclusivamente en la barra superior (Ctrl+F).
 */
export function SectionsScreen() {
  const sections = useSectionStore((store) => store.sections);
  const trashedSections = useSectionStore((store) => store.trashedSections);
  const formCounts = useSectionStore((store) => store.formCounts);
  const loading = useSectionStore((store) => store.loadingSections);
  const error = useSectionStore((store) => store.error);
  const loadSections = useSectionStore((store) => store.loadSections);
  const restoreSection = useSectionStore((store) => store.restoreSection);
  const hardDeleteSection = useSectionStore((store) => store.hardDeleteSection);
  const softDeleteSection = useSectionStore((store) => store.softDeleteSection);
  const { t } = useT();

  const [menuSectionId, setMenuSectionId] = useState<string | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<FloatingMenuAnchor | null>(null);
  const [modal, setModal] = useState<ModalState>(null);
  const [showTrash, setShowTrash] = useState(false);
  const [confirmSoftDelete, setConfirmSoftDelete] = useState<Section | null>(
    null,
  );
  const [confirmHardDelete, setConfirmHardDelete] = useState<Section | null>(
    null,
  );

  useEffect(() => {
    void loadSections();
  }, [loadSections]);

  // Esc cierra el menú contextual o la papelera: los modales gestionan su
  // propio Esc (y no se desmontan durante un guardado en curso).
  useEffect(() => {
    if (menuSectionId === null && !showTrash) {
      return;
    }
    function onKeyDown(event: KeyboardEvent): void {
      if (event.key === "Escape") {
        setMenuSectionId(null);
        setMenuAnchor(null);
        setShowTrash(false);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [menuSectionId, showTrash]);

  // Con la jerarquía opcional de secciones, el HOME lista solo las raíces.
  const rootSections = useMemo(
    () => sections.filter((section) => section.parentId === null),
    [sections],
  );
  const enabledSections = useMemo(
    () => rootSections.filter((section) => section.enabled),
    [rootSections],
  );
  const disabledSections = useMemo(
    () => rootSections.filter((section) => !section.enabled),
    [rootSections],
  );

  const orderedCards = [...enabledSections, ...disabledSections];
  const hasAnySection =
    enabledSections.length > 0 || disabledSections.length > 0;

  // Reordenación por arrastre (mantener presionado el grip) entre secciones
  // raíz habilitadas; los botones Subir/Bajar del menú siguen disponibles.
  const enabledRootIds = enabledSections.map((section) => section.id);
  const reorder = useLongPressReorder({
    orderedIds: enabledRootIds,
    onReorder: (orderedIds) => {
      void sectionsRepository
        .reorder([...orderedIds])
        .then(() => loadSections())
        .catch((reorderError: unknown) => {
          showErrorToast(
            reorderError instanceof Error
              ? reorderError.message
              : String(reorderError),
          );
        });
    },
  });
  const enabledRootById = new Map(enabledSections.map((section) => [section.id, section]));
  const orderedEnabledRoots = reorder.order.flatMap((id) => {
    const section = enabledRootById.get(id);
    return section === undefined ? [] : [section];
  });
  const draggableCards = [...orderedEnabledRoots, ...disabledSections];

  function openEdit(section: Section): void {
    setModal({ kind: "edit", section });
  }

  function requestDelete(section: Section): void {
    // Con sub-secciones vivas se pregunta: cascada a papelera o conservar
    // hijas (suben al nivel superior). Sin hijas, soft delete directo.
    if (hasLiveChildren(sections, section.id)) {
      setConfirmSoftDelete(section);
      return;
    }
    void softDeleteSection(section.id);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
      <div className="flex w-full flex-col gap-6 px-4 py-6 sm:px-6 lg:px-10">
        {/* Barra de acciones (sin buscador: el global vive en la barra superior) */}
        <header className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setShowTrash((previous) => !previous);
                setMenuSectionId(null);
                setMenuAnchor(null);
              }}
              title={t("secciones.papeleraTitle")}
              aria-label={t("secciones.papeleraTitle")}
              className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors ${
                showTrash
                  ? "border-sky-500/50 bg-sky-500/15 text-sky-300"
                  : "border-zinc-700 bg-zinc-900 text-zinc-300 hover:border-sky-400 hover:text-zinc-100"
              }`}
            >
              <Trash2 className="h-4 w-4" />
              <span className="hidden sm:inline">{t("papelera.boton")}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setModal({ kind: "create" });
              }}
              className={btnPrimaryLg}
            >
              <Plus className="h-4 w-4" />
              {t("secciones.nueva")}
            </button>
        </header>

        {error !== null ? (
          <p className="rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
            {error}
          </p>
        ) : null}

        {/* Papelera */}
        {showTrash ? (
          <section className="flex flex-col gap-2">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              {t("secciones.papeleraLista")}
            </h2>
            {trashedSections.length === 0 ? (
              <p className="rounded-lg border border-dashed border-zinc-800 px-4 py-6 text-center text-sm text-zinc-500">
                {t("papelera.vacia")}
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {trashedSections.map((section) => (
                  <li
                    key={section.id}
                    className="flex flex-wrap items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-2 opacity-80"
                  >
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center overflow-hidden rounded bg-zinc-800 text-zinc-500">
                      <IconRenderer
                        icon={section.icon}
                        className="h-4 w-4 shrink-0 text-zinc-500"
                      />
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm text-zinc-400 line-through">
                      {section.name}
                    </span>
                    <button
                      type="button"
                      className="shrink-0 rounded-md border border-zinc-700 px-2 py-1 text-[11px] text-zinc-300 transition-colors hover:border-sky-400 hover:text-sky-300"
                      onClick={() => {
                        void restoreSection(section.id);
                      }}
                    >
                      <RotateCcw className="mr-1 inline h-3 w-3" />
                      {t("comun.restaurar")}
                    </button>
                    <button
                      type="button"
                      className={`shrink-0 px-2 py-1 text-[11px] ${btnDangerGhost}`}
                      onClick={() => {
                        setConfirmHardDelete(section);
                      }}
                    >
                      {t("comun.borrar")}
                    </button>                  </li>
                ))}
              </ul>
            )}
          </section>
        ) : loading && sections.length === 0 ? (
          <p className="py-12 text-center text-sm text-zinc-500">
            {t("secciones.cargando")}
          </p>
        ) : !hasAnySection ? (
          /* Estado vacío inicial */
          <EmptyState
            icon={LayoutGrid}
            title={t("secciones.aunNoHay")}
            description={t("secciones.aunNoHayDesc")}
            actionLabel={t("secciones.creaPrimera")}
            onAction={() => {
              setModal({ kind: "create" });
            }}
          />
        ) : (
          /* Grid fluido de tarjetas, reordenables manteniendo presionado el grip */
          <ReorderContainer
            controller={reorder}
            className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-3"
          >
            {draggableCards.map((section) => {
              const isDragging = reorder.draggingId === section.id;
              const card = (
                <SectionCard
                  section={section}
                  formCount={formCounts[section.id] ?? 0}
                  isFirst={enabledSections[0]?.id === section.id}
                  isLast={
                    section.enabled
                      ? enabledSections[enabledSections.length - 1]?.id === section.id
                      : disabledSections[disabledSections.length - 1]?.id === section.id
                  }
                  dragging={isDragging}
                  gripProps={reorder.getGripProps(section.id)}
                  menuOpen={menuSectionId === section.id}
                  menuAnchor={menuAnchor}
                  onOpenMenu={(anchor) => {
                    setMenuAnchor(anchor);
                    setMenuSectionId(anchor !== null ? section.id : null);
                  }}
                  onEdit={openEdit}
                  onDelete={requestDelete}
                />
              );
              return section.enabled ? (
                <ReorderItem
                  key={section.id}
                  controller={reorder}
                  id={section.id}
                  className={`relative ${
                    isDragging ? "z-10" : reorder.draggingId !== null ? "opacity-60" : ""
                  }`}
                >
                  {card}
                </ReorderItem>
              ) : (
                <li key={section.id}>{card}</li>
              );
            })}
          </ReorderContainer>
        )}

        {!showTrash && hasAnySection && orderedCards.length > 0 ? (
          <p className="flex items-center gap-1.5 text-xs text-zinc-600">
            <FolderOpen className="h-3.5 w-3.5" />
            {t("secciones.pulsaTarjeta")}
          </p>
        ) : null}
      </div>

      {modal !== null ? (
        <SectionModal
          mode={modal}
          onClose={() => {
            setModal(null);
          }}
        />
      ) : null}

      {confirmSoftDelete !== null ? (
        <SectionDeleteConfirmModal
          section={confirmSoftDelete}
          onClose={() => {
            setConfirmSoftDelete(null);
          }}
        />
      ) : null}

      {confirmHardDelete !== null ? (
        <ConfirmModal
          title={t("secciones.borrarDefTitulo")}
          message={t("secciones.borrarDefMensaje", { n: confirmHardDelete.name })}
          confirmLabel={t("comun.borrarDefinitivo")}
          onConfirm={() => hardDeleteSection(confirmHardDelete.id)}
          onClose={() => {
            setConfirmHardDelete(null);
          }}
        />
      ) : null}
    </div>
  );
}
