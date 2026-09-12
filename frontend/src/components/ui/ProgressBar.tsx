export function ProgressBar({ value, label }: { value: number; label?: string }) {
  const clamped = Math.max(0, Math.min(100, Math.round(value)));

  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      className="h-1.5 w-full overflow-hidden rounded-full bg-sunken"
    >
      <div
        className="h-full rounded-full bg-accent transition-[width] duration-[250ms]"
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
