import { isValidElement, type ComponentPropsWithoutRef, type ReactNode } from "react";
import rehypeHighlight from "rehype-highlight";
import ReactMarkdown, { type ExtraProps } from "react-markdown";
import remarkGfm from "remark-gfm";

import { MermaidDiagram } from "./MermaidDiagram";

function isMermaidClassName(className: string | undefined): boolean {
  return /(^|\s)language-mermaid(\s|$)/.test(className ?? "");
}

function CodeBlock({
  className,
  children,
  node: _node,
  ...props
}: ComponentPropsWithoutRef<"code"> & ExtraProps) {
  if (isMermaidClassName(className)) {
    return <MermaidDiagram code={String(children).replace(/\n$/, "")} />;
  }
  return (
    <code className={className} {...props}>
      {children}
    </code>
  );
}

/**
 * Обычный код всегда рисуется внутри `<pre>` — так его стилизует
 * `prose-lesson` (утопленный фон, рамка, скругление, прокрутка). Схеме
 * Mermaid этот блок не нужен: она не текст, а собственная разметка со
 * своим фоном и центрированием, и `<pre>` только мешает — навязывает
 * карточку кода и `white-space: pre`, из-за которого сообщение об ошибке
 * разбора не переносится по строкам. Поэтому для схемы `<pre>` не
 * рисуется вовсе — сразу отдаётся то, что вернул `CodeBlock`.
 */
function PreBlock({ children, ...props }: ComponentPropsWithoutRef<"pre"> & ExtraProps) {
  const child = (Array.isArray(children) ? children[0] : children) as ReactNode;
  if (isValidElement(child)) {
    const childClassName = (child.props as { className?: string }).className;
    if (isMermaidClassName(childClassName)) {
      return <>{children}</>;
    }
  }
  return <pre {...props}>{children}</pre>;
}

export function Markdown({ content }: { content: string }) {
  return (
    <div className="prose-lesson">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{ code: CodeBlock, pre: PreBlock }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
