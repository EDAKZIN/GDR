import { create } from "zustand";

interface ToastState {
  message: string | null;
  show: (message: string) => void;
  hide: () => void;
}

/** Store mínimo para banners de éxito breves y autodescartables. */
export const useToastStore = create<ToastState>()((set) => ({
  message: null,
  show: (message) => {
    set({ message });
  },
  hide: () => {
    set({ message: null });
  },
}));

/** Muestra un aviso de éxito durante unos segundos. */
export function showToast(message: string): void {
  useToastStore.getState().show(message);
}

/** Oculta el aviso actual (lo llama el temporizador del host). */
export function hideToast(): void {
  useToastStore.getState().hide();
}
