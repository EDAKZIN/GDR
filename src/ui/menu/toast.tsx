import { useEffect } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import { hideToast, useToastStore } from "./toastStore";

const TOAST_MS = 3000;

/** Host global del toast; se monta una vez en la raíz de la app. */
export function ToastHost() {
  const message = useToastStore((store) => store.message);
  const tone = useToastStore((store) => store.tone);

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
      className={`pointer-events-none fixed bottom-4 right-4 z-[70] flex max-w-sm items-center gap-2 rounded-lg border px-4 py-2.5 text-xs font-medium shadow-2xl ${
        tone === "error"
          ? "border-rose-500/40 bg-zinc-900/95 text-rose-200"
          : "border-sky-500/40 bg-zinc-900/95 text-sky-200"
      }`}
    >
      {tone === "error" ? (
        <XCircle className="h-4 w-4 shrink-0 text-rose-400" />
      ) : (
        <CheckCircle2 className="h-4 w-4 shrink-0 text-sky-400" />
      )}
      {message}
    </div>
  );
}
