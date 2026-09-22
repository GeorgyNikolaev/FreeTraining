import { isValidElement, type ComponentPropsWithoutRef, type ReactNode } from "react";
import "katex/dist/katex.min.css";
import rehypeHighlight from "rehype-highlight";
import rehypeKatex from "rehype-katex";
import ReactMarkdown, { type ExtraProps } from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";

import { MermaidDiagram } from "./MermaidDiagram";
import { CopyButton } from "./ui/CopyButton";

function isMermaidClassName(className: string | undefined): boolean {
  return /(^|\s)language-mermaid(\s|$)/.test(className ?? "");
}

/**
 * Собирает исходный текст блока кода.
 *
 * `String(children)` здесь не подходит: подсветка уже разобрала код на
 * вложенные `<span>` по токенам, и в буфер ушло бы `[object Object]`.
 * Поэтому дерево обходится целиком, а склеиваются только строки — они и есть
 * ровно тот текст, что был между тройными кавычками.
 */
function collectText(node: ReactNode): string {
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(collectText).join("");
  if (isValidElement(node)) {
    return collectText((node.props as { children?: ReactNode }).children);
  }
  return "";
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
 *
 * У блока кода сверху справа висит кнопка «Копировать». Она лежит рядом с
 * `<pre>`, а не внутри него: `<pre>` прокручивается по горизонтали, и
 * вложенная кнопка уезжала бы вместе с длинной строкой.
 */
function PreBlock({
  children,
  node: _node,
  ...props
}: ComponentPropsWithoutRef<"pre"> & ExtraProps) {
  const child = (Array.isArray(children) ? children[0] : children) as ReactNode;
  if (isValidElement(child)) {
    const childClassName = (child.props as { className?: string }).className;
    if (isMermaidClassName(childClassName)) {
      return <>{children}</>;
    }
  }
  return (
    <div className="code-block">
      <CopyButton text={collectText(children)} className="code-block-copy" />
      <pre {...props}>{children}</pre>
    </div>
  );
}

export function Markdown({ content }: { content: string }) {
  return (
    <div className="prose-lesson">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex, rehypeHighlight]}
        components={{ code: CodeBlock, pre: PreBlock }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
