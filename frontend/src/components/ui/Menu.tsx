import clsx from "clsx";
import type { LucideIcon } from "lucide-react";
import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";

export type MenuItem = {
  id: string;
  label: string;
  icon?: LucideIcon;
  onSelect: () => void;
};

/**
 * Выпадающее меню: Escape и клик вне меню закрывают, стрелки переводят
 * фокус между пунктами.
 */
export function Menu({
  label,
  trigger,
  header,
  items,
}: {
  /** Подпись кнопки для экранного диктора. */
  label: string;
  trigger: ReactNode;
  /** Необязательный блок над пунктами, например имя и почта. */
  header?: ReactNode;
  items: MenuItem[];
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    itemRefs.current[0]?.focus();

    function handlePointer(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", handlePointer);
    return () => document.removeEventListener("pointerdown", handlePointer);
  }, [open]);

  function close() {
    setOpen(false);
    buttonRef.current?.focus();
  }

  function handleKeyDown(event: KeyboardEvent) {
    const focused = itemRefs.current.indexOf(document.activeElement as HTMLButtonElement);
    const count = items.length;
    if (event.key === "Escape") {
      event.preventDefault();
      close();
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      itemRefs.current[(focused + 1) % count]?.focus();
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      itemRefs.current[(focused - 1 + count) % count]?.focus();
    } else if (event.key === "Tab") {
      setOpen(false);
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((value) => !value)}
        className={clsx(
          "inline-flex h-9 items-center gap-2 rounded-control border border-line px-2",
          "text-sm font-medium text-body transition-colors duration-150",
          "hover:bg-sunken active:scale-[0.98]",
          open && "bg-sunken",
        )}
      >
        {trigger}
      </button>
      {open ? (
        <div
          id={menuId}
          role="menu"
          aria-label={label}
          onKeyDown={handleKeyDown}
          className="pop-in absolute right-0 z-50 mt-2 flex min-w-56 origin-top-right flex-col
            rounded-card border border-line bg-raised p-1 shadow-lift"
        >
          {header ? (
            <div className="border-b border-line px-3 pt-2 pb-3 mb-1">{header}</div>
          ) : null}
          {items.map((item, index) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                ref={(node) => {
                  itemRefs.current[index] = node;
                }}
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  item.onSelect();
                }}
                className="flex h-9 items-center gap-2 rounded-control px-3 text-left text-sm
                  text-body transition-colors duration-150 hover:bg-sunken focus-visible:bg-sunken"
              >
                {Icon ? <Icon size={16} className="text-muted" /> : null}
                {item.label}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
