import { useT } from "../../../i18n";
import type { FieldInputProps } from "./types";

export function BooleanField({ value, onChange, disabled }: FieldInputProps) {
  const { t } = useT();
  return (
    <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-zinc-200">
      <input
        type="checkbox"
        className="h-4 w-4 rounded border-zinc-600 bg-zinc-900 accent-sky-500"
        checked={value === true}
        onChange={(event) => {
          onChange(event.target.checked);
        }}
        disabled={disabled}
      />
      <span>{value === true ? t("comun.si") : t("comun.no")}</span>
    </label>
  );
}
