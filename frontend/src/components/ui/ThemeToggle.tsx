import { Moon, Sun } from "lucide-react";

import { useTheme } from "../../theme/ThemeProvider";

export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const label = theme === "light" ? "Включить тёмную тему" : "Включить светлую тему";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      title={label}
      className="inline-flex size-9 items-center justify-center rounded-control border border-line
        text-muted transition-colors duration-150 hover:bg-sunken hover:text-body
        active:scale-95 focus-visible:text-body"
    >
      {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
    </button>
  );
}
