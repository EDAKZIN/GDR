import { useEffect, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  MoreVertical,
  Pencil,
  Plus,
  RotateCcw,
  Trash2,
  X,
} from "lucide-react";
import type { Section } from "../../core/sections";
import { useSectionStore } from "../../stores";
import { IconRenderer } from "../components/IconRenderer";
import { SUGGESTED_ICON_NAMES } from "../components/iconNames";

interface MenuState {
  sectionId: string;
  x: number;
  y: number;
}

type ModalState =
  | { mode: "create" }
  | { mode: "edit"; section: Section }
  | null;

const inputClass =
  "w-full rounded-md border border-zinc-700 bg-zinc-900 px-2.5 py-1.5 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-teal-400";

function clampMenu(x: number, y: number): { left: number; top: number } {
  return {
    left: Math.min(x, window.innerWidth - 200),
    top: Math.min(y, window.innerHeight - 260),
  };
}

function SectionFormModal({
  state,
  onClose,
}: {
  state: NonNullable<ModalState>;
  onClose: () => void;
}) {
  const createSection = useSectionStore((store) => store.createSection);
  const updateSection = useSectionStore((store) => store.updateSection);
  const [name, setName] = useState(state.mode === "edit" ? state.section.name : "");
  const [description, setDescription] = useState(
    state.mode === "edit" ? (state.section.description ?? "") : "",
  );
  const [icon, setIcon] = useState(
    state.mode === "edit" ? (state.section.icon ?? "") : "",
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(): Promise<void> {
    setSaving(true);
    setError(null);
    try {
      const payload = {
        name,
        description: description.trim() === "" ? null : description.trim(),
        icon: icon.trim() === "" ? null : icon.trim(),
      };
      if (state.mode === "create") {
        await createSection(payload);
      } else {
        await updateSection(state.section.id, payload);
      }
      onClose();
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : String(submitError),
      );
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <form
        className="flex w-full max-w-md flex-col gap-3 rounded-xl border border-zinc-700 bg-zinc-900 p-5 shadow-2xl"
        onSubmit={(event) => {
          event.preventDefault();
          if (!saving && name.trim() !== "") {
            void submit();
          }
        }}
      >
        <header className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-zinc-100">
            {state.mode === "create" ? "Nueva sección" : "Editar sección"}
          </h2>
          <button
            type="button"
            className="rounded-md border border-zinc-700 p-1 text-zinc-400 transition-colors hover:text-zinc-100"
            onClick={onClose}
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <label className="flex flex-col gap-1 text-xs font-medium text-zinc-400">
          Nombre
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
          Descripción
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
          Icono (nombre de Lucide o URL de imagen)
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-zinc-700 bg-zinc-800 text-teal-300">
              <IconRenderer icon={icon} />
            </span>
            <input
              className={inputClass}
              value={icon}
              onChange={(event) => {
                setIcon(event.target.value);
              }}
              list="suggested-icons"
              placeholder="Folder o https://…"
              maxLength={100}
            />
            <datalist id="suggested-icons">
              {SUGGESTED_ICON_NAMES.map((suggested) => (
                <option key={suggested} value={suggested} />
              ))}
            </datalist>
          </div>
        </div>

        {error !== null ? (
          <p className="rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
            {error}
          </p>
        ) : null}

        <footer className="mt-1 flex items-center justify-end gap-2">
          <button
            type="button"
            className="rounded-md border border-zinc-700 px-3 py-1.5 text-xs font-semibold text-zinc-300 transition-colors hover:text-zinc-100 disabled:opacity-50"
            onClick={onClose}
            disabled={saving}
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="rounded-md bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-teal-500 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={saving || name.trim() === ""}
          >
            {saving ? "Guardando…" : "Guardar"}
          </button>
        </footer>
      </form>
    </div>
  );
}

interface MenuAction {
  label: string;
  icon: typeof Pencil;
  run: () => void;
  danger?: boolean;
  disabled?: boolean;
}

function buildMenuActions(
  section: Section,
  isFirst: boolean,
  isLast: boolean,
  store: {
    enableSection: (id: string) => Promise<void>;
    disableSection: (id: string) => Promise<void>;
    moveSection: (id: string, delta: -1 | 1) => Promise<void>;
    softDeleteSection: (id: string) => Promise<void>;
  },
  onEdit: (section: Section) => void,
): MenuAction[] {
  return [
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
        void store.moveSection(section.id, -1);
      },
      disabled: !section.enabled || isFirst,
    },
    {
      label: "Bajar",
      icon: ArrowDown,
      run: () => {
        void store.moveSection(section.id, 1);
      },
      disabled: !section.enabled || isLast,
    },
    section.enabled
      ? {
          label: "Deshabilitar",
          icon: X,
          run: () => {
            void store.disableSection(section.id);
          },
        }
      : {
          label: "Habilitar",
          icon: RotateCcw,
          run: () => {
            void store.enableSection(section.id);
          },
        },
    {
      label: "Eliminar",
      icon: Trash2,
      danger: true,
      run: () => {
        void store.softDeleteSection(section.id);
      },
    },
  ];
}

