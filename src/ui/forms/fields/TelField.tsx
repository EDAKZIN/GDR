import PhoneInput from "react-phone-number-input";
import "react-phone-number-input/style.css";
import type { FieldInputProps } from "./types";

export function TelField({ value, onChange, disabled }: FieldInputProps) {
  return (
    <PhoneInput
      international
      defaultCountry="PE"
      value={typeof value === "string" ? value : undefined}
      onChange={(next) => {
        onChange(next ?? null);
      }}
      disabled={disabled}
      placeholder="+51 999 888 777"
      className="gdr-phone-input"
    />
  );
}
