import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { flushSync } from "react-dom";

/** Tiempo que hay que mantener pulsado el grip para activar el arrastre. */
const LONG_PRESS_MS = 350;
/** Desplazamiento máximo antes del umbral: si se supera, no se activa. */
const MOVE_THRESHOLD_PX = 6;
/** Franja junto a los bordes del contenedor donde actúa el auto-scroll. */
const EDGE_ZONE_PX = 56;
/** Velocidad máxima de auto-scroll (px por frame, proporcional a la cercanía). */
const MAX_SCROLL_SPEED_PX = 14;
/** Margen interior que respeta el ítem arrastrado dentro del contenedor. */
const CLAMP_MARGIN_PX = 4;
/** Duración de las transiciones de colocación (soltar y desplazar vecinos). */
const SETTLE_MS = 120;

interface DragState {
  id: string;
  pointerId: number;
  pointerX: number;
  pointerY: number;
  grabOffsetX: number;
  grabOffsetY: number;
  appliedX: number;
  appliedY: number;
}

function px(value: number): string {
  return `${String(value)}px`;
}

/** Coloca el ítem arrastrado bajo el puntero, acotado a los bounds del contenedor. */
function applyDragTransform(
  drag: DragState,
  nodes: Map<string, HTMLElement>,
  container: HTMLElement | null,
): void {
  const node = nodes.get(drag.id);
  if (node === undefined || container === null) {
    return;
  }
  const rect = node.getBoundingClientRect();
  const flowLeft = rect.left - drag.appliedX;
  const flowTop = rect.top - drag.appliedY;
  const bounds = container.getBoundingClientRect();
  const minLeft = bounds.left + CLAMP_MARGIN_PX;
  const minTop = bounds.top + CLAMP_MARGIN_PX;
  const maxLeft = Math.max(minLeft, bounds.right - CLAMP_MARGIN_PX - rect.width);
  const maxTop = Math.max(minTop, bounds.bottom - CLAMP_MARGIN_PX - rect.height);
  const desiredLeft = Math.min(Math.max(drag.pointerX - drag.grabOffsetX, minLeft), maxLeft);
  const desiredTop = Math.min(Math.max(drag.pointerY - drag.grabOffsetY, minTop), maxTop);
  const x = desiredLeft - flowLeft;
  const y = desiredTop - flowTop;
  if (x !== drag.appliedX || y !== drag.appliedY) {
    node.style.transform = `translate3d(${px(x)}, ${px(y)}, 0)`;
    drag.appliedX = x;
    drag.appliedY = y;
  }
}

/**
 * FLIP: tras un cambio de hueco, anima el desplazamiento de los vecinos con
 * una transición corta en lugar de moverlos instantáneamente.
 */
