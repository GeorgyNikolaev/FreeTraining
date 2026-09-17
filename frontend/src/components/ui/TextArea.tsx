import clsx from "clsx";
import { useId, type TextareaHTMLAttributes } from "react";

type Props = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string;
  maxLength?: number;
};

/** Многострочное поле с подписью и счётчиком символов при заданном maxLength. */
export function TextArea({ label, maxLength, value, className, id, ...rest }: Props) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const length = typeof value === "string" ? value.length : 0;

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={fieldId} className="text-sm font-medium text-body">
        {label}
      </label>
      <textarea
        id={fieldId}
        value={value}
        maxLength={maxLength}
        className={clsx(
          "min-h-28 w-full resize-y rounded-control border border-line bg-raised",
          "px-3 py-2 text-sm text-body placeholder:text-subtle",
          "transition-colors duration-150 hover:border-line-strong",
          "disabled:pointer-events-none disabled:opacity-45",
          className,
        )}
        {...rest}
      />
      {maxLength === undefined ? null : (
        <span className="self-end text-xs text-subtle">
          {length} / {maxLength}
        </span>
      )}
    </div>
  );
}
