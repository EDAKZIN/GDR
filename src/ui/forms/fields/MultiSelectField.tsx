import { parseFieldOptions } from "../../../core/fields";
import type { FieldInputProps } from "./types";
import { fieldInputClass } from "./fieldStyles";

function toStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

export function MultiSelectField({ field, value, onChange, disabled }: FieldInputProps) {
  const options = parseFieldOptions(field);
  const selected = new Set(toStringArray(value));

  function toggle(optionValue: string, checked: boolean): void {
    const next = new Set(selected);
    if (checked) {
      next.add(optionValue);
    } else {
      next.delete(optionValue);
    }
    onChange(next.size > 0 ? [...next] : null);
  }

  if (options.length === 0) {
    return (
      <p className="text-xs text-zinc-500">
        Este campo no tiene opciones definidas.
      </p>
    );
  }

  return (
    <div className={`${fieldInputClass(false)} flex max-h-48 flex-wrap gap-x-4 gap-y-2 overflow-y-auto`}>
      {options.map((option) => (
        <label
          key={option.value}
          className="inline-flex cursor-pointer items-center gap-2 text-sm text-zinc-200"
        >
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-zinc-600 bg-zinc-900 accent-teal-500"
            checked={selected.has(option.value)}
            onChange={(event) => {
              toggle(option.value, event.target.checked);
            }}
            disabled={disabled}
          />
          {option.label}
        </label>
      ))}
    </div>
  );
}
