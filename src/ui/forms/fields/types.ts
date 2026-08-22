import type { Field } from "../../../core/fields";

/** Props que reciben todos los controles de campo. */
export interface FieldInputProps {
  field: Field;
  value: unknown;
  onChange: (value: unknown) => void;
  disabled?: boolean;
}

/** Props del <FieldRenderer>: añade el mensaje de error de validación. */
export interface FieldRendererProps extends FieldInputProps {
  error?: string | null;
}
