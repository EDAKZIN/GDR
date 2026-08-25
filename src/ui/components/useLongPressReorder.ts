import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";

/** Tiempo que hay que mantener pulsado el grip para activar el arrastre. */
const LONG_PRESS_MS = 350;
/** Desplazamiento máximo antes del umbral: si se supera, no se activa. */
const MOVE_THRESHOLD_PX = 6;
/** Franja junto a los bordes del contenedor donde actúa el auto-scroll. */
const EDGE_ZONE_PX = 56;
/** Velocidad máxima de auto-scroll (px por frame, proporcional a la cercanía). */
const MAX_SCROLL_SPEED_PX = 14;

export interface LongPressReorderOptions {
  /** Ids en su orden actual: fuera del arrastre define el orden visual. */
  orderedIds: readonly string[];
  /** Confirmado al soltar solo si el borrador difiere del orden original. */
  onReorder: (newOrderIds: string[]) => void;
}

export interface GripProps {
  role: "button";
  style: CSSProperties;
  onPointerDown: (event: ReactPointerEvent<HTMLElement>) => void;
  onContextMenu: (event: ReactMouseEvent<HTMLElement>) => void;
}

export interface LongPressReorderApi {
  /** Orden visual vigente: refleja el borrador mientras se arrastra. */
  order: readonly string[];
  /** Id del ítem arrastrándose (null si no hay arrastre activo). */
  draggingId: string | null;
  /** Registra el contenedor con scroll (llamar desde efectos/ref callback). */
  registerContainer: (node: HTMLElement | null) => void;
  /** Registra un ítem ordenable (llamar desde efectos/ref callback). */
  registerItem: (id: string, node: HTMLElement | null) => void;
  /** Props del grip que inicia la pulsación larga. */
  getGripProps: (id: string) => GripProps;
}

/**
 * Reordenación por arrastre con activación «mantener presionado» sobre un
 * grip, implementada con Pointer Events (sin librerías externas):
 *
 * - pointerdown inicia un timer (~350 ms); soltar antes o desplazarse más
 *   de ~6 px lo cancela, dejando el clic y el scroll táctiles intactos.
 * - Activado: el consumidor reordena en vivo (el hueco sigue al puntero),
 *   con auto-scroll del contenedor al acercarse a sus bordes.
 * - pointerup confirma via `onReorder`; Escape cancela sin tocar datos.
 * - `touch-action: none` solo aplica durante el arrastre activo para no
 *   romper el scroll táctil normal; los botones subir/bajar siguen siendo
 *   la alternativa accesible por teclado.
 */
