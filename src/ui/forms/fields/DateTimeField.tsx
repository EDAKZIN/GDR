import type { FieldInputProps } from "./types";
import { fieldInputClass } from "./fieldStyles";

export function DateTimeField({ value, onChange, disabled }: FieldInputProps) {
  return (
    <input
      type="datetime-local"
      className={fieldInputClass(false)}
      value={typeof value === "string" ? value : ""}
      onChange={(event) => {
        onChange(event.target.value === "" ? null : event.target.value);
      }}
      disabled={disabled}
    />
  );
}
