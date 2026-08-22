import type { FieldInputProps } from "./types";
import { fieldInputClass } from "./fieldStyles";

export function UrlField({ value, onChange, disabled }: FieldInputProps) {
  return (
    <input
      type="url"
      placeholder="https://…"
      className={fieldInputClass(false)}
      value={typeof value === "string" ? value : ""}
      onChange={(event) => {
        onChange(event.target.value === "" ? null : event.target.value);
      }}
      disabled={disabled}
    />
  );
}
