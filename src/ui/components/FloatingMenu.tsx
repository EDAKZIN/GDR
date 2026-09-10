import { useLayoutEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { getZoom } from "../../uiScale";

/** Rect del botón que abre un menú flotante (de getBoundingClientRect). */
export interface FloatingMenuAnchor {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

/** Zoom efectivo de la raíz: prefiere currentCSSZoom y cae a uiScale. */
function getRootZoomFactor(): number {
  try {
    const current = (
      document.documentElement as HTMLElement & { currentCSSZoom?: unknown }
    ).currentCSSZoom;
    if (typeof current === "number" && Number.isFinite(current) && current > 0) {
      return current;
    }
  } catch {
    // Sin acceso al DOM: se usa el zoom guardado.
  }
  const stored = getZoom() / 100;
  return Number.isFinite(stored) && stored > 0 ? stored : 1;
}

/**
 * Menú contextual anclado al rect del botón que lo abre.
 * Se portaliza a body para escapar de ancestros con overflow o
 * backdrop-filter (el fondo personalizado los añade y convierten al fixed
 * en relativo al contenedor). Las coordenadas de getBoundingClientRect y
 * window.innerWidth son visuales, pero el fixed dentro de <html> con zoom
 * se interpreta en coords de layout: se divide por el zoom raíz.
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
  const [pos, setPos] = useState<{ top: number; left: number; maxHeight: number } | null>(null);

  useLayoutEffect(() => {
    const panel = panelRef.current;
    if (panel === null) {
      return;
    }
    const margin = 8;
    const gap = 4;
    const zoom = getRootZoomFactor();
    // Tamaño y viewport en píxeles visuales; el estilo final se pasa a
    // coords de layout dividiendo por el zoom.
    const panelRect = panel.getBoundingClientRect();
    const width = panelRect.width;
    const height = panelRect.height;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const spaceBelow = viewportHeight - margin - anchor.bottom - gap;
    const spaceAbove = anchor.top - gap - margin;
    const flipped = height > spaceBelow && spaceAbove > spaceBelow;
    let visualTop: number;
    let visualMaxHeight: number;
    if (flipped) {
      visualTop = Math.max(margin, anchor.top - gap - height);
      visualMaxHeight = anchor.top - gap - visualTop;
    } else {
      visualTop = Math.min(anchor.bottom + gap, viewportHeight - margin);
      visualMaxHeight = viewportHeight - margin - visualTop;
    }
    let visualLeft = anchor.right - width;
    if (visualLeft < margin) {
      visualLeft = margin;
    }
    if (visualLeft + width > viewportWidth - margin) {
      visualLeft = viewportWidth - margin - width;
    }
    setPos({
      top: visualTop / zoom,
      left: visualLeft / zoom,
      maxHeight: Math.max(visualMaxHeight, 0) / zoom,
    });
  }, [anchor]);

  return createPortal(
    <>
      <div
        className="fixed inset-0 z-40"
        onClick={(event) => {
          event.stopPropagation();
          onClose();
        }}
      />
      <div
        ref={panelRef}
        onClick={(event) => {
          event.stopPropagation();
        }}
        style={
          pos === null
            ? { visibility: "hidden" }
            : { top: pos.top, left: pos.left, maxHeight: pos.maxHeight }
        }
        className={`fixed z-50 flex flex-col overflow-y-auto rounded-lg border border-zinc-700 bg-zinc-900 py-1 shadow-2xl ${widthClass}`}
      >
        {children}
      </div>
    </>,
    document.body,
  );
}
