import type { FieldInputProps } from "./types";
import { fieldInputClass } from "./fieldStyles";

export function LongTextArea({ value, onChange, disabled }: FieldInputProps) {
  return (
    <textarea
      rows={4}
      className={`${fieldInputClass(false)} resize-y`}
      value={typeof value === "string" ? value : ""}
      onChange={(event) => {
        onChange(event.target.value === "" ? null : event.target.value);
      }}
      disabled={disabled}
    />
  );
}
