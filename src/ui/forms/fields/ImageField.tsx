import { useState } from "react";
import { useT } from "../../../i18n";
import type { FieldInputProps } from "./types";
import { fieldInputClass } from "./fieldStyles";

export function ImageField({ field, value, onChange, disabled }: FieldInputProps) {
  const { t } = useT();
  const url = typeof value === "string" && value.trim() !== "" ? value.trim() : null;
  const [brokenUrl, setBrokenUrl] = useState<string | null>(null);

  // `brokenUrl` recuerda la última URL fallida; si la URL cambia se reintenta.
  const showPreview = url !== null && url !== brokenUrl;

  return (
    <div className="flex items-start gap-3">
      <input
        type="text"
        placeholder={t("campos.imagenPlaceholder")}
        className={fieldInputClass(false)}
        value={url ?? ""}
        onChange={(event) => {
          onChange(event.target.value === "" ? null : event.target.value);
        }}
        disabled={disabled}
      />
      {url !== null && showPreview ? (
        <img
          src={url}
          alt={field.name}
          className="h-16 w-16 shrink-0 rounded-md border border-zinc-700 object-cover"
          onError={() => {
            setBrokenUrl(url);
          }}
        />
      ) : null}
    </div>
  );
}
