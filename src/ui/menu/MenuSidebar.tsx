import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  ArrowDown,
  ArrowUp,
  Ban,
  Check,
  ChevronRight,
  FilePlus2,
  FileText,
  FolderPlus,
  MoreVertical,
  Move,
  PanelLeft,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  X,
} from "lucide-react";
import type { Form } from "../../core/forms";
import type { Section } from "../../core/sections";
import { getDb } from "../../database/client";
import { createFormsRepository } from "../../database/repositories";
import { buildSectionTree, useSectionStore, type SectionNode } from "../../stores/useSectionStore";
import { useBreadcrumb, useUiStore } from "../../stores/useUiStore";
import { ConfirmModal } from "../components/ConfirmModal";
import { FloatingMenu, type FloatingMenuAnchor } from "../components/FloatingMenu";
import { IconRenderer } from "../components/IconRenderer";
import { btnPrimary, btnSecondary } from "../components/uiStyles";
import { FormModal } from "../screens/FormModal";
import { SectionModal } from "../screens/SectionModal";
import { showErrorToast } from "./toastStore";

const formsRepository = createFormsRepository(getDb);

const DRAWER_KEY = "gdr.menuDrawerOpen";

function readInitialDrawerOpen(): boolean {
  try {
    return window.localStorage.getItem(DRAWER_KEY) !== "0";
  } catch {
    return true;
  }
}

/** Ids de la sección y de todo su subárbol (excluidos como destino al mover). */
function collectDescendantIds(sections: readonly Section[], rootId: string): Set<string> {
  const childrenByParent = new Map<string, string[]>();
  for (const section of sections) {
    if (section.parentId === null) continue;
    const bucket = childrenByParent.get(section.parentId);
    if (bucket !== undefined) {
      bucket.push(section.id);
    } else {
      childrenByParent.set(section.parentId, [section.id]);
    }
  }
  const ids = new Set<string>([rootId]);
  const queue = [rootId];
  while (queue.length > 0) {
    const current = queue.pop();
    if (current === undefined) break;
    for (const child of childrenByParent.get(current) ?? []) {
      if (!ids.has(child)) {
        ids.add(child);
        queue.push(child);
      }
    }
  }
  return ids;
}

/** Ruta legible «A / B / C» para listar destinos de movimiento. */
function sectionPathLabel(sections: readonly Section[], id: string): string {
  const byId = new Map(sections.map((section) => [section.id, section]));
  const parts: string[] = [];
  let cursor = byId.get(id);
  while (cursor !== undefined) {
    parts.unshift(cursor.name);
    cursor = cursor.parentId !== null ? byId.get(cursor.parentId) : undefined;
  }
  return parts.join(" / ");
}

interface MenuAction {
  label: string;
  icon: typeof Pencil;
  run: () => void;
  danger?: boolean;
  disabled?: boolean;
}

type SidebarModal =
  | { kind: "sectionCreate"; parentId: string | null }
  | { kind: "sectionEdit"; section: Section }
  | { kind: "formCreate"; sectionId: string }
  | null;

