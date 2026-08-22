import type { ComponentType } from "react";
import type { FieldType } from "../../../core/fields";
import type { FieldInputProps } from "./types";
import { BooleanField } from "./BooleanField";
import { DateField } from "./DateField";
import { DateTimeField } from "./DateTimeField";
import { EmailField } from "./EmailField";
import { FilePathField } from "./FilePathField";
import { ImageField } from "./ImageField";
import { LongTextArea } from "./LongTextArea";
import { MultiSelectField } from "./MultiSelectField";
import { NumberField } from "./NumberField";
import { PasswordField } from "./PasswordField";
import { SelectField } from "./SelectField";
import { TagsField } from "./TagsField";
import { TextField } from "./TextField";
import { UrlField } from "./UrlField";

/** Mapa fieldType -> componente de control. Extensible igual que el registro. */
const FIELD_RENDERER_MAP: Record<FieldType, ComponentType<FieldInputProps>> = {
  text: TextField,
  long_text: LongTextArea,
  number: NumberField,
  boolean: BooleanField,
  date: DateField,
  datetime: DateTimeField,
  url: UrlField,
  email: EmailField,
  password: PasswordField,
  select: SelectField,
  multiselect: MultiSelectField,
  tags: TagsField,
  file_path: FilePathField,
  image: ImageField,
};

const FALLBACK_RENDERER: ComponentType<FieldInputProps> = TextField;

/**
 * Resuelve el control de un tipo de campo; los tipos desconocidos (o añadidos
 * en runtime sin renderer propio) caen al control de texto plano.
 */
export function getFieldRenderer(type: string): ComponentType<FieldInputProps> {
  if (Object.prototype.hasOwnProperty.call(FIELD_RENDERER_MAP, type)) {
    return FIELD_RENDERER_MAP[type as FieldType];
  }
  return FALLBACK_RENDERER;
}
