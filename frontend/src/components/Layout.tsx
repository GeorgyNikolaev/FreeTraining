import { GraduationCap, Stethoscope } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router";

import { ThemeToggle } from "./ui/ThemeToggle";

export function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-surface text-body">
      <header
        role="banner"
        className="glass sticky top-0 z-50 border-b border-line"
      >
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-4 px-4">
          <Link
            to="/"
            className="inline-flex items-center gap-2 font-semibold tracking-tight
              transition-opacity duration-150 hover:opacity-80"
          >
            <GraduationCap size={20} className="text-accent" />
            FreeTraining
          </Link>
          <div className="flex items-center gap-2">
            <Link
              to="/health"
              title="Состояние содержимого"
              className="inline-flex size-9 items-center justify-center rounded-control
                border border-line text-muted transition-colors duration-150
                hover:bg-sunken hover:text-body"
            >
              <Stethoscope size={18} />
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
    </div>
  );
}
