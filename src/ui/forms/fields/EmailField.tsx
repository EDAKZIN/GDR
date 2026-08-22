import type { FieldInputProps } from "./types";
import { fieldInputClass } from "./fieldStyles";

export function EmailField({ value, onChange, disabled }: FieldInputProps) {
  return (
    <input
      type="email"
      placeholder="usuario@dominio.com"
      className={fieldInputClass(false)}
      value={typeof value === "string" ? value : ""}
      onChange={(event) => {
        onChange(event.target.value === "" ? null : event.target.value);
      }}
      disabled={disabled}
    />
  );
}
