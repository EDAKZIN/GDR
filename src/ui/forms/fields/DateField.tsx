import type { FieldInputProps } from "./types";
import { fieldInputClass } from "./fieldStyles";

export function DateField({ value, onChange, disabled }: FieldInputProps) {
  return (
    <input
      type="date"
      className={`${fieldInputClass(false)} [color-scheme:dark]`}
      value={typeof value === "string" ? value : ""}
      onChange={(event) => {
        onChange(event.target.value === "" ? null : event.target.value);
      }}
      disabled={disabled}
    />
  );
}
