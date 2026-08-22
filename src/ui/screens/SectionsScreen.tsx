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
  Search,
  SearchX,
  Trash2,
  X,
} from "lucide-react";
import type { Section } from "../../core/sections";
import { useSectionStore } from "../../stores";
import { useUiStore } from "../../stores/useUiStore";
import { IconRenderer } from "../components/IconRenderer";
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
  section,
  isFirst,
  isLast,
  onEdit,
  onClose,
}: {
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

  const actions: MenuAction[] = [
    {
      label: "Editar",
      icon: Pencil,
      run: () => {
        onEdit(section);
      },
    },
    {
      label: "Subir",
      icon: ArrowUp,
      run: () => {
        void moveSection(section.id, -1);
      },
      disabled: !section.enabled || isFirst,
    },
    {
      label: "Bajar",
      icon: ArrowDown,
      run: () => {
        void moveSection(section.id, 1);
      },
      disabled: !section.enabled || isLast,
    },
    section.enabled
      ? {
          label: "Deshabilitar",
          icon: X,
          run: () => {
            void disableSection(section.id);
          },
        }
      : {
          label: "Habilitar",
          icon: RotateCcw,
          run: () => {
            void enableSection(section.id);
          },
        },
    {
      label: "Eliminar",
      icon: Trash2,
      danger: true,
      run: () => {
        void softDeleteSection(section.id);
      },
    },
  ];

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="absolute right-3 top-12 z-50 flex min-w-40 flex-col overflow-hidden rounded-lg border border-zinc-700 bg-zinc-900 py-1 shadow-2xl">
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

function SectionCard({
  section,
  formCount,
  isFirst,
  isLast,
  onEdit,
  onOpenMenu,
  menuOpen,
}: {
  section: Section;
  formCount: number;
  isFirst: boolean;
  isLast: boolean;
  onEdit: (section: Section) => void;
  onOpenMenu: (sectionId: string | null) => void;
  menuOpen: boolean;
}) {
  const navigate = useUiStore((store) => store.navigate);

  return (
    <div
      role="button"
      tabIndex={0}
      className={`group relative flex cursor-pointer flex-col gap-3 rounded-xl border border-zinc-800 bg-zinc-900/70 p-4 transition-colors hover:border-sky-500/50 hover:bg-zinc-900 ${
        section.enabled ? "" : "opacity-50"
      }`}
      onClick={() => {
        navigate("section", section.id);
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          navigate("section", section.id);
        }
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-sky-500/15 text-sky-300">
          <IconRenderer icon={section.icon} className="h-5 w-5" />
        </span>
        <button
          type="button"
          aria-label={`Menú de ${section.name}`}
          className="shrink-0 rounded-md p-1 text-zinc-500 transition-colors hover:bg-zinc-700 hover:text-zinc-100 focus-visible:opacity-100 group-hover:opacity-100 md:opacity-0"
          onClick={(event) => {
            event.stopPropagation();
            onOpenMenu(menuOpen ? null : section.id);
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
          {section.description ?? "Sin descripción."}
        </p>
      </div>

      <footer className="flex items-center justify-between text-[11px]">
        <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-zinc-400">
          {formCount === 1
            ? "1 formulario"
            : `${String(formCount)} formularios`}
        </span>
        {!section.enabled ? (
          <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-zinc-500">
            Deshabilitada
          </span>
        ) : null}
      </footer>

      {menuOpen ? (
        <SectionCardMenu
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

/** Pantalla HOME: tarjetas de secciones con hero, buscador y papelera. */
export function SectionsScreen() {
  const sections = useSectionStore((store) => store.sections);
  const trashedSections = useSectionStore((store) => store.trashedSections);
  const formCounts = useSectionStore((store) => store.formCounts);
  const loading = useSectionStore((store) => store.loadingSections);
  const error = useSectionStore((store) => store.error);
  const loadSections = useSectionStore((store) => store.loadSections);
  const restoreSection = useSectionStore((store) => store.restoreSection);
  const hardDeleteSection = useSectionStore((store) => store.hardDeleteSection);
  const setSearchOpen = useUiStore((store) => store.setSearchOpen);

  const [query, setQuery] = useState("");
  const [menuSectionId, setMenuSectionId] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalState>(null);
  const [showTrash, setShowTrash] = useState(false);

  useEffect(() => {
    void loadSections();
  }, [loadSections]);

  // Esc cierra el menú contextual, el modal o la papelera.
  useEffect(() => {
    if (menuSectionId === null && modal === null && !showTrash) {
      return;
    }
    function onKeyDown(event: KeyboardEvent): void {
      if (event.key === "Escape") {
        setMenuSectionId(null);
        setModal(null);
        setShowTrash(false);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [menuSectionId, modal, showTrash]);

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

  const trimmedQuery = query.trim().toLowerCase();
  const matches = (section: Section): boolean =>
    trimmedQuery === "" ||
    section.name.toLowerCase().includes(trimmedQuery) ||
    (section.description ?? "").toLowerCase().includes(trimmedQuery);

  const visibleEnabled = enabledSections.filter(matches);
  const visibleDisabled = disabledSections.filter(matches);

  const orderedCards = [...visibleEnabled, ...visibleDisabled];
  const hasAnySection =
    enabledSections.length > 0 || disabledSections.length > 0;

  function openEdit(section: Section): void {
    setModal({ kind: "edit", section });
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
      <div className="flex w-full flex-col gap-6 px-4 py-6 sm:px-6 lg:px-10">
        {/* Barra de acciones (sin hero: la marca vive en el drawer del menú) */}
        <header className="flex flex-wrap items-center gap-2">
            <label className="flex min-w-56 flex-1 items-center gap-2 rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm transition-colors focus-within:border-sky-400">
              <Search className="h-4 w-4 shrink-0 text-zinc-500" />
              <input
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setShowTrash(false);
                }}
                placeholder="Filtrar secciones…"
                maxLength={200}
                className="w-full bg-transparent text-zinc-100 outline-none placeholder:text-zinc-600"
              />
            </label>

            <button
              type="button"
              onClick={() => {
                setSearchOpen(true);
              }}
              title="Buscar en todo (Ctrl+K)"
              aria-label="Buscar en todo"
              className="flex items-center gap-2 rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-300 transition-colors hover:border-sky-400 hover:text-zinc-100"
            >
              <Search className="h-4 w-4" />
              <span className="hidden sm:inline">Buscar en todo</span>
              <kbd className="hidden rounded border border-zinc-700 bg-zinc-950 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-zinc-600 sm:inline">
                Ctrl K
              </kbd>
            </button>

            <button
              type="button"
              onClick={() => {
                setShowTrash((previous) => !previous);
                setMenuSectionId(null);
              }}
              title="Papelera de secciones"
              aria-label="Papelera de secciones"
              className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors ${
                showTrash
                  ? "border-sky-500/50 bg-sky-500/15 text-sky-300"
                  : "border-zinc-700 bg-zinc-900 text-zinc-300 hover:border-sky-400 hover:text-zinc-100"
              }`}
            >
              <Trash2 className="h-4 w-4" />
              <span className="hidden sm:inline">Papelera</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setModal({ kind: "create" });
              }}
              className="flex items-center gap-2 rounded-md bg-sky-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-sky-500"
            >
              <Plus className="h-4 w-4" />
              Nueva sección
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
              Papelera · secciones eliminadas
            </h2>
            {trashedSections.length === 0 ? (
              <p className="rounded-lg border border-dashed border-zinc-800 px-4 py-6 text-center text-sm text-zinc-500">
                La papelera está vacía.
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {trashedSections.map((section) => (
                  <li
                    key={section.id}
                    className="flex flex-wrap items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-2 opacity-80"
                  >
                    <IconRenderer
                      icon={section.icon}
                      className="h-4 w-4 shrink-0 text-zinc-500"
                    />
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
                      Restaurar
                    </button>
                    <button
                      type="button"
                      className="shrink-0 rounded-md border border-rose-500/40 px-2 py-1 text-[11px] text-rose-300 transition-colors hover:bg-rose-500/10"
                      onClick={() => {
                        if (
                          window.confirm(
                            `¿Eliminar «${section.name}» definitivamente? Esta acción no se puede deshacer.`,
                          )
                        ) {
                          void hardDeleteSection(section.id);
                        }
                      }}
                    >
                      Borrar
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ) : loading && sections.length === 0 ? (
          <p className="py-12 text-center text-sm text-zinc-500">
            Cargando secciones…
          </p>
        ) : !hasAnySection ? (
          /* Estado vacío inicial */
          <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-zinc-800 px-6 py-16 text-center">
            <LayoutGrid className="h-10 w-10 text-zinc-700" />
            <div>
              <h2 className="text-base font-semibold text-zinc-200">
                Aún no hay secciones
              </h2>
              <p className="mx-auto mt-1 max-w-sm text-sm leading-relaxed text-zinc-500">
                Las secciones agrupan tus formularios: proyectos, colecciones,
                clientes… lo que necesites organizar.
              </p>
            </div>
            <button
              type="button"
              className="mt-1 inline-flex items-center gap-2 rounded-md bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-sky-500"
              onClick={() => {
                setModal({ kind: "create" });
              }}
            >
              <Plus className="h-4 w-4" />
              Crea tu primera sección
            </button>
          </div>
        ) : orderedCards.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-12 text-center">
            <SearchX className="h-8 w-8 text-zinc-700" />
            <p className="text-sm text-zinc-500">
              Sin secciones que coincidan con «{query.trim()}».
            </p>
          </div>
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
                onOpenMenu={(sectionId) => {
                  setMenuSectionId(sectionId);
                }}
                onEdit={openEdit}
              />
            ))}
          </div>
        )}

        {!showTrash && hasAnySection && orderedCards.length > 0 ? (
          <p className="flex items-center gap-1.5 text-xs text-zinc-600">
            <FolderOpen className="h-3.5 w-3.5" />
            Pulsa una tarjeta para entrar en la sección.
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
    </div>
  );
}
