import { useT } from "../../../i18n";
import type { FieldInputProps } from "./types";
import { fieldInputClass } from "./fieldStyles";

export function EmailField({ value, onChange, disabled }: FieldInputProps) {
  const { t } = useT();
  return (
    <input
      type="email"
      placeholder={t("campos.emailPlaceholder")}
      className={fieldInputClass(false)}
      value={typeof value === "string" ? value : ""}
      onChange={(event) => {
        onChange(event.target.value === "" ? null : event.target.value);
      }}
      disabled={disabled}
    />
  );
}
