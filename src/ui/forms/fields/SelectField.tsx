import { parseFieldOptions } from "../../../core/fields";
import { useT } from "../../../i18n";
import type { FieldInputProps } from "./types";
import { fieldInputClass } from "./fieldStyles";

export function SelectField({ field, value, onChange, disabled }: FieldInputProps) {
  const { t } = useT();
  const options = parseFieldOptions(field);
  const current = typeof value === "string" ? value : "";
  const known = options.some((option) => option.value === current);

  return (
    <select
      className={fieldInputClass(false)}
      value={known ? current : ""}
      onChange={(event) => {
        onChange(event.target.value === "" ? null : event.target.value);
      }}
      disabled={disabled}
    >
      <option value="">{t("comun.selecciona")}</option>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