function SectionContextMenu({
  section,
  position,
  isFirst,
  isLast,
  onEdit,
  onClose,
}: {
  section: Section;
  position: { x: number; y: number };
  isFirst: boolean;
  isLast: boolean;
  onEdit: (section: Section) => void;
  onClose: () => void;
}) {
  const enableSection = useSectionStore((store) => store.enableSection);
  const disableSection = useSectionStore((store) => store.disableSection);
  const moveSection = useSectionStore((store) => store.moveSection);
  const softDeleteSection = useSectionStore((store) => store.softDeleteSection);

  const actions = buildMenuActions(
    section,
    isFirst,
    isLast,
    { enableSection, disableSection, moveSection, softDeleteSection },
    onEdit,
  );

  return (
    <>
      <div
        className="fixed inset-0 z-40"
        onClick={onClose}
        onContextMenu={(event) => {
          event.preventDefault();
          onClose();
        }}
      />
      <div
        className="fixed z-50 flex min-w-44 flex-col overflow-hidden rounded-lg border border-zinc-700 bg-zinc-900 py-1 shadow-2xl"
        style={clampMenu(position.x, position.y)}
      >
        <p className="truncate px-3 pb-1 pt-0.5 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
          {section.name}
        </p>
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
        {section.description !== null ? (
          <p className="border-t border-zinc-800 px-3 pt-1.5 text-[11px] leading-snug text-zinc-500">
            {section.description}
          </p>
        ) : null}
      </div>
    </>
  );
}

