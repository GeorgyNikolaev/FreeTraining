import clsx from "clsx";
import type { ReactNode } from "react";

export function Card({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={clsx(
        "rounded-card border border-line bg-raised shadow-soft",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function CardBody({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return <div className={clsx("p-6", className)}>{children}</div>;
}

export function CardTitle({ children }: { children: ReactNode }) {
  return (
    <h3 className="text-base font-semibold tracking-tight text-body">{children}</h3>
  );
}