export function useLongPressReorder(options: LongPressReorderOptions): LongPressReorderApi {
  const { orderedIds, onReorder } = options;

  const [dragId, setDragId] = useState<string | null>(null);
  const [draftOrder, setDraftOrder] = useState<readonly string[] | null>(null);

  const containerNode = useRef<HTMLElement | null>(null);
  const itemNodes = useRef<Map<string, HTMLElement>>(new Map());
  const orderedIdsRef = useRef(orderedIds);
  const draftOrderRef = useRef<readonly string[] | null>(null);
  const dragStateRef = useRef<{
    id: string;
    pointerId: number;
    pointerY: number;
  } | null>(null);
  const scrollRaf = useRef<number | null>(null);
  const teardownRef = useRef<(() => void) | null>(null);
  const onReorderRef = useRef(onReorder);

  useEffect(() => {
    orderedIdsRef.current = orderedIds;
    onReorderRef.current = onReorder;
  });

  /** Recalcula la posición del hueco según la Y del puntero. */
  const updateTargetIndex = useCallback((): void => {
    const drag = dragStateRef.current;
    if (drag === null) {
      return;
    }
    const current = draftOrderRef.current ?? orderedIdsRef.current;
    const others = current.filter((id) => id !== drag.id);
    let insertAt = 0;
    for (const id of others) {
      const node = itemNodes.current.get(id);
      if (node === undefined) {
        continue;
      }
      const rect = node.getBoundingClientRect();
      if (drag.pointerY > rect.top + rect.height / 2) {
        insertAt += 1;
      }
    }
    // Solo re-renderiza cuando el hueco cambia realmente de posición.
    if (insertAt !== current.indexOf(drag.id)) {
      const next = [...others];
      next.splice(insertAt, 0, drag.id);
      draftOrderRef.current = next;
      setDraftOrder(next);
    }
  }, []);

  const beginDrag = useCallback(
    (id: string, pointerId: number, pointerY: number): void => {
      /** Bucle rAF de auto-scroll al acercarse a los bordes del contenedor. */
      function autoScrollTick(): void {
        const drag = dragStateRef.current;
        const container = containerNode.current;
        if (drag === null || container === null) {
          scrollRaf.current = null;
          return;
        }
        const rect = container.getBoundingClientRect();
        let delta = 0;
        const topDistance = drag.pointerY - rect.top;
        const bottomDistance = rect.bottom - drag.pointerY;
        if (topDistance >= 0 && topDistance < EDGE_ZONE_PX) {
          delta = -(MAX_SCROLL_SPEED_PX * (EDGE_ZONE_PX - topDistance)) / EDGE_ZONE_PX;
        } else if (bottomDistance >= 0 && bottomDistance < EDGE_ZONE_PX) {
          delta = (MAX_SCROLL_SPEED_PX * (EDGE_ZONE_PX - bottomDistance)) / EDGE_ZONE_PX;
        }
        if (delta !== 0) {
          container.scrollTop += delta;
          // Al moverse el contenido cambian los rects: recalcular el hueco.
          updateTargetIndex();
        }
        scrollRaf.current = requestAnimationFrame(autoScrollTick);
      }

      draftOrderRef.current = [...orderedIdsRef.current];
      dragStateRef.current = { id, pointerId, pointerY };
      setDraftOrder(draftOrderRef.current);
      setDragId(id);

      const previousUserSelect = document.body.style.userSelect;
      const previousTouchAction = document.body.style.touchAction;
      const previousCursor = document.body.style.cursor;
      document.body.style.userSelect = "none";
      document.body.style.touchAction = "none";
      document.body.style.cursor = "grabbing";

      function finish(commit: boolean): void {
        window.removeEventListener("pointermove", onDragMove);
        window.removeEventListener("pointerup", onDragEnd);
        window.removeEventListener("pointercancel", onDragCancel);
        window.removeEventListener("keydown", onKeyDown);
        document.removeEventListener("touchmove", onTouchMove);
        if (scrollRaf.current !== null) {
          window.cancelAnimationFrame(scrollRaf.current);
          scrollRaf.current = null;
        }
        document.body.style.userSelect = previousUserSelect;
        document.body.style.touchAction = previousTouchAction;
        document.body.style.cursor = previousCursor;
        teardownRef.current = null;
        const finalOrder = draftOrderRef.current;
        dragStateRef.current = null;
        draftOrderRef.current = null;
        setDraftOrder(null);
        setDragId(null);
        if (commit && finalOrder !== null) {
          const original = orderedIdsRef.current;
          const changed =
            finalOrder.length !== original.length ||
            finalOrder.some((orderId, index) => original[index] !== orderId);
          if (changed) {
            onReorderRef.current([...finalOrder]);
          }
        }
      }

      const onDragMove = (event: PointerEvent): void => {
        const drag = dragStateRef.current;
        if (drag === null || event.pointerId !== drag.pointerId) {
          return;
        }
        drag.pointerY = event.clientY;
        updateTargetIndex();
      };

      // Bloquea el scroll táctil nativo solo mientras el drag está activo.
      const onTouchMove = (event: TouchEvent): void => {
        event.preventDefault();
      };

      const onKeyDown = (event: KeyboardEvent): void => {
        if (event.key === "Escape") {
          event.preventDefault();
          finish(false);
        }
      };

      const onDragEnd = (): void => {
        finish(true);
      };

      const onDragCancel = (): void => {
        finish(false);
      };

      window.addEventListener("pointermove", onDragMove);
      window.addEventListener("pointerup", onDragEnd);
      window.addEventListener("pointercancel", onDragCancel);
      window.addEventListener("keydown", onKeyDown);
      document.addEventListener("touchmove", onTouchMove, { passive: false });
      teardownRef.current = () => {
        finish(false);
      };
      scrollRaf.current = requestAnimationFrame(autoScrollTick);
    },
    [updateTargetIndex],
  );

  // Limpieza si el componente se desmonta a mitad de arrastre.
  useEffect(
    () => () => {
      teardownRef.current?.();
      teardownRef.current = null;
      if (scrollRaf.current !== null) {
        window.cancelAnimationFrame(scrollRaf.current);
        scrollRaf.current = null;
      }
    },
    [],
  );

  const registerContainer = useCallback((node: HTMLElement | null): void => {
    containerNode.current = node;
  }, []);

  const registerItem = useCallback((id: string, node: HTMLElement | null): void => {
    if (node === null) {
      itemNodes.current.delete(id);
    } else {
      itemNodes.current.set(id, node);
    }
  }, []);

  const getGripProps = useCallback(
    (id: string): GripProps => ({
      role: "button",
      style: { touchAction: dragId === id ? "none" : undefined },
      onPointerDown: (event) => {
        if (event.button !== 0) {
          return;
        }
        const startX = event.clientX;
        const startY = event.clientY;
        let timer = 0;

        const endPending = (): void => {
          window.clearTimeout(timer);
          window.removeEventListener("pointermove", onPendingMove);
          window.removeEventListener("pointerup", onPendingEnd);
          window.removeEventListener("pointercancel", onPendingEnd);
        };

        const onPendingMove = (moveEvent: PointerEvent): void => {
          // Movimiento apreciable antes del umbral: era scroll o gesto, no
          // intención de arrastrar.
          if (
            Math.hypot(moveEvent.clientX - startX, moveEvent.clientY - startY) > MOVE_THRESHOLD_PX
          ) {
            endPending();
          }
        };

        const onPendingEnd = (): void => {
          // Soltar antes del umbral: clic normal.
          endPending();
        };

        timer = window.setTimeout(() => {
          endPending();
          beginDrag(id, event.pointerId, event.clientY);
        }, LONG_PRESS_MS);

        window.addEventListener("pointermove", onPendingMove);
        window.addEventListener("pointerup", onPendingEnd);
        window.addEventListener("pointercancel", onPendingEnd);
      },
      // Evita el menú contextual nativo del long-press en táctil.
      onContextMenu: (event) => {
        event.preventDefault();
      },
    }),
    [beginDrag, dragId],
  );

  return {
    order: draftOrder ?? orderedIds,
    draggingId: dragId,
    registerContainer,
    registerItem,
    getGripProps,
  };
}
