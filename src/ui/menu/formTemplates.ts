import type { FieldType } from "../../core/fields";
import { stringifyFieldOptions } from "../../core/fields";

/** Especificación de un campo precargado por una plantilla. */
export interface TemplateFieldSpec {
  name: string;
  type: FieldType;
  required?: boolean;
  /** Valores para select/multiselect/tags. */
  options?: readonly string[];
}

/**
 * Plantillas fijas (no bloqueantes): crean el formulario Y sus campos de golpe.
 * Los campos siguen siendo editables después en la pestaña Plantilla.
 */
export interface FormTemplate {
  id: string;
  label: string;
  hint: string;
  fields: readonly TemplateFieldSpec[];
}

/** Descripción serializada con opciones embebidas «options:[…]» para selects. */
export function templateFieldDescription(spec: TemplateFieldSpec): string | null {
  if (spec.options === undefined || spec.options.length === 0) {
    return null;
  }
  return stringifyFieldOptions(
    spec.options.map((value) => ({ value, label: value })),
  );
}

export const FORM_TEMPLATES: readonly FormTemplate[] = [
  {
    id: "empty",
    label: "Vacía",
    hint: "Empieza sin campos",
    fields: [],
  },
  {
    id: "accounts",
    label: "Cuentas",
    hint: "Título · Usuario · Contraseña · Notas",
    fields: [
      { name: "Título", type: "text", required: true },
      { name: "Usuario/Cuenta", type: "text" },
      { name: "Contraseña", type: "password" },
      { name: "Notas", type: "long_text" },
    ],
  },
  {
    id: "tool",
    label: "Herramienta",
    hint: "Nombre · URL · Descripción · Instalado",
    fields: [
      { name: "Nombre", type: "text", required: true },
      { name: "URL", type: "url" },
      { name: "Descripción", type: "long_text" },
      { name: "Instalado", type: "boolean" },
    ],
  },
  {
    id: "idea",
    label: "Idea",
    hint: "Título · Descripción · Estado",
    fields: [
      { name: "Título", type: "text", required: true },
      { name: "Descripción", type: "long_text" },
      {
        name: "Estado",
        type: "select",
        options: ["Pendiente", "En curso", "Hecho"],
      },
    ],
  },
];
