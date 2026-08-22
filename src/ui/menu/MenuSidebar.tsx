import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { PanelLeft, Search } from "lucide-react";
import { useBreadcrumb, useUiStore } from "../../stores/useUiStore";

const DRAWER_KEY = "gdr.menuDrawerOpen";

function readInitialDrawerOpen(): boolean {
  try {
    return window.localStorage.getItem(DRAWER_KEY) !== "0";
  } catch {
    return true;
  }
}

/**
 * Manejador de menús: barra superior compacta siempre visible (hamburguesa,
 * migas y buscador) + drawer lateral colapsable con el árbol de secciones.
 * La preferencia abrir/cerrar persiste en localStorage.
 */
export function MenuSidebar({ children }: { children: ReactNode }) {
  const setSearchOpen = useUiStore((store) => store.setSearchOpen);
  const breadcrumb = useBreadcrumb();
  const [open, setOpen] = useState(readInitialDrawerOpen);

  useEffect(() => {
    try {
      window.localStorage.setItem(DRAWER_KEY, open ? "1" : "0");
    } catch {
      // localStorage no disponible: la preferencia simplemente no persiste.
    }
  }, [open]);

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
                <span className="truncate px-1 font-medium text-zinc-300">
                  {item.label}
                </span>
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
          <div className="flex h-full w-72 flex-col">
            <p className="px-4 pt-3 text-[11px] font-semibold uppercase tracking-widest text-zinc-600">
              GDR
            </p>
          </div>
        </aside>

        {/* Área principal adaptable */}
        <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
