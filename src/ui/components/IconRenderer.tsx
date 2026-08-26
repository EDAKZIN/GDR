import { createElement, useEffect, useState } from "react";
import {
  Archive,
  Bookmark,
  BookOpen,
  Box,
  Briefcase,
  Calendar,
  Car,
  Cloud,
  Code,
  Database,
  File,
  Film,
  Folder,
  Gamepad2,
  Globe,
  Heart,
  Home,
  Image,
  KeyRound,
  Link,
  Lock,
  Music,
  Plane,
  Shield,
  ShoppingCart,
  Star,
  Tag,
  User,
  Users,
  Utensils,
  Wrench,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const STATIC_ICONS: Record<string, LucideIcon> = {
  Archive,
  Bookmark,
  BookOpen,
  Briefcase,
  Calendar,
  Car,
  Cloud,
  Code,
  Database,
  File,
  Film,
  Folder,
  Gamepad2,
  Globe,
  Heart,
  Home,
  Image,
  KeyRound,
  Link,
  Lock,
  Music,
  Plane,
  Shield,
  ShoppingCart,
  Star,
  Tag,
  User,
  Users,
  Utensils,
  Wrench,
};

function normalizeIconKey(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}

const STATIC_LOOKUP = new Map<string, LucideIcon>(
  Object.entries(STATIC_ICONS).map(([name, icon]) => [normalizeIconKey(name), icon]),
);

let dynamicIconsPromise: Promise<Map<string, LucideIcon>> | null = null;

function loadDynamicIcons(): Promise<Map<string, LucideIcon>> {
  dynamicIconsPromise ??= import("lucide-react").then((module) => {
    return new Map<string, LucideIcon>(
      Object.entries(module)
        .filter((entry): entry is [string, LucideIcon] => typeof entry[1] === "function")
        .map(([name, icon]) => [normalizeIconKey(name), icon]),
    );
  });
  return dynamicIconsPromise;
}

const URL_PATTERN = /^https?:\/\//i;

export interface IconRendererProps {
  icon: string | null | undefined;
  className?: string;
}

export function IconRenderer({ icon, className }: IconRendererProps) {
  const fallbackClass = className ?? "h-4 w-4";
  const trimmed = typeof icon === "string" ? icon.trim() : "";
  const isUrl = URL_PATTERN.test(trimmed);
  const name = isUrl || trimmed === "" ? null : trimmed;
  const lookupKey = name !== null ? normalizeIconKey(name) : "";

  const staticIcon = lookupKey !== "" ? STATIC_LOOKUP.get(lookupKey) : undefined;
  const [resolved, setResolved] = useState<{ key: string; icon: LucideIcon } | null>(null);

  if (resolved !== null && resolved.key !== lookupKey) {
    setResolved(null);
  }

  useEffect(() => {
    if (staticIcon !== undefined || lookupKey === "") {
      return;
    }
    let cancelled = false;
    loadDynamicIcons()
      .then((map) => {
        if (!cancelled) {
          setResolved({ key: lookupKey, icon: map.get(lookupKey) ?? Box });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setResolved({ key: lookupKey, icon: Box });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [lookupKey, staticIcon]);

  if (isUrl) {
    return (
      <img
        src={trimmed}
        alt=""
        className="h-full w-full rounded-[inherit] object-cover"
      />
    );
  }
  const lazyIcon = resolved !== null && resolved.key === lookupKey ? resolved.icon : null;
  const Icon = staticIcon ?? lazyIcon ?? Box;
  return createElement(Icon, { className: fallbackClass, "aria-hidden": true });
}
