/**
 * Utilidades de tiempo relativo y localización para mostrar marcas temporales
 * de forma legible («hace 2 h») junto a la fecha completa en el tooltip.
 */
import { translate } from "../../i18n";

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
    return translate("tiempo.ahoraMismo");
  }
  if (elapsed < HOUR) {
    const minutes = Math.floor(elapsed / MINUTE);
    return minutes === 1
      ? translate("tiempo.haceUnMinuto")
      : translate("tiempo.haceMinutos", { n: minutes });
  }
  if (elapsed < DAY) {
    const hours = Math.floor(elapsed / HOUR);
    return hours === 1
      ? translate("tiempo.haceUnaHora")
      : translate("tiempo.haceHoras", { n: hours });
  }
  if (elapsed < 7 * DAY) {
    const days = Math.floor(elapsed / DAY);
    return days === 1
      ? translate("tiempo.haceUnDia")
      : translate("tiempo.haceDias", { n: days });
  }
  return new Date(parsed).toLocaleDateString();
}

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

export function parseLocalYMD(value: string): Date | null {
  const match = DATE_ONLY.exec(value.trim());
  if (match === null) {
    return null;
  }
  const [, year, month, day] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Fecha localizada para lectura en fichas. */
export function formatLocalizedDate(value: string): string {
  const local = parseLocalYMD(value);
  if (local !== null) {
    return local.toLocaleDateString();
  }
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
