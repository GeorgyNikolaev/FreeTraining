import clsx from "clsx";
import { useId, type InputHTMLAttributes, type ReactNode } from "react";

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "size"> & {
  label: string;
  /** Подсказка под полем. Скрывается, когда показана ошибка. */
  hint?: string;
  error?: string | null;
  /** Элемент внутри поля справа, например кнопка «Показать пароль». */
  trailing?: ReactNode;
};

/** Однострочное поле с подписью, подсказкой и ошибкой. */
export function TextField({
  label,
  hint,
  error,
  trailing,
  className,
  id,
  ...rest
}: Props) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const noteId = `${fieldId}-note`;
  const note = error || hint;

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={fieldId} className="text-sm font-medium text-body">
        {label}
      </label>
      <div className="relative">
        <input
          id={fieldId}
          aria-invalid={error ? true : undefined}
          aria-describedby={note ? noteId : undefined}
          className={clsx(
            "h-10 w-full rounded-control border bg-raised px-3 text-sm text-body",
            "placeholder:text-subtle transition-colors duration-150",
            "disabled:pointer-events-none disabled:opacity-45",
            error ? "border-danger" : "border-line hover:border-line-strong",
            trailing ? "pr-10" : null,
            className,
          )}
          {...rest}
        />
        {trailing ? (
          <div className="absolute inset-y-0 right-1 flex items-center">{trailing}</div>
        ) : null}
      </div>
      {note ? (
        <span id={noteId} className={clsx("text-xs", error ? "text-danger" : "text-subtle")}>
          {note}
        </span>
      ) : null}
    </div>
  );
}
