import { Check, Copy } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "./Button";

/** Сколько кнопка держит подпись «Скопировано», прежде чем вернуться к обычной. */
const FEEDBACK_MS = 2000;

/**
 * Кладёт текст в буфер обмена, возвращая признак удачи.
 *
 * Основной путь — `navigator.clipboard`. Он есть не везде: страницу могут
 * открыть по http не с localhost, а разрешение на запись — отозвать. Тогда
 * работает старый приём с невидимым полем и `execCommand`: он объявлен
 * устаревшим, но поддерживается всеми браузерами и разрешения не требует.
 * Фокус после него возвращается кнопке, иначе он уходил бы на `body` и
 * человек с клавиатуры терял место в документе.
 */
async function writeToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // разрешения нет — пробуем запасной путь
  }

  const previouslyFocused = document.activeElement;
  const area = document.createElement("textarea");
  area.value = text;
  area.readOnly = true;
  area.style.position = "fixed";
  area.style.opacity = "0";
  document.body.append(area);
  try {
    area.select();
    return document.execCommand("copy");
  } catch {
    return false;
  } finally {
    area.remove();
    if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus();
  }
}

/**
 * Кнопка «Копировать»: кладёт переданный текст в буфер обмена и на пару
 * секунд меняет подпись на «Скопировано».
 *
 * Буфер обмена доступен не всегда — его нет под http на чужом домене и его
 * может запретить пользователь. Отказ не показывается как ошибка: подпись
 * просто не меняется, и человек видит, что копирования не произошло.
 */
export function CopyButton({ text, className }: { text: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  const resetTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(resetTimer.current), []);

  async function copy() {
    if (!(await writeToClipboard(text))) return;
    setCopied(true);
    clearTimeout(resetTimer.current);
    resetTimer.current = setTimeout(() => setCopied(false), FEEDBACK_MS);
  }

  return (
    <Button
      variant="secondary"
      size="sm"
      onClick={copy}
      aria-live="polite"
      className={className}
    >
      {copied ? (
        <Check size={14} className="shrink-0 text-success" aria-hidden />
      ) : (
        <Copy size={14} className="shrink-0 text-subtle" aria-hidden />
      )}
      {copied ? "Скопировано" : "Копировать"}
    </Button>
  );
}
