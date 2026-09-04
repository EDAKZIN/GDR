import PhoneInput, { parsePhoneNumber } from "react-phone-number-input";
import "react-phone-number-input/style.css";
import { useState } from "react";
import { Check, Copy } from "lucide-react";
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

export function TelDisplay({ value, lang }: { value: string; lang: string }) {
  const [copied, setCopied] = useState(false);
  let formatted = value;
  let countryName: string | null = null;
  try {
    const phone = parsePhoneNumber(value);
    if (phone !== undefined) {
      formatted = phone.formatInternational();
      if (phone.country !== undefined) {
        countryName =
          new Intl.DisplayNames([lang === "es" ? "es" : "en"], { type: "region" }).of(
            phone.country,
          ) ?? null;
      }
    }
  } catch {
    formatted = value;
  }
  return (
    <span className="flex min-w-0 flex-wrap items-center gap-1.5">
      <a
        href={`tel:${value.replace(/\s/gu, "")}`}
        className="break-all text-sm text-sky-300 underline decoration-sky-500/40 underline-offset-2 hover:decoration-sky-300"
      >
        {formatted}
      </a>
      {countryName !== null ? (
        <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[11px] text-zinc-400">
          {countryName}
        </span>
      ) : null}
      <button
        type="button"
        aria-label="Copiar"
        className="shrink-0 rounded-md p-1 text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-100"
        onClick={() => {
          void navigator.clipboard.writeText(value).then(() => {
            setCopied(true);
            window.setTimeout(() => {
              setCopied(false);
            }, 1500);
          });
        }}
      >
        {copied ? <Check className="h-3.5 w-3.5 text-sky-300" /> : <Copy className="h-3.5 w-3.5" />}
      </button>
    </span>
  );
}
