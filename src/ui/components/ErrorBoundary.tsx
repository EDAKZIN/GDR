import { Component, type ErrorInfo, type ReactNode } from "react";
import { TriangleAlert } from "lucide-react";
import { translate } from "../../i18n";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/**
 * Boundary global de render: captura cualquier excepción de React y muestra
 * un panel oscuro con el mensaje y un botón «Recargar». Sin él, una excepción
 * durante un render desmonta el root entero y deja la ventana en blanco
 * (pantalla blanca silenciosa). Usa translate() directo (no useT) para seguir
 * funcionando aunque el fallo esté en el propio I18nProvider.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("Error de render capturado por ErrorBoundary:", error, info.componentStack);
  }

  render(): ReactNode {
    const { error } = this.state;
    if (error === null) {
      return this.props.children;
    }
    return (
      <div className="flex h-[calc(100dvh/var(--gdr-zoom,1))] flex-col items-center justify-center gap-4 bg-zinc-950 p-8 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-rose-500/15 text-rose-300">
          <TriangleAlert className="h-6 w-6" aria-hidden />
        </span>
        <h1 className="text-lg font-semibold text-zinc-100">
          {translate("error.titulo")}
        </h1>
        <p className="max-w-md text-sm leading-relaxed text-zinc-400">
          {translate("error.mensaje")}
        </p>
        <pre className="max-w-lg overflow-auto rounded-md border border-zinc-800 bg-zinc-900 p-3 text-left text-xs text-zinc-500">
          {error.message}
        </pre>
        <button
          type="button"
          className="rounded-md bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-sky-500"
          onClick={() => {
            window.location.reload();
          }}
        >
          {translate("error.recargar")}
        </button>
      </div>
    );
  }
}
