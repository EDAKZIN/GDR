import type { FieldInputProps } from "./types";
import { fieldInputClass } from "./fieldStyles";

export function FilePathField({ value, onChange, disabled }: FieldInputProps) {
  return (
    <input
      type="text"
      spellCheck={false}
      placeholder="C:\ruta\a\archivo o /ruta/a/archivo"
      className={`${fieldInputClass(false)} font-mono text-xs`}
      value={typeof value === "string" ? value : ""}
      onChange={(event) => {
        onChange(event.target.value === "" ? null : event.target.value);
      }}
      disabled={disabled}
    />
  );
}
