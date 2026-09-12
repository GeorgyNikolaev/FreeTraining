import clsx from "clsx";
import type { ReactNode } from "react";

export function GlassPanel({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={clsx("glass rounded-panel border border-line", className)}>
      {children}
    </div>
  );
}
