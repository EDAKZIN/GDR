import * as lucide from "lucide-react";
import type { LucideIcon } from "lucide-react";

/**
 * Mapa de iconos disponibles construido una sola vez a partir del namespace
 * de lucide-react: solo componentes (funciones) con nombre en PascalCase.
 * Excluye helpers internos como createLucideIcon o el objeto icons.
 */
const ICON_MAP = new Map<string, LucideIcon>(
  Object.entries(lucide).filter(
    (entry): entry is [string, LucideIcon] =>
      /^[A-Z]/.test(entry[0]) && typeof entry[1] === "function",
  ),
);

const URL_PATTERN = /^https?:\/\//i;

export interface IconRendererProps {
  /** URL http(s) o nombre PascalCase de un icono de lucide-react. */
  icon: string | null | undefined;
  className?: string;
}

/**
 * Resuelve un identificador de icono de sección:
 * - URL http(s): se renderiza como <img>.
 * - Nombre de icono de lucide-react: se renderiza su componente.
 * - Cualquier otro caso (vacío/desconocido): icono genérico Box.
 *
 * Los componentes de lucide son estables a nivel de módulo, por lo que la
 * resolución dinámica es segura; se desactiva la regla false-positive.
 */
export function IconRenderer({ icon, className }: IconRendererProps) {
  const fallbackClass = className ?? "h-4 w-4";
  if (icon !== undefined && icon !== null && URL_PATTERN.test(icon.trim())) {
    return (
      <img
        src={icon}
        alt=""
        className={`${fallbackClass} rounded object-contain`}
      />
    );
  }
  const Icon =
    typeof icon === "string" ? (ICON_MAP.get(icon) ?? lucide.Box) : lucide.Box;
  // eslint-disable-next-line react-hooks/static-components -- componentes estables de lucide-react, no se crean en render.
  return <Icon className={fallbackClass} aria-hidden />;
}
