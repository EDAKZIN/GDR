import { useEffect, useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  FolderOpen,
  LayoutGrid,
  MoreVertical,
  Pencil,
  Plus,
  RotateCcw,
  Trash2,
  X,
} from "lucide-react";
import type { Section } from "../../core/sections";
import { useT } from "../../i18n";
import { useSectionStore } from "../../stores";
import { ConfirmModal } from "../components/ConfirmModal";
import { EmptyState } from "../components/EmptyState";
import { FloatingMenu, type FloatingMenuAnchor } from "../components/FloatingMenu";
import { IconRenderer } from "../components/IconRenderer";
import { btnDangerGhost, btnPrimaryLg } from "../components/uiStyles";
import { openSection } from "../navigation/openSection";
import { SectionModal } from "./SectionModal";

type ModalState = { kind: "create" } | { kind: "edit"; section: Section } | null;

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
  onClose,
}: {
  anchor: FloatingMenuAnchor;
  section: Section;
  isFirst: boolean;
  isLast: boolean;
  onEdit: (section: Section) => void;
  onClose: () => void;
}) {
  const enableSection = useSectionStore((store) => store.enableSection);
  const disableSection = useSectionStore((store) => store.disableSection);
  const moveSection = useSectionStore((store) => store.moveSection);
  const softDeleteSection = useSectionStore((store) => store.softDeleteSection);
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
        void softDeleteSection(section.id);
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
  onEdit,
  onOpenMenu,
  menuOpen,
  menuAnchor,
}: {
  section: Section;
  formCount: number;
  isFirst: boolean;
  isLast: boolean;
  onEdit: (section: Section) => void;
  onOpenMenu: (anchor: FloatingMenuAnchor | null) => void;
  menuOpen: boolean;
  menuAnchor: FloatingMenuAnchor | null;
}) {
  const { t } = useT();

  return (
    <div
      role="button"
      tabIndex={0}
      className={`group relative flex cursor-pointer flex-col gap-3 rounded-xl border border-zinc-800 bg-zinc-900/70 p-4 transition-colors hover:border-sky-500/50 hover:bg-zinc-900 ${
        section.enabled ? "" : "opacity-50"
      }`}
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
  const { t } = useT();

  const [menuSectionId, setMenuSectionId] = useState<string | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<FloatingMenuAnchor | null>(null);
  const [modal, setModal] = useState<ModalState>(null);
  const [showTrash, setShowTrash] = useState(false);
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

  function openEdit(section: Section): void {
    setModal({ kind: "edit", section });
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
          /* Grid fluido de tarjetas */
          <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-3">
            {orderedCards.map((section) => (
              <SectionCard
                key={section.id}
                section={section}
                formCount={formCounts[section.id] ?? 0}
                isFirst={enabledSections[0]?.id === section.id}
                isLast={
                  section.enabled
                    ? enabledSections[enabledSections.length - 1]?.id === section.id
                    : disabledSections[disabledSections.length - 1]?.id === section.id
                }
                menuOpen={menuSectionId === section.id}
                menuAnchor={menuAnchor}
                onOpenMenu={(anchor) => {
                  setMenuAnchor(anchor);
                  setMenuSectionId(anchor !== null ? section.id : null);
                }}
                onEdit={openEdit}
              />
            ))}
          </div>
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
