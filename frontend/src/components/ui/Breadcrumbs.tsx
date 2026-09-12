import { ChevronRight } from "lucide-react";
import { Fragment } from "react";
import { Link } from "react-router";

export type Crumb = { label: string; to?: string };

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Хлебные крошки" className="flex flex-wrap items-center gap-1
      text-sm text-muted">
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <Fragment key={`${item.label}-${index}`}>
            {item.to && !isLast ? (
              <Link
                to={item.to}
                className="transition-colors duration-150 hover:text-body"
              >
                {item.label}
              </Link>
            ) : (
              <span className={isLast ? "text-body" : undefined}>{item.label}</span>
            )}
            {isLast ? null : (
              <ChevronRight size={14} className="text-subtle" aria-hidden="true" />
            )}
          </Fragment>
        );
      })}
    </nav>
  );
}
