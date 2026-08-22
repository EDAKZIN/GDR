import { createElement } from "react";
import { getFieldTypeHandler } from "../../../core/fields";
import { getFieldRenderer } from "./rendererMap";
import { visibleFieldDescription } from "./fieldStyles";
import type { FieldRendererProps } from "./types";

/**
 * Renderiza un campo dinámico completo: etiqueta, control (resuelto del
 * registro por fields.type), descripción opcional y error de validación.
 * No conoce secciones ni formularios concretos: solo definiciones de campo.
 */
export function FieldRenderer({ field, value, onChange, error, disabled }: FieldRendererProps) {
  const Renderer = getFieldRenderer(field.type);
  const handler = getFieldTypeHandler(field.type);
  const description = visibleFieldDescription(field);

  return (
    <div className="space-y-1">
      <label className="flex items-baseline gap-1 text-sm font-medium text-zinc-200">
        <span>
          {field.name}
          <span className="ml-1 text-[11px] font-normal text-zinc-500">({handler.label})</span>
        </span>
        {field.required ? <span className="text-rose-400">*</span> : null}
      </label>
      {createElement(Renderer, { field, value, onChange, disabled })}
      {description !== null ? (
        <p className="text-xs text-zinc-500">{description}</p>
      ) : null}
      {error !== undefined && error !== null ? (
        <p className="text-xs font-medium text-rose-400">{error}</p>
      ) : null}
    </div>
  );
}
