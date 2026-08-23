import { getDb } from "../../database/client";
import { createFormsRepository } from "../../database/repositories";
import { useSectionStore } from "../../stores/useSectionStore";
import { useUiStore } from "../../stores/useUiStore";

const formsRepository = createFormsRepository(getDb);

/**
 * Abre una sección aplicando el flujo de «sección plana»: si la sección no
 * permite sub-secciones (allowChildren=false) y tiene exactamente UN
 * formulario habilitado, navega directo al workspace de ese formulario
 * (lista directa de registros); en cualquier otro caso entra a la sección,
 * que muestra sus pestañas/tabla según corresponda.
 */
export async function openSection(sectionId: string): Promise<void> {
  const ui = useUiStore.getState();
  const sectionStore = useSectionStore.getState();
  const section = sectionStore.sections.find(
    (candidate) => candidate.id === sectionId,
  );
  if (section !== undefined && !section.allowChildren) {
    try {
      const forms = await formsRepository.listBySection(sectionId);
      const enabled = forms.filter((form) => form.enabled);
      if (enabled.length === 1) {
        // Selecciona la sección primero para migas y contexto correctos.
        await sectionStore.selectSection(sectionId);
        ui.navigate("section", sectionId);
        ui.navigate("form", enabled[0].id);
        return;
      }
    } catch {
      // Ante cualquier fallo de carga se cae a la navegación normal.
    }
  }
  ui.navigate("section", sectionId);
}
