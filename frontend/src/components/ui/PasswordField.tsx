import { Eye, EyeOff } from "lucide-react";
import { useState, type ComponentProps } from "react";

import { TextField } from "./TextField";

type Props = Omit<ComponentProps<typeof TextField>, "type" | "trailing">;

/** Поле пароля с кнопкой «Показать пароль». */
export function PasswordField({ disabled, ...rest }: Props) {
  const [visible, setVisible] = useState(false);
  const label = visible ? "Скрыть пароль" : "Показать пароль";

  return (
    <TextField
      {...rest}
      disabled={disabled}
      type={visible ? "text" : "password"}
      trailing={
        <button
          type="button"
          onClick={() => setVisible((value) => !value)}
          aria-label={label}
          title={label}
          aria-pressed={visible}
          disabled={disabled}
          className="inline-flex size-8 items-center justify-center rounded-control text-subtle
            transition-colors duration-150 hover:bg-sunken hover:text-body active:scale-95
            disabled:pointer-events-none disabled:opacity-45"
        >
          {visible ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      }
    />
  );
}
