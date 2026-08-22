import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import type { FieldInputProps } from "./types";
import { fieldInputClass } from "./fieldStyles";

export function PasswordField({ value, onChange, disabled }: FieldInputProps) {
  const [visible, setVisible] = useState(false);
  const text = typeof value === "string" ? value : "";

  return (
    <div className="relative">
      <input
        type={visible ? "text" : "password"}
        className={`${fieldInputClass(false)} pr-10 font-mono`}
        value={text}
        onChange={(event) => {
          onChange(event.target.value === "" ? null : event.target.value);
        }}
        disabled={disabled}
        autoComplete="off"
      />
      <button
        type="button"
        className="absolute inset-y-0 right-0 flex items-center px-3 text-zinc-500 transition-colors hover:text-zinc-200"
        onClick={() => {
          setVisible((current) => !current);
        }}
        aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
        tabIndex={-1}
      >
        {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}
