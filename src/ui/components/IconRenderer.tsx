import { useEffect, useState } from "react";
import {
  Archive,
  Bookmark,
  BookOpen,
  Box,
  Briefcase,
  Calendar,
  Car,
  Film,
  Folder,
  Gamepad2,
  Heart,
  Home,
  Music,
  Plane,
  ShoppingCart,
  Star,
  Tag,
  User,
  Users,
  Utensils,
  Wrench,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

/**
 * Mapa estático de iconos comunes (los sugeridos en iconNames.ts), importados
 * de forma nominal para que el bundle principal NO incluya lucide-react
 * entero (~1 MB). Cualquier otro nombre de Lucide se resuelve bajo demanda
 * mediante import() diferido: Vite separa el paquete completo en un chunk
 * asíncrono que solo se descarga si el usuario escribió un nombre fuera de
 * esta lista. Si la carga falla, cae al icono genérico Box.
 */
const STATIC_ICONS: Record<string, LucideIcon> = {
  Archive,
  Bookmark,
  BookOpen,
  Briefcase,
  Calendar,
  Car,
  Film,
  Folder,
  Gamepad2,
  Heart,
  Home,
  Music,
  Plane,
  ShoppingCart,
  Star,
  Tag,
  User,
  Users,
  Utensils,
  Wrench,
};

let dynamicIconsPromise: Promise<Map<string, LucideIcon>> | null = null;

function loadDynamicIcons(): Promise<Map<string, LucideIcon>> {
  dynamicIconsPromise ??= import("lucide-react").then((module) => {
    // Solo componentes (funciones PascalCase); excluye helpers internos.
    return new Map<string, LucideIcon>(
      Object.entries(module).filter(
        (entry): entry is [string, LucideIcon] =>
          /^[A-Z]/.test(entry[0]) && typeof entry[1] === "function",
      ),
    );
  });
  return dynamicIconsPromise;
}

const URL_PATTERN = /^https?:\/\//i;

export interface IconRendererProps {
  /** URL http(s) o nombre PascalCase de un icono de lucide-react. */
  icon: string | null | undefined;
  className?: string;
}

/**
 * Resuelve un identificador de icono de sección:
 * - URL http(s): se renderiza como <img>.
 * - Nombre de icono de lucide-react: mapa estático o carga diferida.
 * - Cualquier otro caso (vacío/desconocido): icono genérico Box.
 *
 * Los componentes de lucide son estables a nivel de módulo, por lo que la
 * resolución dinámica es segura; se desactiva la regla false-positive.
 */
export function IconRenderer({ icon, className }: IconRendererProps) {
  const fallbackClass = className ?? "h-4 w-4";
  const trimmed = typeof icon === "string" ? icon.trim() : "";
  const isUrl = URL_PATTERN.test(trimmed);
  const name = isUrl || trimmed === "" ? null : trimmed;

  const staticIcon = name !== null ? STATIC_ICONS[name] : undefined;
  const [resolved, setResolved] = useState<{ name: string; icon: LucideIcon } | null>(
    null,
  );

  // Ajuste de estado durante el render (patrón oficial de React): si cambió el
  // nombre solicitado, se descarta la resolución anterior.
  if (resolved !== null && resolved.name !== name) {
    setResolved(null);
  }

  useEffect(() => {
    if (staticIcon !== undefined || name === null) {
      return;
    }
    let cancelled = false;
    loadDynamicIcons()
      .then((map) => {
        if (!cancelled) {
          setResolved({ name, icon: map.get(name) ?? Box });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setResolved({ name, icon: Box });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [name, staticIcon]);

  if (isUrl) {
    return (
      <img src={trimmed} alt="" className={`${fallbackClass} rounded object-contain`} />
    );
  }
  const lazyIcon = resolved !== null && resolved.name === name ? resolved.icon : null;
  const Icon = staticIcon ?? lazyIcon ?? Box;
  return <Icon className={fallbackClass} aria-hidden />;
}
