import type { FieldType } from "../../core/fields";
import { stringifyFieldOptions } from "../../core/fields";
import { translate } from "../../i18n";

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

/**
 * Construye las plantillas con textos traducidos al idioma activo.
 * Es una función (no una constante) para que cada lectura use el diccionario
 * vigente; los nombres de campo se materializan en la base de datos al crear.
 */
export function getFormTemplates(): readonly FormTemplate[] {
  return [
    {
      id: "empty",
      label: translate("plantillas.vacia.label"),
      hint: translate("plantillas.vacia.hint"),
      fields: [],
    },
    {
      id: "accounts",
      label: translate("plantillas.cuentas.label"),
      hint: translate("plantillas.cuentas.hint"),
      fields: [
        { name: translate("plantillas.cuentas.campoTitulo"), type: "text", required: true },
        { name: translate("plantillas.cuentas.campoUsuario"), type: "text" },
        { name: translate("plantillas.cuentas.campoContrasena"), type: "password" },
        { name: translate("plantillas.cuentas.campoNotas"), type: "long_text" },
      ],
    },
    {
      id: "tool",
      label: translate("plantillas.herramienta.label"),
      hint: translate("plantillas.herramienta.hint"),
      fields: [
        { name: translate("plantillas.herramienta.campoNombre"), type: "text", required: true },
        { name: translate("plantillas.herramienta.campoUrl"), type: "url" },
        { name: translate("plantillas.herramienta.campoDescripcion"), type: "long_text" },
        { name: translate("plantillas.herramienta.campoInstalado"), type: "boolean" },
      ],
    },
    {
      id: "idea",
      label: translate("plantillas.idea.label"),
      hint: translate("plantillas.idea.hint"),
      fields: [
        { name: translate("plantillas.idea.campoTitulo"), type: "text", required: true },
        { name: translate("plantillas.idea.campoDescripcion"), type: "long_text" },
        {
          name: translate("plantillas.idea.campoEstado"),
          type: "select",
          options: [
            translate("plantillas.idea.estadoPendiente"),
            translate("plantillas.idea.estadoEnCurso"),
            translate("plantillas.idea.estadoHecho"),
          ],
        },
      ],
    },
  ];
}
