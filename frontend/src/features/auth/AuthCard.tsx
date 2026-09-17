import type { ReactNode } from "react";

import { Card, CardBody } from "../../components/ui/Card";

/** Каркас страниц входа и регистрации: узкая карточка по центру. */
export function AuthCard({
  title,
  description,
  footer,
  children,
}: {
  title: string;
  description?: string;
  footer: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto flex w-full max-w-sm flex-col gap-6 py-8">
      <header className="flex flex-col gap-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description ? <p className="text-sm text-muted">{description}</p> : null}
      </header>
      <Card>
        <CardBody>{children}</CardBody>
      </Card>
      <p className="text-center text-sm text-muted">{footer}</p>
    </div>
  );
}

export const authLinkClass =
  "font-medium text-accent transition-colors duration-150 hover:text-accent-hover";