function SectionRow({
  section,
  onOpenMenu,
}: {
  section: Section;
  onOpenMenu: (section: Section, x: number, y: number) => void;
}) {
  const activeSectionId = useSectionStore((store) => store.activeSectionId);
  const selectSection = useSectionStore((store) => store.selectSection);
  const active = activeSectionId === section.id;
  const dimmed = !section.enabled;

  return (
    <li>
      <div
        role="button"
        tabIndex={0}
        className={`group flex cursor-pointer items-center gap-2 rounded-lg border px-2.5 py-2 transition-colors ${
          active
            ? "border-teal-500/50 bg-teal-500/10"
            : "border-transparent hover:border-zinc-700 hover:bg-zinc-900"
        } ${dimmed ? "opacity-50" : ""}`}
        onClick={() => {
          void selectSection(section.id);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            void selectSection(section.id);
          }
        }}
        onContextMenu={(event) => {
          event.preventDefault();
          onOpenMenu(section, event.clientX, event.clientY);
        }}
      >
        <span
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${
            active ? "bg-teal-500/20 text-teal-300" : "bg-zinc-800 text-zinc-400"
          }`}
        >
          <IconRenderer icon={section.icon} />
        </span>
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-zinc-100">
          {section.name}
        </span>
        <button
          type="button"
          aria-label={`Menú de ${section.name}`}
          className={`shrink-0 rounded-md p-1 text-zinc-500 transition-colors hover:bg-zinc-700 hover:text-zinc-100 ${
            active ? "opacity-100" : "opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
          }`}
          onClick={(event) => {
            event.stopPropagation();
            const rect = event.currentTarget.getBoundingClientRect();
            onOpenMenu(section, rect.left, rect.bottom + 4);
          }}
        >
          <MoreVertical className="h-4 w-4" />
        </button>
      </div>
    </li>
  );
}

export function SectionSidebar() {
  const sections = useSectionStore((store) => store.sections);
  const trashedSections = useSectionStore((store) => store.trashedSections);
  const loading = useSectionStore((store) => store.loadingSections);
  const error = useSectionStore((store) => store.error);
  const loadSections = useSectionStore((store) => store.loadSections);
  const restoreSection = useSectionStore((store) => store.restoreSection);
  const hardDeleteSection = useSectionStore((store) => store.hardDeleteSection);

  const [menu, setMenu] = useState<MenuState | null>(null);
  const [modal, setModal] = useState<ModalState>(null);
  const [showTrash, setShowTrash] = useState(false);

  useEffect(() => {
    void loadSections();
  }, [loadSections]);

  // Esc cierra el menú contextual o el modal de sección.
  useEffect(() => {
    if (menu === null && modal === null) {
      return;
    }
    function onKeyDown(event: KeyboardEvent): void {
      if (event.key === "Escape") {
        setMenu(null);
        setModal(null);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [menu, modal]);

  const enabledSections = sections.filter((section) => section.enabled);
  const disabledSections = sections.filter((section) => !section.enabled);
  const menuSection =
    menu !== null
      ? sections.find((section) => section.id === menu.sectionId)
      : undefined;

  function openMenu(section: Section, x: number, y: number): void {
    setMenu({ sectionId: section.id, x, y });
  }

  function openEdit(section: Section): void {
    setModal({ mode: "edit", section });
  }

  return (
    <aside className="flex min-h-0 w-64 shrink-0 flex-col border-r border-zinc-800 bg-zinc-950">
      <header className="flex items-center justify-between gap-2 px-3 py-3">
        <h1 className="text-sm font-bold tracking-tight text-zinc-100">Secciones</h1>
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Papelera de secciones"
            title="Papelera"
            className={`rounded-md p-1.5 transition-colors ${
              showTrash
                ? "bg-amber-500/15 text-amber-300"
                : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
            }`}
            onClick={() => {
              setShowTrash((previous) => !previous);
            }}
          >
            <Trash2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label="Nueva sección"
            title="Nueva sección"
            className="rounded-md bg-teal-600 p-1.5 text-white transition-colors hover:bg-teal-500"
            onClick={() => {
              setModal({ mode: "create" });
            }}
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </header>

      {error !== null ? (
        <p className="mx-3 mb-2 rounded-md border border-rose-500/40 bg-rose-500/10 px-2.5 py-2 text-xs text-rose-300">
          {error}
        </p>
      ) : null}

      <nav
        className="min-h-0 flex-1 overflow-y-auto px-2 pb-2"
        aria-label="Lista de secciones"
      >
        {loading && sections.length === 0 ? (
          <p className="px-2 py-6 text-center text-xs text-zinc-500">
            Cargando secciones…
          </p>
        ) : showTrash ? (
          trashedSections.length === 0 ? (
            <p className="px-2 py-6 text-center text-xs text-zinc-500">
              La papelera está vacía.
            </p>
          ) : (
            <ul className="space-y-1">
              {trashedSections.map((section) => (
                <li
                  key={section.id}
                  className="flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900/60 px-2.5 py-2 opacity-75"
                >
                  <span className="min-w-0 flex-1 truncate text-xs text-zinc-400 line-through">
                    {section.name}
                  </span>
                  <button
                    type="button"
                    className="shrink-0 rounded-md border border-zinc-700 px-1.5 py-1 text-[11px] text-zinc-300 transition-colors hover:border-teal-400 hover:text-teal-300"
                    onClick={() => {
                      void restoreSection(section.id);
                    }}
                  >
                    <RotateCcw className="mr-1 inline h-3 w-3" />
                    Restaurar
                  </button>
                  <button
                    type="button"
                    className="shrink-0 rounded-md border border-rose-500/40 px-1.5 py-1 text-[11px] text-rose-300 transition-colors hover:bg-rose-500/10"
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
          )
        ) : (
          <>
            {enabledSections.length === 0 && disabledSections.length === 0 ? (
              <div className="mt-6 flex flex-col items-center gap-2 px-4 text-center">
                <Plus className="h-6 w-6 text-zinc-600" />
                <p className="text-xs leading-relaxed text-zinc-500">
                  Crea tu primera sección con el botón{" "}
                  <span className="font-semibold text-teal-400">+</span> para empezar a
                  organizar tus datos.
                </p>
              </div>
            ) : (
              <ul className="space-y-0.5">
                {enabledSections.map((section) => (
                  <SectionRow
                    key={section.id}
                    section={section}
                    onOpenMenu={openMenu}
                  />
                ))}
              </ul>
            )}

            {disabledSections.length > 0 && enabledSections.length > 0 ? (
              <p className="px-2 pb-1 pt-4 text-[11px] font-semibold uppercase tracking-wide text-zinc-600">
                Deshabilitadas
              </p>
            ) : null}
            {disabledSections.length > 0 ? (
              <ul className="space-y-0.5">
                {disabledSections.map((section) => (
                  <SectionRow
                    key={section.id}
                    section={section}
                    onOpenMenu={openMenu}
                  />
                ))}
              </ul>
            ) : null}
          </>
        )}
      </nav>

      {menu !== null && menuSection !== undefined ? (
        <SectionContextMenu
          section={menuSection}
          position={{ x: menu.x, y: menu.y }}
          isFirst={enabledSections[0]?.id === menuSection.id}
          isLast={
            menuSection.enabled
              ? enabledSections[enabledSections.length - 1]?.id === menuSection.id
              : disabledSections[disabledSections.length - 1]?.id === menuSection.id
          }
          onEdit={openEdit}
          onClose={() => {
            setMenu(null);
          }}
        />
      ) : null}
      {modal !== null ? (
        <SectionFormModal
          state={modal}
          onClose={() => {
            setModal(null);
          }}
        />
      ) : null}
    </aside>
  );
}