function flipNeighbors(
  draggedId: string,
  before: Map<string, { left: number; top: number }>,
  nodes: Map<string, HTMLElement>,
  offsets: Map<string, { x: number; y: number }>,
  timers: Map<string, number>,
): void {
  for (const [id, node] of nodes) {
    if (id === draggedId) {
      continue;
    }
    const pendingTimer = timers.get(id);
    if (pendingTimer !== undefined) {
      window.clearTimeout(pendingTimer);
      timers.delete(id);
    }
    const origin = before.get(id);
    if (origin === undefined) {
      continue;
    }
    const rect = node.getBoundingClientRect();
    const dx = origin.left - rect.left;
    const dy = origin.top - rect.top;
    if (dx === 0 && dy === 0) {
      node.style.transition = "";
      node.style.transform = "";
      offsets.delete(id);
      continue;
    }
    node.style.transition = "none";
    node.style.transform = `translate3d(${px(dx)}, ${px(dy)}, 0)`;
    void node.offsetWidth;
    node.style.transition = `transform ${String(SETTLE_MS)}ms ease-out`;
    node.style.transform = "";
    offsets.set(id, { x: dx, y: dy });
    const timer = window.setTimeout(() => {
      timers.delete(id);
      offsets.delete(id);
      node.style.transition = "";
      node.style.transform = "";
    }, SETTLE_MS + 60);
    timers.set(id, timer);
  }
}

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
 * - Activado: el ítem sigue al puntero mediante `transform: translate3d`
 *   continuo (sin saltos entre slots), siempre dentro de los bounds del
 *   contenedor; el hueco se recalcula en vivo y los vecinos se desplazan
 *   con transición corta (FLIP). Hay auto-scroll al acercarse a los
 *   bordes del contenedor.
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
  const dragStateRef = useRef<DragState | null>(null);
  const scrollRaf = useRef<number | null>(null);
  const teardownRef = useRef<(() => void) | null>(null);
  const onReorderRef = useRef(onReorder);
  const flipOffsetsRef = useRef<Map<string, { x: number; y: number }>>(new Map());
  const flipTimersRef = useRef<Map<string, number>>(new Map());

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
      // Se descuenta el desplazamiento de la animación FLIP en curso para
      // medir la posición natural del vecino.
      const flipOffset = flipOffsetsRef.current.get(id);
      const rect = node.getBoundingClientRect();
      const center = rect.top + rect.height / 2 - (flipOffset?.y ?? 0);
      if (drag.pointerY > center) {
        insertAt += 1;
      }
    }
    // Solo re-renderiza cuando el hueco cambia realmente de posición.
    if (insertAt !== current.indexOf(drag.id)) {
      const next = [...others];
      next.splice(insertAt, 0, drag.id);
      const before = new Map<string, { left: number; top: number }>();
      for (const [id, node] of itemNodes.current) {
        const rect = node.getBoundingClientRect();
        before.set(id, { left: rect.left, top: rect.top });
      }
      flushSync(() => {
        draftOrderRef.current = next;
        setDraftOrder(next);
      });
      // Tras el re-render síncrono el layout ya está aplicado: se anima a los
      // vecinos y se restaura la continuidad visual del ítem arrastrado.
      flipNeighbors(drag.id, before, itemNodes.current, flipOffsetsRef.current, flipTimersRef.current);
      applyDragTransform(drag, itemNodes.current, containerNode.current);
    }
  }, []);

  const beginDrag = useCallback(
    (id: string, pointerId: number, pointerX: number, pointerY: number): void => {
      const node = itemNodes.current.get(id);
      if (node === undefined) {
        return;
      }

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
          // Al moverse el contenido cambian las posiciones: recalcular todo.
          applyDragTransform(drag, itemNodes.current, container);
          updateTargetIndex();
        }
        scrollRaf.current = requestAnimationFrame(autoScrollTick);
      }

      const rect = node.getBoundingClientRect();
      draftOrderRef.current = [...orderedIdsRef.current];
      const dragState: DragState = {
        id,
        pointerId,
        pointerX,
        pointerY,
        grabOffsetX: pointerX - rect.left,
        grabOffsetY: pointerY - rect.top,
        appliedX: 0,
        appliedY: 0,
      };
      dragStateRef.current = dragState;
      node.style.transition = "none";
      node.style.willChange = "transform";
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
        for (const [flipId, timer] of flipTimersRef.current) {
          window.clearTimeout(timer);
          flipTimersRef.current.delete(flipId);
          flipOffsetsRef.current.delete(flipId);
          const flipNode = itemNodes.current.get(flipId);
          if (flipNode !== undefined) {
            flipNode.style.transition = "";
            flipNode.style.transform = "";
          }
        }
        const dragNode = itemNodes.current.get(id);
        if (dragNode !== undefined) {
          // Asentamiento suave hacia el slot definitivo.
          dragNode.style.transition = `transform ${String(SETTLE_MS)}ms ease-out`;
          dragNode.style.transform = "";
          window.setTimeout(() => {
            dragNode.style.transition = "";
            dragNode.style.willChange = "";
          }, SETTLE_MS + 60);
        }
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
        drag.pointerX = event.clientX;
        drag.pointerY = event.clientY;
        applyDragTransform(drag, itemNodes.current, containerNode.current);
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
      for (const timer of flipTimersRef.current.values()) {
        window.clearTimeout(timer);
      }
      flipTimersRef.current.clear();
      flipOffsetsRef.current.clear();
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
          beginDrag(id, event.pointerId, event.clientX, event.clientY);
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
