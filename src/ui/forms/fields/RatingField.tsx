import { useState } from "react";
import { Star } from "lucide-react";
import type { FieldInputProps } from "./types";

const MAX_RATING = 5;
const STEP = 0.25;

function clampRating(value: number): number {
  return Math.min(MAX_RATING, Math.max(0, Math.round(value / STEP) * STEP));
}

function toRating(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.min(MAX_RATING, Math.max(0, value))
    : null;
}

function StarFace({ fill, size }: { fill: number; size: string }) {
  return (
    <span aria-hidden className={`relative inline-block ${size}`}>
      <Star className={`absolute inset-0 ${size} text-zinc-700`} />
      <span className="absolute inset-0 overflow-hidden" style={{ width: `${String(fill * 100)}%` }}>
        <Star className={`${size} text-sky-400`} fill="currentColor" />
      </span>
    </span>
  );
}

export function RatingStars({ value, size = "h-6 w-6" }: { value: number | null; size?: string }) {
  const shown = value ?? 0;
  return (
    <span className="inline-flex items-center gap-0.5" aria-hidden>
      {Array.from({ length: MAX_RATING }, (_, index) => (
        <StarFace key={index} fill={Math.min(1, Math.max(0, shown - index))} size={size} />
      ))}
    </span>
  );
}

export function RatingField({ value, onChange, disabled }: FieldInputProps) {
  const current = toRating(value);
  const [preview, setPreview] = useState<number | null>(null);
  const shown = preview ?? current ?? 0;

  function commit(next: number): void {
    setPreview(null);
    onChange(next === 0 ? null : next);
  }

  function valueFromPointer(starIndex: number, clientX: number, element: HTMLElement): number {
    const rect = element.getBoundingClientRect();
    const fraction = rect.width > 0 ? (clientX - rect.left) / rect.width : 1;
    return clampRating(starIndex + Math.min(1, Math.max(0, fraction)));
  }

  return (
    <div className="flex items-center gap-2">
      <div
        role="slider"
        aria-label="Calificación de 0 a 5"
        aria-valuemin={0}
        aria-valuemax={MAX_RATING}
        aria-valuenow={current ?? 0}
        tabIndex={disabled === true ? -1 : 0}
        className="flex items-center gap-0.5 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60"
        onMouseLeave={() => {
          setPreview(null);
        }}
        onKeyDown={(event) => {
          if (disabled === true) return;
          const base = current ?? 0;
          if (event.key === "ArrowRight" || event.key === "ArrowUp") {
            event.preventDefault();
            commit(clampRating(base + STEP));
          } else if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
            event.preventDefault();
            commit(clampRating(base - STEP));
          } else if (event.key === "Home") {
            event.preventDefault();
            commit(0);
          } else if (event.key === "End") {
            event.preventDefault();
            commit(MAX_RATING);
          }
        }}
      >
        {Array.from({ length: MAX_RATING }, (_, index) => {
          const fill = Math.min(1, Math.max(0, shown - index));
          return (            <button
              key={index}
              type="button"
              tabIndex={-1}
              disabled={disabled}
              aria-label={`${String(index + 1)} de ${String(MAX_RATING)}`}
              className={`rounded p-0.5 transition-transform ${
                disabled === true ? "cursor-not-allowed opacity-60" : "cursor-pointer hover:scale-110"
              }`}
              onMouseMove={(event) => {
                if (disabled !== true) {
                  setPreview(valueFromPointer(index, event.clientX, event.currentTarget));
                }
              }}
              onClick={(event) => {
                if (disabled !== true) {
                  commit(valueFromPointer(index, event.clientX, event.currentTarget));
                }
              }}
            >
              <StarFace fill={fill} size="h-6 w-6" />
            </button>
          );
        })}
      </div>
      <span className="min-w-8 text-sm tabular-nums text-zinc-400">
        {current === null ? "—" : String(Math.round(current * 100) / 100)}
      </span>
    </div>
  );
}
