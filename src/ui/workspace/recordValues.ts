import { getFieldTypeHandler } from "../../core/fields";
import type { Field } from "../../core/fields";
import { parseLocalYMD } from "../../core/utils/relativeTime";
import { translate } from "../../i18n";

/** Texto plano de un valor escalar; null si no tiene representación simple. */
export function scalarText(value: unknown): string | null {
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number") {
    return String(value);
  }
  if (typeof value === "boolean") {
    return value ? translate("comun.si") : translate("comun.no");
  }
  return null;
}

/** Texto completo de un valor (incluye listas) para búsqueda local. */
export function valueSearchText(value: unknown): string {
  if (Array.isArray(value)) {
    return value
      .map((item) => scalarText(item) ?? "")
      .filter((text) => text !== "")
      .join(" ");
  }
  return scalarText(value) ?? "";
}

/** Valor formateado para lectura: fechas localizadas, contraseña oculta, etc. */
export function formatValue(field: Field, value: unknown): string {
  if (field.type === "password") {
    return typeof value === "string" && value !== "" ? "••••••••" : "—";
  }
  if (value === null || value === undefined) {
    return "—";
  }
  if (Array.isArray(value)) {
    const parts = value
      .map(scalarText)
      .filter((part): part is string => part !== null);
    return parts.length > 0 ? parts.join(", ") : "—";
  }
  const text = scalarText(value);
  if (text === null) {
    // Objetos complejos sin representación plana.
    return "—";
  }
  if (field.type === "date" || field.type === "datetime") {
    if (field.type === "date") {
      const local = parseLocalYMD(text);
      if (local !== null) {
        return local.toLocaleDateString();
      }
    }
    const parsed = Date.parse(text);
    if (!Number.isNaN(parsed)) {
      return field.type === "date"
        ? new Date(parsed).toLocaleDateString()
        : new Date(parsed).toLocaleString();
    }
  }
  const handler = getFieldTypeHandler(field.type);
  return handler.isEmpty(value) ? "—" : text;
}
