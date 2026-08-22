/**
 * Serialización de valores de campo: field_values.value guarda SIEMPRE el
 * valor serializado como JSON en texto. La forma concreta del JSON depende
 * del tipo de campo (number, boolean, string, arrays en multiselect/tags...).
 */

export function serializeFieldValue(value: unknown): string | null {
  if (value === undefined) {
    return null;
  }
  return JSON.stringify(value ?? null);
}

export function deserializeFieldValue(raw: string | null): unknown {
  if (raw === null) {
    return null;
  }
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    // Valor no-JSON legado o corrupto: se devuelve el texto crudo.
    return raw;
  }
}
