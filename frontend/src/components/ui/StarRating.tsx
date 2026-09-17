import clsx from "clsx";
import { Star } from "lucide-react";
import { useRef, useState, type KeyboardEvent } from "react";

const STARS = [1, 2, 3, 4, 5] as const;

export function formatRating(value: number): string {
  return value.toLocaleString("ru-RU", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
}

/** Показ оценки: пять звёзд с частичной заливкой по среднему. */
export function StarRating({
  value,
  count,
  size = 16,
}: {
  value: number;
  count?: number;
  size?: number;
}) {
  const label =
    count === undefined
      ? `Оценка ${formatRating(value)} из 5`
      : `Оценка ${formatRating(value)} из 5, оценок: ${count}`;

  return (
    <span role="img" aria-label={label} className="inline-flex items-center gap-2">
      <span className="inline-flex gap-0.5" aria-hidden>
        {STARS.map((star) => {
          const fill = Math.max(0, Math.min(1, value - star + 1));
          return (
            <span key={star} className="relative inline-flex">
              <Star size={size} className="text-line-strong" />
              <span
                className="absolute inset-y-0 left-0 overflow-hidden"
                style={{ width: `${fill * 100}%` }}
              >
                <Star size={size} className="fill-rating text-rating" />
              </span>
            </span>
          );
        })}
      </span>
      <span className="text-sm font-medium text-body" aria-hidden>
        {formatRating(value)}
        {count === undefined ? null : <span className="text-muted"> · {count}</span>}
      </span>
    </span>
  );
}

/** Ввод оценки: радиогруппа из пяти звёзд, выбор мышью и стрелками. */
export function StarRatingInput({
  value,
  onChange,
  disabled = false,
  label = "Оценка",
}: {
  value: number | null;
  onChange: (value: number) => void;
  disabled?: boolean;
  label?: string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const shown = hover ?? value ?? 0;
  const focusable = value ?? 1;

  function select(next: number) {
    const clamped = Math.max(1, Math.min(5, next));
    onChange(clamped);
    refs.current[clamped - 1]?.focus();
  }

  function handleKey(event: KeyboardEvent<HTMLButtonElement>, star: number) {
    if (event.key === "ArrowRight" || event.key === "ArrowUp") {
      event.preventDefault();
      select(star + 1);
    } else if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
      event.preventDefault();
      select(star - 1);
    }
  }

  return (
    <div
      role="radiogroup"
      aria-label={label}
      aria-disabled={disabled || undefined}
      className={clsx("inline-flex gap-1", disabled && "pointer-events-none opacity-45")}
      onMouseLeave={() => setHover(null)}
    >
      {STARS.map((star) => (
        <button
          key={star}
          ref={(node) => {
            refs.current[star - 1] = node;
          }}
          type="button"
          role="radio"
          aria-checked={value === star}
          aria-label={`${star} из 5`}
          tabIndex={star === focusable ? 0 : -1}
          disabled={disabled}
          onClick={() => select(star)}
          onMouseEnter={() => setHover(star)}
          onKeyDown={(event) => handleKey(event, star)}
          className="rounded-control p-1 transition-transform duration-150
            hover:scale-110 active:scale-95"
        >
          <Star
            size={24}
            className={clsx(
              "transition-colors duration-150",
              star <= shown ? "fill-rating text-rating" : "text-line-strong",
            )}
          />
        </button>
      ))}
    </div>
  );
}
