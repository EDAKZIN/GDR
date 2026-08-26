import { createElement } from "react";
import { Box } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import * as lucide from "lucide-react";

const ICON_LOOKUP = new Map<string, LucideIcon>(
  Object.entries(lucide)
    .filter((entry): entry is [string, LucideIcon] => typeof entry[1] === "function")
    .map(([name, icon]) => [normalizeIconKey(name), icon]),
);

function normalizeIconKey(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "");
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

  if (isUrl) {
    return <img src={trimmed} alt="" className="h-full w-full rounded-[inherit] object-cover" />;
  }

  const key = normalizeIconKey(trimmed);
  const Icon = key !== "" ? (ICON_LOOKUP.get(key) ?? Box) : Box;
  return createElement(Icon, { className: fallbackClass, "aria-hidden": true });
}
