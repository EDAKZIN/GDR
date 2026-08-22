import { z } from "zod";
import type { Field, FieldType } from "./models";

/**
 * CONVENCIÓN para opciones de select / multiselect / tags:
 *
 * La migración 0001 no contempla columna para opciones y se decidió NO alterar
 * el esquema. Las opciones se serializan como JSON dentro de `fields.description`
 * con el prefijo documentado "options:", por ejemplo:
 *
 *   'options:[{"value":"alta","label":"Alta"},{"value":"baja","label":"Baja"}]'
 *
 * Se acepta también la forma abreviada de strings simples:
 *
 *   'options:["rojo","verde"]'
 *
 * El texto previo al prefijo (si existe) sigue siendo descripción legible:
 *   'Prioridad del asunto. options:["alta","media","baja"]'
 *
 * Los helpers parseFieldOptions/stringifyFieldOptions son la única vía de
 * acceso a las opciones: ningún otro módulo debe leerlas a mano.
 */

export interface FieldOption {
  value: string;
  label: string;
}

export const FIELD_OPTIONS_PREFIX = "options:";

export interface FieldTypeHandler {
  /** Etiqueta legible del tipo (español). */
  label: string;
  /** True si el valor cuenta como vacío (para validar required). */
  isEmpty(value: unknown): boolean;
  /**
   * Validación de formato/rango para un valor NO vacío.
   * Devuelve un mensaje de error o null si es válido.
   */
  validate(value: unknown, field: Field): string | null;
}

export function stringifyFieldOptions(options: FieldOption[]): string {
  return `${FIELD_OPTIONS_PREFIX}${JSON.stringify(options)}`;
}

/** Extrae las opciones embebidas en la descripción; [] si no hay o son inválidas. */
export function parseFieldOptions(field: Pick<Field, "description">): FieldOption[] {
  const description = field.description ?? "";
  const marker = description.indexOf(FIELD_OPTIONS_PREFIX);
  if (marker === -1) {
    return [];
  }
  const raw = description.slice(marker + FIELD_OPTIONS_PREFIX.length).trim();
  if (raw === "") {
    return [];
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) {
    return [];
  }
  const options: FieldOption[] = [];
  for (const item of parsed) {
    if (typeof item === "string") {
      if (item.trim() !== "") {
        options.push({ value: item, label: item });
      }
      continue;
    }
    const option = z
      .object({ value: z.string().min(1), label: z.string().min(1) })
      .safeParse(item);
    if (option.success) {
      options.push(option.data);
    }
  }
  return options;
}

/** Indica si el texto de descripción lleva opciones embebidas. */
export function hasEmbeddedOptions(field: Pick<Field, "description">): boolean {
  return (field.description ?? "").includes(FIELD_OPTIONS_PREFIX);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim() !== "";
}

function stringType(
  label: string,
  validateText?: (text: string) => string | null,
): FieldTypeHandler {
  return {
    label,
    isEmpty: (value) => !isNonEmptyString(value),
    validate: (value, _field) => {
      if (!isNonEmptyString(value)) {
        return `El valor de «${label}» no es válido.`;
      }
      return validateText ? validateText(value) : null;
    },
  };
}

const textHandler = stringType("Texto");

const longTextHandler = stringType("Texto largo");

const urlHandler = stringType("URL", (text) =>
  z.url().safeParse(text).success ? null : "Debe ser una URL válida.",
);

const emailHandler = stringType("Email", (text) =>
  z.email().safeParse(text).success ? null : "Debe ser un email válido.",
);

const passwordHandler = stringType("Contraseña");

const filePathHandler = stringType("Ruta de archivo");

const imageHandler = stringType("Imagen", (text) =>
  /^(https?:\/\/|\/|\.?[\\/])/.test(text.trim())
    ? null
    : "Debe ser una URL o ruta de imagen válida.",
);

const numberHandler: FieldTypeHandler = {
  label: "Número",
  isEmpty: (value) => !(typeof value === "number" && Number.isFinite(value)),
  validate: (value, _field) =>
    typeof value === "number" && Number.isFinite(value)
      ? null
      : "Debe ser un número válido.",
};