/** Menú contextual flotante reutilizable, anclado al botón ⋮ del nodo. */
function ActionMenu({
  anchor,
  actions,
  onClose,
}: {
  anchor: FloatingMenuAnchor;
  actions: readonly MenuAction[];
  onClose: () => void;
}) {
  return (
    <FloatingMenu anchor={anchor} onClose={onClose}>
      {actions.map((action) => (
        <button
          key={action.label}
          type="button"
          className={`flex items-center gap-2 px-3 py-1.5 text-left text-xs transition-colors duration-150 ${
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

interface TreeHandlers {
  onToggleExpanded(id: string): void;
  onSelectSection(id: string): void;
  onSelectForm(id: string): void;
  onAddSubsection(section: Section): void;
  onAddForm(section: Section): void;
  onEditSection(section: Section): void;
  onMoveTo(section: Section): void;
  onMoveDelta(section: Section, delta: -1 | 1): void;
  onToggleEnabled(section: Section): void;
  /** Alterna «Permitir sub-secciones»; muestra el error si se bloquea. */
  onToggleAllowChildren(section: Section): void;
  onDelete(section: Section): void;
}

const badgeClass = "shrink-0 rounded bg-zinc-800 px-1 py-px text-[9px] tabular-nums text-zinc-500";

/** Nodo del árbol: fila navegable + acciones contextuales + hijos. */
function SectionTreeNode({
  node,
  depth,
  isFirst,
  isLast,
  expandedIds,
  activeSectionId,
  formsBySection,
  handlers,
}: {
  node: SectionNode;
  depth: number;
  isFirst: boolean;
  isLast: boolean;
  expandedIds: ReadonlySet<string>;
  activeSectionId: string | null;
  formsBySection: ReadonlyMap<string, Form[]>;
  handlers: TreeHandlers;
}) {
  const section = node.section;
  const expanded = expandedIds.has(section.id);
  const isActive = activeSectionId === section.id;
  const sectionForms = section.allowChildren
    ? (formsBySection.get(section.id) ?? [])
    : [];

  const [menuAnchor, setMenuAnchor] = useState<FloatingMenuAnchor | null>(null);

  // Esc cierra el menú contextual del nodo.
  useEffect(() => {
    if (menuAnchor === null) {
      return;
    }
    function onKeyDown(event: KeyboardEvent): void {
      if (event.key === "Escape") {
        setMenuAnchor(null);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [menuAnchor]);

  const actions: MenuAction[] = [
    {
      label: "Añadir subsección",
      icon: FolderPlus,
      disabled: !section.allowChildren,
      run: () => {
        handlers.onAddSubsection(section);
      },
    },
    // Solo las secciones jerárquicas admiten formularios adicionales; en las
    // planas el formulario homónimo es automático e invisible.
    ...(section.allowChildren
      ? [
          {
            label: "Añadir formulario",
            icon: FilePlus2,
            run: () => {
              handlers.onAddForm(section);
            },
          },
        ]
      : []),

    {
      label: "Editar",
      icon: Pencil,
      run: () => {
        handlers.onEditSection(section);
      },
    },
    {
      label: "Mover a…",
      icon: Move,
      run: () => {
        handlers.onMoveTo(section);
      },
    },
    {
      label: "Subir",
      icon: ArrowUp,
      disabled: isFirst || !section.enabled,
      run: () => {
        handlers.onMoveDelta(section, -1);
      },
    },
    {
      label: "Bajar",
      icon: ArrowDown,
      disabled: isLast || !section.enabled,
      run: () => {
        handlers.onMoveDelta(section, 1);
      },
    },
    section.enabled
      ? {
          label: "Deshabilitar",
          icon: X,
          run: () => {
            handlers.onToggleEnabled(section);
          },
        }
      : {
          label: "Habilitar",
          icon: RotateCcw,
          run: () => {
            handlers.onToggleEnabled(section);
          },
        },
    section.allowChildren
      ? {
          label: "Impedir sub-secciones",
          icon: Ban,
          run: () => {
            handlers.onToggleAllowChildren(section);
          },
        }
      : {
          label: "Permitir sub-secciones",
          icon: Check,
          run: () => {
            handlers.onToggleAllowChildren(section);
          },
        },
    {
      label: "Eliminar",
      icon: Trash2,
      danger: true,
      run: () => {
        handlers.onDelete(section);
      },
    },
  ];

  return (
    <div>
      <div className="relative">
        <div
          role="button"
          tabIndex={0}
          style={{ paddingLeft: 6 + depth * 12 }}
          className={`group flex items-center gap-1 rounded-md py-1 pr-1 text-xs transition-colors duration-150 ${
            isActive ? "bg-sky-500/15 text-sky-200" : "text-zinc-300 hover:bg-zinc-900"
          } ${section.enabled ? "" : "opacity-50"}`}
          onClick={() => {
            handlers.onSelectSection(section.id);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              handlers.onSelectSection(section.id);
            }
          }}
        >
          {node.children.length > 0 ? (
            <button
              type="button"
              aria-label={expanded ? `Contraer ${section.name}` : `Expandir ${section.name}`}
              aria-expanded={expanded}
              className="shrink-0 rounded p-0.5 text-zinc-500 transition-colors duration-150 hover:text-zinc-100"
              onClick={(event) => {
                event.stopPropagation();
                handlers.onToggleExpanded(section.id);
              }}
            >
              <ChevronRight
                className={`h-3 w-3 transition-transform duration-150 ${
                  expanded ? "rotate-90" : ""
                }`}
              />
            </button>
          ) : (
            <span className="w-4 shrink-0" />
          )}

          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-zinc-800 bg-sky-500/10 text-sky-300">
            <IconRenderer icon={section.icon} className="h-3.5 w-3.5" />
          </span>

          <span className="min-w-0 flex-1 truncate">{section.name}</span>

          {!section.enabled ? (
            <span className="shrink-0 rounded bg-zinc-800 px-1 py-px text-[9px] uppercase tracking-wide text-zinc-500">
              Off
            </span>
          ) : null}
          {!section.allowChildren ? (
            <span
              className="flex shrink-0 items-center rounded bg-zinc-800 p-px text-zinc-500"
              title="No permite sub-secciones"
            >
              <Ban className="h-2.5 w-2.5" />
            </span>
          ) : null}
          {node.children.length > 0 ? (
            <span className={badgeClass} title="Subsecciones">
              {node.children.length}
            </span>
          ) : null}
          {sectionForms.length > 0 ? (
            <span className={badgeClass} title="Formularios">
              {sectionForms.length}
            </span>
          ) : null}

          <button
            type="button"
            aria-label={`Acciones de ${section.name}`}
            className={`shrink-0 rounded p-0.5 text-zinc-500 transition-colors duration-150 hover:bg-zinc-800 hover:text-zinc-100 ${
              menuAnchor !== null ? "" : "opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
            }`}
            onClick={(event) => {
              event.stopPropagation();
              // Capturar el rect ANTES del updater: React pone currentTarget
              // en null al salir del handler.
              const rect = event.currentTarget.getBoundingClientRect();
              setMenuAnchor((previous) => (previous !== null ? null : rect));
            }}
          >
            <MoreVertical className="h-3.5 w-3.5" />
          </button>
        </div>

        {menuAnchor !== null ? (
          <ActionMenu
            anchor={menuAnchor}
            actions={actions}
            onClose={() => {
              setMenuAnchor(null);
            }}
          />
        ) : null}
      </div>

      {expanded ? (
        <div>
          {node.children.map((child, index) => (
            <SectionTreeNode
              key={child.section.id}
              node={child}
              depth={depth + 1}
              isFirst={index === 0}
              isLast={index === node.children.length - 1}
              expandedIds={expandedIds}
              activeSectionId={activeSectionId}
              formsBySection={formsBySection}
              handlers={handlers}
            />
          ))}
          {sectionForms.map((form) => (
            <div
              key={form.id}
              role="button"
              tabIndex={0}
              style={{ paddingLeft: 18 + depth * 12 }}
              className={`flex items-center gap-1.5 rounded-md py-1 pr-2 text-xs transition-colors duration-150 ${
                form.enabled
                  ? "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100"
                  : "text-zinc-600 opacity-60 hover:bg-zinc-900"
              }`}
              onClick={() => {
                handlers.onSelectForm(form.id);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  handlers.onSelectForm(form.id);
                }
              }}
            >
              <FileText className="h-3 w-3 shrink-0 text-zinc-600" />
              <span className="min-w-0 truncate">{form.name}</span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

/** Modal «Mover a…»: elige nueva sección padre (o raíz) para una sección. */
function MoveSectionModal({ section, onClose }: { section: Section; onClose: () => void }) {
  const sections = useSectionStore((store) => store.sections);
  const moveSectionTo = useSectionStore((store) => store.moveSectionTo);

  const excludedIds = useMemo(
    () => collectDescendantIds(sections, section.id),
    [sections, section.id],
  );
  const candidates = useMemo(
    () => sections.filter((candidate) => !excludedIds.has(candidate.id)),
    [sections, excludedIds],
  );
  // Precarga la ubicación actual como opción marcada.
  const [target, setTarget] = useState<string | null>(section.parentId ?? null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (busy) {
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
  }, [busy, onClose]);

  async function submit(): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      await moveSectionTo(section.id, target);
      onClose();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : String(submitError));
      setBusy(false);
    }
  }

  function optionClass(active: boolean): string {
    return `flex w-full cursor-pointer items-center gap-2 rounded-md border px-2.5 py-1.5 text-left text-xs transition-colors duration-150 ${
      active
        ? "border-sky-500/40 bg-sky-500/10 text-sky-100"
        : "border-transparent text-zinc-300 hover:border-zinc-700 hover:bg-zinc-800/60"
    }`;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={() => {
        if (!busy) {
          onClose();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Mover sección"
        className="flex w-full max-w-sm flex-col gap-3 rounded-xl border border-zinc-700 bg-zinc-900 p-5 shadow-2xl"
        onClick={(event) => {
          event.stopPropagation();
        }}
      >
        <h2 className="text-sm font-semibold text-zinc-100">
          Mover <span className="text-sky-300">«{section.name}»</span> a…
        </h2>

        <div className="flex max-h-64 flex-col gap-1 overflow-y-auto pr-1">
          <label className={optionClass(target === null)}>
            <input
              type="radio"
              name="move-target"
              className="shrink-0 accent-sky-500"
              checked={target === null}
              onChange={() => {
                setTarget(null);
              }}
            />
            Raíz (sin sección padre)
          </label>
          {candidates.map((candidate) => (
            <label key={candidate.id} className={optionClass(target === candidate.id)}>
              <input
                type="radio"
                name="move-target"
                className="shrink-0 accent-sky-500"
                checked={target === candidate.id}
                onChange={() => {
                  setTarget(candidate.id);
                }}
              />
              <span className="min-w-0 flex-1 truncate">
                {sectionPathLabel(sections, candidate.id)}
              </span>
              {!candidate.enabled ? (
                <span className="shrink-0 rounded bg-zinc-800 px-1 text-[9px] uppercase tracking-wide text-zinc-500">
                  Off
                </span>
              ) : null}
            </label>
          ))}
        </div>

        {error !== null ? (
          <p className="rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
            {error}
          </p>
        ) : null}

        <footer className="flex items-center justify-end gap-2">
          <button type="button" className={btnSecondary} onClick={onClose} disabled={busy}>
            Cancelar
          </button>
          <button
            type="button"
            className={btnPrimary}
            disabled={busy || target === section.parentId}
            onClick={() => {
              void submit();
            }}
          >
            {busy ? "Moviendo…" : "Mover"}
          </button>
        </footer>
      </div>
    </div>
  );
}

/**
 * Manejador de menús: barra superior compacta siempre visible (hamburguesa,
 * migas y buscador) + drawer lateral colapsable con UN árbol único de
 * secciones (navegación por clic + acciones contextuales por nodo),
 * «+ Nueva sección» y papelera siempre visibles.
 */
export function MenuSidebar({ children }: { children: ReactNode }) {
  const setSearchOpen = useUiStore((store) => store.setSearchOpen);
  const navigate = useUiStore((store) => store.navigate);
  const routes = useUiStore((store) => store.routes);
  const breadcrumb = useBreadcrumb();

  const sections = useSectionStore((store) => store.sections);
  const trashedSections = useSectionStore((store) => store.trashedSections);
  const formCounts = useSectionStore((store) => store.formCounts);
  const moveSection = useSectionStore((store) => store.moveSection);
  const enableSection = useSectionStore((store) => store.enableSection);
  const disableSection = useSectionStore((store) => store.disableSection);
  const softDeleteSection = useSectionStore((store) => store.softDeleteSection);
  const restoreSection = useSectionStore((store) => store.restoreSection);
  const hardDeleteSection = useSectionStore((store) => store.hardDeleteSection);
  const toggleAllowChildren = useSectionStore((store) => store.toggleAllowChildren);

  const [open, setOpen] = useState(readInitialDrawerOpen);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());
  const [modal, setModal] = useState<SidebarModal>(null);
  const [moveTarget, setMoveTarget] = useState<Section | null>(null);
  const [confirmHardDelete, setConfirmHardDelete] = useState<Section | null>(null);
  const [showTrash, setShowTrash] = useState(false);
  const [allForms, setAllForms] = useState<Form[]>([]);

  useEffect(() => {
    try {
      window.localStorage.setItem(DRAWER_KEY, open ? "1" : "0");
    } catch {
      // localStorage no disponible: la preferencia simplemente no persiste.
    }
  }, [open]);

  // Formularios vivos agrupables por sección (para el árbol).
  useEffect(() => {
    let cancelled = false;
    void formsRepository
      .list({ includeDisabled: true })
      .then((loaded) => {
        if (!cancelled) {
          setAllForms(loaded);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setAllForms([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [sections, formCounts]);

  const currentRoute = routes[routes.length - 1];
  const routeSectionId = currentRoute.view === "section" ? (currentRoute.id ?? null) : null;
  const routeFormId = currentRoute.view === "form" ? (currentRoute.id ?? null) : null;
  const formOwnerSectionId =
    routeFormId !== null
      ? (allForms.find((form) => form.id === routeFormId)?.sectionId ?? null)
      : null;
  // Nodo activo: la sección en ruta o la dueña del formulario en ruta.
  const activeSectionId = routeSectionId ?? formOwnerSectionId;

  const tree = useMemo(() => buildSectionTree(sections), [sections]);

  const formsBySection = useMemo(() => {
    const map = new Map<string, Form[]>();
    for (const form of allForms) {
      const bucket = map.get(form.sectionId);
      if (bucket !== undefined) {
        bucket.push(form);
      } else {
        map.set(form.sectionId, [form]);
      }
    }
    return map;
  }, [allForms]);

  // Auto-expandir los ancestros del nodo activo para que siempre sea visible.
  // Ajuste de estado durante el render (patrón oficial de React): si cambió el
  // nodo activo y aún no se expandió su cadena de ancestros, se hace aquí.
  const [expandedFor, setExpandedFor] = useState<string | null>(null);
  if (activeSectionId !== null && expandedFor !== activeSectionId) {
    const byId = new Map(sections.map((section) => [section.id, section]));
    let cursor = byId.get(activeSectionId);
    if (cursor === undefined) {
      setExpandedFor(activeSectionId);
    } else {
      const next = new Set(expandedIds);
      while (cursor !== undefined && cursor.parentId !== null) {
        next.add(cursor.parentId);
        cursor = byId.get(cursor.parentId);
      }
      if (next.size !== expandedIds.size) {
        setExpandedIds(next);
      }
      setExpandedFor(activeSectionId);
    }
  }

  // Esc cierra dropdowns/modales/papelera del drawer (el ConfirmModal gestiona el suyo).
  useEffect(() => {
    if (modal === null && moveTarget === null && confirmHardDelete === null && !showTrash) {
      return;
    }
    function onKeyDown(event: KeyboardEvent): void {
      if (event.key === "Escape" && confirmHardDelete === null) {
        setModal(null);
        setMoveTarget(null);
        setShowTrash(false);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [modal, moveTarget, confirmHardDelete, showTrash]);

  function toggleExpanded(id: string): void {
    setExpandedIds((previous) => {
      const next = new Set(previous);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function openCreateSubsection(parentId: string | null): void {
    if (parentId !== null) {
      // Que la nueva subsección se vea al crearse.
      setExpandedIds((previous) => new Set(previous).add(parentId));
    }
    setModal({ kind: "sectionCreate", parentId });
  }

  const handlers: TreeHandlers = {
    onToggleExpanded: toggleExpanded,
    onSelectSection: (id) => {
      // La vista de la sección (plana → registros directos; jerárquica →
      // panel) la decide su pantalla según allowChildren.
      navigate("section", id);
    },
    onSelectForm: (id) => {
      navigate("form", id);
    },
    onAddSubsection: (section) => {
      openCreateSubsection(section.id);
    },
    onAddForm: (section) => {
      setModal({ kind: "formCreate", sectionId: section.id });
    },
    onEditSection: (section) => {
      setModal({ kind: "sectionEdit", section });
    },
    onMoveTo: (section) => {
      setMoveTarget(section);
    },
    onMoveDelta: (section, delta) => {
      void moveSection(section.id, delta);
    },
    onToggleEnabled: (section) => {
      if (section.enabled) {
        void disableSection(section.id);
      } else {
        void enableSection(section.id);
      }
    },
    onToggleAllowChildren: (section) => {
      toggleAllowChildren(section.id).catch((toggleError: unknown) => {
        // El bloqueo se comunica al usuario, nunca se silencia.
        showErrorToast(toggleError instanceof Error ? toggleError.message : String(toggleError));
      });
    },
    onDelete: (section) => {
      // Soft delete: recuperable desde la papelera del drawer.
      void softDeleteSection(section.id);
    },
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      {/* Barra superior compacta */}
      <header className="flex h-12 shrink-0 items-center gap-2 border-b border-zinc-800 bg-zinc-950 px-2">
        <button
          type="button"
          title={open ? "Ocultar menú" : "Mostrar menú"}
          aria-label={open ? "Ocultar menú" : "Mostrar menú"}
          aria-expanded={open}
          onClick={() => {
            setOpen((previous) => !previous);
          }}
          className="rounded-md p-2 text-zinc-400 transition-colors duration-150 hover:bg-zinc-900 hover:text-zinc-100"
        >
          <PanelLeft className="h-4 w-4" />
        </button>

        <nav
          aria-label="Migas de pan"
          className="flex min-w-0 flex-1 items-center gap-1 overflow-hidden text-xs text-zinc-500"
        >
          {breadcrumb.map((item, index) => (
            <span
              key={`${item.label}:${String(index)}`}
              className="flex min-w-0 items-center gap-1"
            >
              {index > 0 ? (
                <span aria-hidden className="text-zinc-700">
                  /
                </span>
              ) : null}
              {item.onClick !== undefined ? (
                <button
                  type="button"
                  className="truncate rounded px-1 py-0.5 transition-colors duration-150 hover:bg-zinc-900 hover:text-sky-300"
                  onClick={item.onClick}
                >
                  {item.label}
                </button>
              ) : (
                <span className="truncate px-1 font-medium text-zinc-300">{item.label}</span>
              )}
            </span>
          ))}
        </nav>

        <button
          type="button"
          onClick={() => {
            setSearchOpen(true);
          }}
          title="Buscar en todo (Ctrl+K)"
          aria-label="Buscar en todo"
          className="flex shrink-0 items-center gap-2 rounded-md border border-zinc-800 bg-zinc-900/60 px-2.5 py-1.5 text-xs text-zinc-400 transition-colors duration-150 hover:border-sky-400 hover:text-zinc-100"
        >
          <Search className="h-3.5 w-3.5" />
          <kbd className="hidden rounded border border-zinc-700 bg-zinc-950 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-zinc-600 sm:inline">
            Ctrl K
          </kbd>
        </button>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* Drawer colapsable */}
        <aside
          aria-hidden={!open}
          className={`h-full shrink-0 overflow-hidden border-r border-zinc-800 bg-zinc-950 transition-[width] duration-200 ease-in-out ${
            open ? "w-72" : "w-0 border-r-0"
          }`}
        >
          <div inert={!open} className="flex h-full w-72 flex-col">
            {/* Marca discreta */}
            <p className="px-4 pt-3 text-[11px] font-semibold uppercase tracking-widest text-zinc-600">
              GDR · Organizador
            </p>

            <div className="px-3 pb-1 pt-2">
              <button
                type="button"
                className={`w-full ${btnPrimary}`}
                onClick={() => {
                  openCreateSubsection(null);
                }}
              >
                <Plus className="h-3.5 w-3.5" />
                Nueva sección
              </button>
            </div>

            {/* Árbol único de secciones con acciones contextuales por nodo */}
            <nav
              aria-label="Secciones"
              className="min-h-0 flex-1 overflow-y-auto px-2 pb-2"
            >
              {tree.length === 0 ? (
                <p className="px-2 py-6 text-center text-xs leading-relaxed text-zinc-600">
                  Aún no hay secciones.
                  <br />
                  Crea la primera con el botón de arriba.
                </p>
              ) : (
                tree.map((node, index) => (
                  <SectionTreeNode
                    key={node.section.id}
                    node={node}
                    depth={0}
                    isFirst={index === 0}
                    isLast={index === tree.length - 1}
                    expandedIds={expandedIds}
                    activeSectionId={activeSectionId}
                    formsBySection={formsBySection}
                    handlers={handlers}
                  />
                ))
              )}
            </nav>

            {/* Papelera de secciones */}
            <div className="border-t border-zinc-800">
                {showTrash ? (
                  <div className="max-h-52 overflow-y-auto px-2 py-2">
                    <p className="px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-600">
                      Secciones eliminadas
                    </p>
                    {trashedSections.length === 0 ? (
                      <p className="px-2 py-2 text-center text-xs text-zinc-600">
                        La papelera está vacía.
                      </p>
                    ) : (
                      <ul className="flex flex-col gap-1">
                        {trashedSections.map((section) => (
                          <li
                            key={section.id}
                            className="flex items-center gap-1.5 rounded-md border border-zinc-800 bg-zinc-900/60 px-2 py-1.5"
                          >
                            <IconRenderer
                              icon={section.icon}
                              className="h-3 w-3 shrink-0 text-zinc-600"
                            />
                            <span className="min-w-0 flex-1 truncate text-xs text-zinc-500 line-through">
                              {section.name}
                            </span>
                            <button
                              type="button"
                              title="Restaurar sección y su subárbol"
                              aria-label={`Restaurar ${section.name}`}
                              className="shrink-0 rounded p-1 text-zinc-500 transition-colors duration-150 hover:text-sky-300"
                              onClick={() => {
                                void restoreSection(section.id);
                              }}
                            >
                              <RotateCcw className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              title="Borrar definitivamente"
                              aria-label={`Borrar ${section.name} definitivamente`}
                              className="shrink-0 rounded p-1 text-zinc-500 transition-colors duration-150 hover:text-rose-300"
                              onClick={() => {
                                setConfirmHardDelete(section);
                              }}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ) : null}
                <button
                  type="button"
                  className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-xs text-zinc-400 transition-colors duration-150 hover:bg-zinc-900 hover:text-zinc-100"
                  onClick={() => {
                    setShowTrash((previous) => !previous);
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Papelera
                  {trashedSections.length > 0 ? (
                    <span className="ml-auto rounded bg-zinc-800 px-1.5 text-[10px] tabular-nums text-zinc-400">
                      {trashedSections.length}
                    </span>
                  ) : null}
                </button>
            </div>
          </div>
        </aside>

        {/* Área principal adaptable */}
        <main className="flex min-w-0 flex-1 flex-col overflow-hidden">{children}</main>
      </div>

      {modal?.kind === "sectionCreate" ? (
        <SectionModal
          mode={{
            kind: "create",
            parentId: modal.parentId,
            parentName:
              modal.parentId === null
                ? undefined
                : sections.find((section) => section.id === modal.parentId)?.name,
          }}
          onClose={() => {
            setModal(null);
          }}
        />
      ) : null}

      {modal?.kind === "sectionEdit" ? (
        <SectionModal
          mode={{ kind: "edit", section: modal.section }}
          onClose={() => {
            setModal(null);
          }}
        />
      ) : null}

      {modal?.kind === "formCreate" ? (
        <FormModal
          mode={{
            kind: "create",
            sectionId: modal.sectionId,
            sectionName: sections.find((section) => section.id === modal.sectionId)?.name,
          }}
          onClose={() => {
            setModal(null);
          }}
        />
      ) : null}

      {moveTarget !== null ? (
        <MoveSectionModal
          section={moveTarget}
          onClose={() => {
            setMoveTarget(null);
          }}
        />
      ) : null}

      {confirmHardDelete !== null ? (
        <ConfirmModal
          title="Borrar sección definitivamente"
          message={`Se eliminarán «${confirmHardDelete.name}», todo su subárbol, formularios y registros para siempre. Esta acción no se puede deshacer.`}
          confirmLabel="Borrar definitivo"
          onConfirm={() => hardDeleteSection(confirmHardDelete.id)}
          onClose={() => {
            setConfirmHardDelete(null);
          }}
        />
      ) : null}
    </div>
  );
}
