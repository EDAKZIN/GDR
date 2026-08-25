import { useState } from "react";
import { X } from "lucide-react";
import { useT } from "../../../i18n";
import type { FieldInputProps } from "./types";
import { fieldInputClass } from "./fieldStyles";

function toStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

export function TagsField({ value, onChange, disabled }: FieldInputProps) {
  const { t } = useT();
  const [draft, setDraft] = useState("");
  const tags = toStringArray(value);

  function commitDraft(): void {
    const text = draft.trim().replace(/,+$/, "").trim();
    if (text === "") {
      return;
    }
    if (!tags.includes(text)) {
      onChange([...tags, text]);
    }
    setDraft("");
  }

  function removeTag(tag: string): void {
    const next = tags.filter((current) => current !== tag);
    onChange(next.length > 0 ? next : null);
  }

  return (
    <div className={`${fieldInputClass(false)} flex min-h-[2.5rem] flex-wrap items-center gap-1.5`}>
      {tags.map((tag) => (
        <span
          key={tag}
          className="inline-flex items-center gap-1 rounded bg-sky-500/15 px-2 py-0.5 text-xs font-medium text-sky-300"
        >
          {tag}
          <button
            type="button"
            className="text-sky-400/70 transition-colors hover:text-rose-400"
            onClick={() => {
              removeTag(tag);
            }}
            disabled={disabled}
            aria-label={t("plantilla.quitarDe", { n: tag })}
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
      <input
        type="text"
        className="min-w-24 flex-1 border-none bg-transparent text-sm text-zinc-100 placeholder-zinc-500 outline-none"
        value={draft}
        placeholder={tags.length === 0 ? t("comun.etiquetaPlaceholder") : ""}
        onChange={(event) => {
          setDraft(event.target.value);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === ",") {
            event.preventDefault();
            commitDraft();
            return;
          }
          if (event.key === "Backspace" && draft === "" && tags.length > 0) {
            removeTag(tags[tags.length - 1]);
          }
        }}
        onBlur={commitDraft}
        disabled={disabled}
      />
    </div>
  );
}
