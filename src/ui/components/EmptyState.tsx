import type { ComponentType, ReactNode } from "react";
import { btnPrimaryLg } from "./uiStyles";

/**
 * Estado vacío estándar: icono grande zinc-700 + título + subtítulo + CTA.
 * Patrón único para todas las pantallas y tablas.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  children,
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  description: ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  /** Acciones extra (múltiples CTAs). */
  children?: ReactNode;
}) {
  return (
    <div className="flex min-h-48 flex-1 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-zinc-800 px-6 py-12 text-center">
      <Icon className="h-10 w-10 text-zinc-700" />
      <div>
        <h3 className="text-sm font-semibold text-zinc-200">{title}</h3>
        <p className="mx-auto mt-1 max-w-sm text-sm leading-relaxed text-zinc-500">
          {description}
        </p>
      </div>
      {actionLabel !== undefined && onAction !== undefined ? (
        <button type="button" className={`mt-1 ${btnPrimaryLg}`} onClick={onAction}>
          {actionLabel}
        </button>
      ) : null}
      {children}
    </div>
  );
}
