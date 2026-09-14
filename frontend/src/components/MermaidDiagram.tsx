import { useEffect, useId, useState } from "react";

import { useTheme } from "../theme/ThemeProvider";
import { Callout } from "./ui/Callout";

/**
 * Отрисовывает схему Mermaid из исходного текста урока.
 *
 * Библиотека грузится динамическим импортом, чтобы не утяжелять первый
 * экран: она нужна только тем урокам, где вообще есть диаграммы. Схема
 * перестраивается при каждой смене темы приложения — у Mermaid нет
 * реактивной темы, поэтому единственный способ — заново вызвать `render`.
 */
export function MermaidDiagram({ code }: { code: string }) {
  const { theme } = useTheme();
  const reactId = useId().replace(/[^a-zA-Z0-9]/g, "");
  const [svg, setSvg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setSvg(null);
    setError(null);

    async function draw() {
      try {
        const { default: mermaid } = await import("mermaid");
        mermaid.initialize({
          startOnLoad: false,
          theme: theme === "dark" ? "dark" : "default",
        });
        const { svg: rendered } = await mermaid.render(
          `mermaid-${reactId}`,
          code,
        );
        if (!cancelled) {
          setSvg(rendered);
        }
      } catch (renderError) {
        if (!cancelled) {
          setError(
            renderError instanceof Error
              ? renderError.message
              : String(renderError),
          );
        }
      }
    }

    void draw();

    return () => {
      cancelled = true;
    };
  }, [code, reactId, theme]);

  if (error) {
    return (
      <div className="font-sans">
        <Callout tone="danger" title="Не удалось построить схему">
          {error}
        </Callout>
        <div className="mt-3 overflow-x-auto rounded-card border border-line bg-sunken p-4">
          <code className="whitespace-pre font-mono text-sm">{code}</code>
        </div>
      </div>
    );
  }

  if (!svg) {
    return (
      <div className="font-sans text-sm text-subtle">Схема строится…</div>
    );
  }

  return (
    <div className="font-sans">
      <div
        role="img"
        aria-label="Диаграмма, построенная из схемы Mermaid"
        className="mermaid-figure"
        dangerouslySetInnerHTML={{ __html: svg }}
      />
    </div>
  );
}
