import clsx from "clsx";
import { Menu, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { useState, type ReactNode } from "react";

import type { CourseDetail } from "../lib/api/types";
import { ModuleTree } from "./ModuleTree";
import { Breadcrumbs, type Crumb } from "./ui/Breadcrumbs";
import { Button } from "./ui/Button";
import { GlassPanel } from "./ui/GlassPanel";

const SIDEBAR_STORAGE_KEY = "freetraining-sidebar";

type SidebarState = "open" | "collapsed";

function readStoredSidebarState(): SidebarState | null {
  try {
    const stored = localStorage.getItem(SIDEBAR_STORAGE_KEY);
    return stored === "open" || stored === "collapsed" ? stored : null;
  } catch {
    return null;
  }
}

function writeStoredSidebarState(state: SidebarState): void {
  try {
    localStorage.setItem(SIDEBAR_STORAGE_KEY, state);
  } catch {
    // приватный режим браузера — выбор просто не сохранится
  }
}

/**
 * Общая раскладка урока и теста: боковое дерево модулей слева (с
 * независимой прокруткой и сворачиванием на широком экране, выдвижной
 * панелью на узком) и хлебные крошки над содержимым.
 *
 * Строится из данных курса и не перерисовывается при смене активного урока
 * или теста внутри того же курса — только содержимое главной колонки
 * (`children`) переходит в состояние загрузки.
 */
export function CourseShell({
  course,
  courseId,
  activeLessonId,
  crumbs,
  aside,
  children,
}: {
  course?: CourseDetail;
  courseId: string;
  activeLessonId?: string;
  crumbs: Crumb[];
  aside?: ReactNode;
  children: ReactNode;
}) {
  const [sidebarState, setSidebarState] = useState<SidebarState>(
    () => readStoredSidebarState() ?? "open",
  );
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const collapsed = sidebarState === "collapsed";

  function setCollapsed(next: boolean) {
    const state: SidebarState = next ? "collapsed" : "open";
    setSidebarState(state);
    writeStoredSidebarState(state);
  }

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:gap-10" data-course-id={courseId}>
      {course ? (
        <GlassPanel
          className={clsx(
            "hidden shrink-0 self-start lg:sticky lg:top-20 lg:flex lg:flex-col",
            "lg:max-h-[calc(100vh-7rem)]",
            collapsed ? "lg:w-12 lg:items-center lg:p-2" : "lg:w-64 lg:p-4",
          )}
        >
          <div
            className={clsx(
              "flex shrink-0 items-center",
              collapsed ? "justify-center" : "justify-between gap-2",
            )}
          >
            {collapsed ? null : (
              <span className="text-xs font-semibold uppercase tracking-wide text-subtle">
                Содержание курса
              </span>
            )}
            <button
              type="button"
              aria-expanded={!collapsed}
              aria-label={
                collapsed ? "Показать содержание курса" : "Свернуть содержание курса"
              }
              title={collapsed ? "Показать содержание курса" : "Свернуть содержание курса"}
              onClick={() => setCollapsed(!collapsed)}
              className="inline-flex size-8 shrink-0 items-center justify-center
                rounded-control text-muted transition-colors duration-150
                hover:bg-sunken hover:text-body"
            >
              {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
            </button>
          </div>

          {collapsed ? null : (
            <div className="mt-2 min-h-0 flex-1 overflow-y-auto">
              <ModuleTree course={course} activeLessonId={activeLessonId} />
            </div>
          )}
        </GlassPanel>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Breadcrumbs items={crumbs} />
          {aside}
        </div>

        {course ? (
          <div className="lg:hidden">
            <Button
              variant="secondary"
              size="sm"
              aria-expanded={mobileNavOpen}
              onClick={() => setMobileNavOpen((value) => !value)}
            >
              <Menu size={16} />
              Содержание курса
            </Button>

            {mobileNavOpen ? (
              <GlassPanel className="mt-4 p-4">
                <ModuleTree course={course} activeLessonId={activeLessonId} />
              </GlassPanel>
            ) : null}
          </div>
        ) : null}

        {children}
      </div>
    </div>
  );
}
