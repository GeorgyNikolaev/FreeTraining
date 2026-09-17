import { useEffect, useId, useRef, type ReactNode } from "react";

/**
 * Модальное окно на нативном <dialog>: фокус удерживается внутри, Escape
 * закрывает. Приподнятая поверхность и тень lift, стекло не используется.
 */
export function Dialog({
  open,
  onClose,
  title,
  children,
  actions,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children?: ReactNode;
  /** Кнопки внизу. Акцентной может быть только одна. */
  actions?: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      // jsdom не реализует showModal — тогда просто показываем окно
      if (typeof dialog.showModal === "function") dialog.showModal();
      else dialog.setAttribute("open", "");
    } else if (!open && dialog.open) {
      if (typeof dialog.close === "function") dialog.close();
      else dialog.removeAttribute("open");
    }
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      // Браузер может закрыть окно сам, минуя cancel (повторный Escape в Chrome)
      onClose={() => {
        if (open) onClose();
      }}
      className="dialog pop-in m-auto w-[calc(100%-32px)] max-w-md rounded-panel border
        border-line bg-raised p-0 text-body shadow-lift"
    >
      {open ? (
        <div className="flex flex-col gap-4 p-6">
          <h2 id={titleId} className="text-lg font-semibold tracking-tight">
            {title}
          </h2>
          {children ? <div className="text-sm text-muted">{children}</div> : null}
          {actions ? (
            <div className="mt-2 flex flex-wrap justify-end gap-3">{actions}</div>
          ) : null}
        </div>
      ) : null}
    </dialog>
  );
}
