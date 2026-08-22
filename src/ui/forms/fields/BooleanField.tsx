import type { FieldInputProps } from "./types";

export function BooleanField({ value, onChange, disabled }: FieldInputProps) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-zinc-200">
      <input
        type="checkbox"
        className="h-4 w-4 rounded border-zinc-600 bg-zinc-900 accent-amber-500"
        checked={value === true}
        onChange={(event) => {
          onChange(event.target.checked);
        }}
        disabled={disabled}
      />
      <span>{value === true ? "Sí" : "No"}</span>
    </label>
  );
}
