/**
 * Clases utilitarias compartidas para botones, inputs y modales.
 * Fuente única de la escala visual: primario sky sólido, secundario borde
 * zinc-700, peligro rojo fantasma. Nada de blanco puro como acento.
 */

export const btnPrimary =
  "inline-flex items-center justify-center gap-1.5 rounded-md bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-50";

export const btnPrimaryLg =
  "inline-flex items-center justify-center gap-2 rounded-md bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-sky-500";

/** Botón de peligro sólido (acciones destructivas de confirmación). */
export const btnDangerSolid = (danger: boolean): string =>
  `rounded-md px-3 py-1.5 text-xs font-semibold text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
    danger ? "bg-rose-600 hover:bg-rose-500" : "bg-sky-600 hover:bg-sky-500"
  }`;

export const btnSecondary =
  "inline-flex items-center justify-center gap-1.5 rounded-md border border-zinc-700 px-3 py-1.5 text-xs font-semibold text-zinc-300 transition-colors hover:border-zinc-600 hover:text-zinc-100 disabled:pointer-events-none disabled:opacity-50";

/** Acción destructiva fantasma (Eliminar en fichas/barras). */
export const btnDangerGhost =
  "inline-flex items-center justify-center gap-1.5 rounded-md border border-rose-500/40 text-rose-300 transition-colors hover:bg-rose-500/10";

export const btnIconGhost =
  "inline-flex shrink-0 items-center justify-center rounded-md p-2 text-zinc-400 transition-colors hover:bg-zinc-900 hover:text-zinc-100";

/** Botón icono pequeño sobre superficies claras del panel. */
export const btnIconSmall =
  "shrink-0 rounded-md p-1 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-100";

export const inputClass =
  "w-full rounded-md border border-zinc-700 bg-zinc-900 px-2.5 py-1.5 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-sky-400";

/** Backdrop + panel estándar para TODOS los modales. */
export const modalBackdrop =
  "fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4";

export const modalPanel =
  "flex w-full flex-col overflow-hidden rounded-xl border border-zinc-700 bg-zinc-900 shadow-2xl";

/** Cabecera y pie estándar de modal. */
export const modalHeader =
  "flex shrink-0 items-center justify-between gap-3 border-b border-zinc-800 px-5 py-3.5";

export const modalFooter =
  "flex shrink-0 items-center justify-end gap-2 border-t border-zinc-800 px-5 py-3.5";

/** Chip / badge neutro reutilizable (contadores, estados). */
export const chipNeutral =
  "inline-flex shrink-0 items-center rounded-full bg-zinc-800 px-2 py-0.5 text-[11px] font-medium tabular-nums text-zinc-400";

export const chipAccent =
  "inline-flex shrink-0 items-center rounded-full bg-sky-500/15 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-sky-300";
