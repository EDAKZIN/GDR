import { useState } from "react";
import type { FieldInputProps } from "./types";
import { fieldInputClass } from "./fieldStyles";

function toText(value: unknown): string {
  return typeof value === "number" && Number.isFinite(value) ? String(value) : "";
}

export function NumberField({ value, onChange, disabled }: FieldInputProps) {
  const [text, setText] = useState<string>(() => toText(value));
  const [lastExternal, setLastExternal] = useState<unknown>(value);

  // Sincronización de estado durante el render (patrón oficial de React para
  // ajustar estado cuando cambia una prop externa).
  if (value !== lastExternal) {
    setLastExternal(value);
    if (Number(text) !== value) {
      setText(toText(value));
    }
  }

  return (
    <input
      type="text"
      inputMode="decimal"
      className={fieldInputClass(false)}
      value={text}
      onChange={(event) => {
        const next = event.target.value;
        setText(next);
        const trimmed = next.trim();
        if (trimmed === "") {
          onChange(null);
          return;
        }
        const parsed = Number(trimmed);
        if (!Number.isNaN(parsed)) {
          onChange(parsed);
        }
      }}
      disabled={disabled}
      placeholder="0"
    />
  );
}
