import { Box } from "lucide-react";
import { DynamicIcon, iconNames } from "lucide-react/dynamic";

type IconName = Parameters<typeof DynamicIcon>[0]["name"];

function normalizeIconKey(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}

const KEBAB_BY_KEY = new Map<string, IconName>(
  (iconNames as readonly IconName[]).map((name) => [normalizeIconKey(name), name]),
);

const URL_PATTERN = /^https?:\/\//i;

export interface IconRendererProps {
  icon: string | null | undefined;
  className?: string;
}

export function IconRenderer({ icon, className }: IconRendererProps) {
  const fallbackClass = className ?? "h-4 w-4";
  const trimmed = typeof icon === "string" ? icon.trim() : "";

  if (URL_PATTERN.test(trimmed)) {
    return <img src={trimmed} alt="" className="h-full w-full rounded-[inherit] object-cover" />;
  }

  const kebab = KEBAB_BY_KEY.get(normalizeIconKey(trimmed));
  if (kebab === undefined) {
    return <Box className={fallbackClass} aria-hidden />;
  }
  return (
    <DynamicIcon
      name={kebab}
      fallback={() => <Box className={fallbackClass} aria-hidden />}
      className={fallbackClass}
      aria-hidden
    />
  );
}
