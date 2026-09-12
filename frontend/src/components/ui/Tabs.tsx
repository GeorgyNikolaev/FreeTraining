import clsx from "clsx";

export type TabItem = { id: string; label: string };

export function Tabs({
  items,
  active,
  onChange,
}: {
  items: TabItem[];
  active: string;
  onChange: (id: string) => void;
}) {
  return (
    <div role="tablist" className="flex gap-1 border-b border-line">
      {items.map((item) => {
        const selected = item.id === active;
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(item.id)}
            className={clsx(
              "-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors duration-150",
              selected
                ? "border-accent text-body"
                : "border-transparent text-muted hover:text-body",
            )}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
