import clsx from "clsx";

export type OptionState = "idle" | "correct" | "wrong" | "missed";

const STATES: Record<OptionState, string> = {
  idle: "border-line hover:bg-sunken",
  correct: "border-success bg-success-soft",
  wrong: "border-danger bg-danger-soft",
  missed: "border-success border-dashed",
};

export function AnswerOption({
  name,
  label,
  multiple,
  checked,
  disabled,
  state = "idle",
  onChange,
}: {
  name: string;
  label: string;
  multiple: boolean;
  checked: boolean;
  disabled?: boolean;
  state?: OptionState;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label
      className={clsx(
        "flex cursor-pointer items-start gap-3 rounded-control border p-3 text-sm",
        "transition-colors duration-150",
        disabled && "cursor-default",
        STATES[state],
      )}
    >
      <input
        type={multiple ? "checkbox" : "radio"}
        name={name}
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-0.5 size-4 shrink-0 accent-[var(--accent)] disabled:accent-[var(--text-subtle)]"
      />
      <span className="min-w-0">{label}</span>
    </label>
  );
}