const booleanHandler: FieldTypeHandler = {
  label: "Sí/No",
  isEmpty: () => false,
  validate: (value, _field) =>
    typeof value === "boolean" ? null : "Debe ser verdadero o falso.",
};

const dateHandler = stringType("Fecha", (text) =>
  /^\d{4}-\d{2}-\d{2}$/.test(text.trim()) && !Number.isNaN(Date.parse(text))
    ? null
    : "Debe ser una fecha válida (AAAA-MM-DD).",
);

const datetimeHandler = stringType("Fecha y hora", (text) =>
  !Number.isNaN(Date.parse(text))
    ? null
    : "Debe ser una fecha y hora válidas.",
);

const selectHandler: FieldTypeHandler = {
  label: "Selección",
  isEmpty: (value) => !isNonEmptyString(value),
  validate: (value, field) => {
    if (!isNonEmptyString(value)) {
      return "Selecciona una opción válida.";
    }
    const options = parseFieldOptions(field);
    if (options.length > 0 && !options.some((option) => option.value === value)) {
      return "El valor no está entre las opciones definidas.";
    }
    return null;
  },
};

const multiselectHandler: FieldTypeHandler = {
  label: "Selección múltiple",
  isEmpty: (value) => !(Array.isArray(value) && value.length > 0),
  validate: (value, field) => {
    if (!Array.isArray(value) || !value.every((item) => typeof item === "string")) {
      return "Debe ser una lista de valores.";
    }
    const options = parseFieldOptions(field);
    if (
      options.length > 0 &&
      !value.every((item) => options.some((option) => option.value === item))
    ) {
      return "Hay valores que no están entre las opciones definidas.";
    }
    return null;
  },
};

const tagsHandler: FieldTypeHandler = {
  label: "Etiquetas",
  isEmpty: (value) => !(Array.isArray(value) && value.length > 0),
  validate: (value, _field) =>
    Array.isArray(value) && value.every((item) => typeof item === "string")
      ? null
      : "Las etiquetas deben ser una lista de textos.",
};

/**
 * Registro extensible de tipos de campo, indexado por el identificador
 * guardado en fields.type. Para añadir un tipo nuevo basta con ampliar
 * FIELD_TYPES en models.ts y añadir su entrada aquí (o registrarla en
 * tiempo de ejecución con registerFieldType).
 */
export const FIELD_TYPE_REGISTRY: Record<FieldType, FieldTypeHandler> = {
  text: textHandler,
  long_text: longTextHandler,
  number: numberHandler,
  boolean: booleanHandler,
  date: dateHandler,
  datetime: datetimeHandler,
  url: urlHandler,
  email: emailHandler,
  password: passwordHandler,
  select: selectHandler,
  multiselect: multiselectHandler,
  tags: tagsHandler,
  file_path: filePathHandler,
  image: imageHandler,
};

const runtimeHandlers = new Map<string, FieldTypeHandler>();

/** Registra (o sustituye) un tipo de campo en tiempo de ejecución. */
export function registerFieldType(type: string, handler: FieldTypeHandler): void {
  runtimeHandlers.set(type, handler);
}

/** Resuelve el handler de un tipo; los tipos desconocidos caen a texto plano. */
export function getFieldTypeHandler(type: string): FieldTypeHandler {
  const runtime = runtimeHandlers.get(type);
  if (runtime !== undefined) {
    return runtime;
  }
  if (Object.prototype.hasOwnProperty.call(FIELD_TYPE_REGISTRY, type)) {
    return FIELD_TYPE_REGISTRY[type as FieldType];
  }
  return textHandler;
}

/**
 * Validación completa de un valor de campo: required + validación por tipo.
 * Devuelve un mensaje de error o null.
 */
export function validateFieldValue(field: Field, value: unknown): string | null {
  const handler = getFieldTypeHandler(field.type);
  if (field.required && handler.isEmpty(value)) {
    return "Este campo es obligatorio.";
  }
  if (handler.isEmpty(value)) {
    return null;
  }
  return handler.validate(value, field);
}
