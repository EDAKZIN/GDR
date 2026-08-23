/**
 * Utilidades de tiempo relativo y localización para mostrar marcas temporales
 * de forma legible («hace 2 h») junto a la fecha completa en el tooltip.
 */

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** Diferencia legible entre una marca ISO y ahora; «ahora mismo» si es reciente. */
export function formatRelativeTime(isoTimestamp: string): string {
  const parsed = Date.parse(isoTimestamp);
  if (Number.isNaN(parsed)) {
    return isoTimestamp;
  }
  const elapsed = Date.now() - parsed;
  if (elapsed < MINUTE) {
    return "ahora mismo";
  }
  if (elapsed < HOUR) {
    const minutes = Math.floor(elapsed / MINUTE);
    return minutes === 1 ? "hace 1 min" : `hace ${String(minutes)} min`;
  }
  if (elapsed < DAY) {
    const hours = Math.floor(elapsed / HOUR);
    return hours === 1 ? "hace 1 h" : `hace ${String(hours)} h`;
  }
  if (elapsed < 7 * DAY) {
    const days = Math.floor(elapsed / DAY);
    return days === 1 ? "hace 1 día" : `hace ${String(days)} días`;
  }
  return new Date(parsed).toLocaleDateString();
}

/** Fecha localizada para lectura en fichas. */
export function formatLocalizedDate(value: string): string {
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) {
    return value;
  }
  return new Date(parsed).toLocaleDateString();
}

/** Fecha y hora localizadas para lectura en fichas. */
export function formatLocalizedDateTime(value: string): string {
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) {
    return value;
  }
  return new Date(parsed).toLocaleString();
}
