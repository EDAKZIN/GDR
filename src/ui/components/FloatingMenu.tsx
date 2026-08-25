import { useLayoutEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

/** Rect del botón que abre un menú flotante (de getBoundingClientRect). */
export interface FloatingMenuAnchor {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

/**
 * Menú contextual anclado con position:fixed al rect del botón que lo abre.
 * Al no vivir dentro del contenedor con overflow/scroll, NUNCA se recorta ni
 * genera scroll interno; se voltea sobre el botón si toca el borde inferior y
 * se ajusta horizontalmente al viewport. Clic fuera lo cierra.
 */
export function FloatingMenu({
  anchor,
  onClose,
  widthClass = "w-52",
  children,
}: {
  anchor: FloatingMenuAnchor;
  onClose: () => void;
  widthClass?: string;
  children: ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  useLayoutEffect(() => {
    const panel = panelRef.current;
    if (panel === null) {
      return;
    }
    const margin = 8;
    const gap = 4;
    const width = panel.offsetWidth;
    const height = panel.offsetHeight;
    let top = anchor.bottom + gap;
    if (top + height > window.innerHeight - margin) {
      top = Math.max(margin, anchor.top - height - gap);
    }
    let left = anchor.right - width;
    if (left < margin) {
      left = margin;
    }
    if (left + width > window.innerWidth - margin) {
      left = window.innerWidth - margin - width;
    }
    setPos({ top, left });
  }, [anchor]);

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div
        ref={panelRef}
        style={
          pos === null
            ? { visibility: "hidden" }
            : { top: pos.top, left: pos.left }
        }
        className={`fixed z-50 flex flex-col overflow-hidden rounded-lg border border-zinc-700 bg-zinc-900 py-1 shadow-2xl ${widthClass}`}
      >
        {children}
      </div>
    </>
  );
}
