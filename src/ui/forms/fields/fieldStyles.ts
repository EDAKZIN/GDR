import type { Field } from "../../../core/fields";
import { hasEmbeddedOptions } from "../../../core/fields";

export const FIELD_INPUT_CLASS =
  "w-full rounded-md border bg-zinc-900 px-3 py-2 text-sm text-zinc-100 " +
  "placeholder-zinc-500 shadow-inner outline-none transition-colors " +
  "focus:border-sky-400 focus:ring-1 focus:ring-sky-400/40 disabled:cursor-not-allowed disabled:opacity-50";

export function fieldInputClass(hasError?: boolean): string {
  return `${FIELD_INPUT_CLASS} ${hasError ? "border-rose-500/70" : "border-zinc-700"}`;
}

/**
 * Descripción legible del campo: en select/multiselect/tags la descripción
 * puede llevar opciones embebidas (ver core/fields/registry) y no se muestra.
 */
export function visibleFieldDescription(field: Field): string | null {
  if (!hasEmbeddedOptions(field) && field.description !== null) {
    return field.description;
  }
  return null;
}
