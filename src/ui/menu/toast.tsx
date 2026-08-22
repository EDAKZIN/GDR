import { useEffect } from "react";
import { CheckCircle2 } from "lucide-react";
import { hideToast, useToastStore } from "./toastStore";

const TOAST_MS = 3000;

/** Host global del toast; se monta una vez en la raíz de la app. */
export function ToastHost() {
  const message = useToastStore((store) => store.message);

  useEffect(() => {
    if (message === null) {
      return;
    }
    const timer = window.setTimeout(hideToast, TOAST_MS);
    return () => {
      window.clearTimeout(timer);
    };
  }, [message]);

  if (message === null) {
    return null;
  }

  return (
    <div
      role="status"
      className="pointer-events-none fixed bottom-4 right-4 z-[70] flex items-center gap-2 rounded-lg border border-sky-500/40 bg-zinc-900/95 px-4 py-2.5 text-xs font-medium text-sky-200 shadow-2xl"
    >
      <CheckCircle2 className="h-4 w-4 shrink-0 text-sky-400" />
      {message}
    </div>
  );
}
