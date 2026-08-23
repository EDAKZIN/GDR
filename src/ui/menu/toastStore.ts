import { create } from "zustand";

export type ToastTone = "ok" | "error";

interface ToastState {
  message: string | null;
  tone: ToastTone;
  show: (message: string, tone?: ToastTone) => void;
  hide: () => void;
}

/** Store mínimo para banners breves y autodescartables (éxito o error). */
export const useToastStore = create<ToastState>()((set) => ({
  message: null,
  tone: "ok",
  show: (message, tone = "ok") => {
    set({ message, tone });
  },
  hide: () => {
    set({ message: null });
  },
}));

/** Muestra un aviso de éxito durante unos segundos. */
export function showToast(message: string): void {
  useToastStore.getState().show(message);
}

/** Muestra un aviso de error (acciones bloqueadas) durante unos segundos. */
export function showErrorToast(message: string): void {
  useToastStore.getState().show(message, "error");
}

/** Oculta el aviso actual (lo llama el temporizador del host). */
export function hideToast(): void {
  useToastStore.getState().hide();
}
