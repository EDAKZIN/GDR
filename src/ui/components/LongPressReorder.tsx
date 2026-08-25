import { useEffect, useRef, type ReactNode } from "react";
import type { LongPressReorderApi } from "./useLongPressReorder";

/**
 * Envoltorios de useLongPressReorder que registran sus nodos en el hook
 * desde un efecto (los refs solo se tocan fuera del render).
 */
export function ReorderContainer({
  controller,
  className,
  children,
}: {
  controller: LongPressReorderApi;
  className?: string;
  children: ReactNode;
}) {
  const { registerContainer } = controller;
  const containerRef = useRef<HTMLUListElement | null>(null);

  useEffect(() => {
    registerContainer(containerRef.current);
    return () => {
      registerContainer(null);
    };
  }, [registerContainer]);

  return (
    <ul ref={containerRef} className={className}>
      {children}
    </ul>
  );
}

export function ReorderItem({
  controller,
  id,
  className,
  children,
}: {
  controller: LongPressReorderApi;
  id: string;
  className?: string;
  children: ReactNode;
}) {
  const { registerItem } = controller;
  const itemRef = useRef<HTMLLIElement | null>(null);

  useEffect(() => {
    const node = itemRef.current;
    registerItem(id, node);
    return () => {
      registerItem(id, null);
    };
  }, [registerItem, id]);

  return (
    <li ref={itemRef} className={className}>
      {children}
    </li>
  );
}
