import { Construction } from "lucide-react";
import { useBreadcrumb, useUiStore } from "../../stores/useUiStore";

/**
 * Pantalla FORMULARIO (placeholder). El constructor/llenado real se
 * implementará en la parte 2; por ahora muestra migas de pan y un aviso.
 */
export function FormWorkspaceScreen() {
  const goBack = useUiStore((store) => store.goBack);
  const breadcrumb = useBreadcrumb();

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
        <header className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => {
              goBack();
            }}
            title="Volver a la sección"
            aria-label="Volver"
            className="shrink-0 rounded-md border border-zinc-700 bg-zinc-900 p-2 text-zinc-300 transition-colors hover:border-sky-400 hover:text-zinc-100"
          >
            ←
          </button>

          <nav
            aria-label="Migas de pan"
            className="flex min-w-0 flex-wrap items-center gap-1.5 text-sm text-zinc-400"
          >
            {breadcrumb.map((item, index) => (
              <span key={`${item.label}:${index}`} className="flex items-center gap-1.5">
                {index > 0 ? (
                  <span aria-hidden className="text-zinc-600">
                    /
                  </span>
                ) : null}
                {item.onClick !== undefined ? (
                  <button
                    type="button"
                    className="truncate rounded px-0.5 transition-colors hover:text-sky-300"
                    onClick={item.onClick}
                  >
                    {item.label}
                  </button>
                ) : (
                  <span className="truncate font-semibold text-zinc-100">
                    {item.label}
                  </span>
                )}
              </span>
            ))}
          </nav>
        </header>

        <section className="flex flex-1 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-zinc-800 px-6 py-20 text-center">
          <Construction className="h-10 w-10 text-zinc-700" />
          <h2 className="text-base font-semibold text-zinc-200">Pendiente parte 2</h2>
          <p className="max-w-sm text-sm leading-relaxed text-zinc-500">
            El constructor y llenado de este formulario llegará con la siguiente
            entrega.
          </p>
        </section>
      </div>
    </div>
  );
}
