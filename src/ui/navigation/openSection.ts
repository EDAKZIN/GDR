import { useUiStore } from "../../stores/useUiStore";

/**
 * Abre una sección en la navegación. La pantalla destino se decide según
 * allowChildren: las secciones planas muestran su vista unificada de
 * registros directamente (un solo nivel, el formulario homónimo es invisible)
 * y las jerárquicas su panel de formularios y subsecciones.
 */
export function openSection(sectionId: string): void {
  useUiStore.getState().navigate("section", sectionId);
}
