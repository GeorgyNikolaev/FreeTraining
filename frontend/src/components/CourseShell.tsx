import clsx from "clsx";
import { Menu, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { useId, useState, type ReactNode } from "react";

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
 *
 * Дерево модулей не размонтируется, когда панель закрыта: иначе закрытие
 * было бы мгновенным — анимировать нечего, если элемента в разметке уже
 * нет. Вместо этого закрытое дерево прячется от доступности (`aria-hidden`
 * и `inert`), поэтому для скринридера и для тестов оно, как и раньше,
 * отсутствует, а глазу достаётся плавный переход.
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
  const mobileNavId = useId();

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
            "sidebar-panel hidden shrink-0 self-start overflow-hidden",
            "lg:sticky lg:top-20 lg:flex lg:flex-col",
            // Свёрнутая панель — квадрат по размеру кнопки: 32 пикселя кнопки
            // и по 8 полей. Высоту задаёт именно предел, а не содержимое:
            // дерево остаётся в разметке ради анимации и иначе растянуло бы
            // панель на весь экран.
            collapsed
              ? "lg:w-12 lg:p-2 lg:max-h-12"
              : "lg:w-64 lg:p-4 lg:max-h-[calc(100vh-7rem)]",
          )}
        >
          {/* Зазор между подписью и кнопкой убирается вместе с подписью:
              в свёрнутом виде он остался бы единственным содержимым строки
              и сдвинул бы кнопку вправо за край панели. */}
          <div
            className={clsx(
              "sidebar-head flex shrink-0 items-center",
              collapsed ? "gap-0" : "gap-2",
            )}
          >
            {/* Подпись не снимается, а гаснет и обрезается вместе с панелью:
                так она уезжает заодно с деревом, а не исчезает рывком. */}
            <span
              aria-hidden={collapsed}
              className={clsx(
                "min-w-0 flex-1 overflow-hidden whitespace-nowrap",
                "text-xs font-semibold uppercase tracking-wide text-subtle",
                "transition-opacity duration-150",
                collapsed && "opacity-0",
              )}
            >
              Содержание курса
            </span>
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

          {/* Ширина дерева постоянная (панель минус поля в раскрытом виде) —
              иначе на каждом кадре сжатия оно перевёрстывалось бы заново.
              Сжатие по высоте при этом разрешено: в колоночном флексе им
              заведует `shrink`, и с `shrink-0` дерево не влезало бы в панель
              и прокручивалось не внутри себя, а обрезалось бы ею. */}
          <div
            aria-hidden={collapsed}
            inert={collapsed}
            className={clsx(
              "mt-2 min-h-0 w-56 flex-1",
              "transition-opacity duration-(--duration-panel)",
              collapsed
                ? "pointer-events-none overflow-hidden opacity-0"
                : "overflow-y-auto opacity-100",
            )}
          >
            <ModuleTree course={course} activeLessonId={activeLessonId} />
          </div>
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
              aria-controls={mobileNavId}
              onClick={() => setMobileNavOpen((value) => !value)}
            >
              <Menu size={16} />
              Содержание курса
            </Button>

            {/* Высота панели заранее неизвестна, поэтому раскрытие едет по
                строке грид-контейнера: от 0fr к 1fr. */}
            <div className="collapsible" data-open={mobileNavOpen}>
              <div id={mobileNavId} aria-hidden={!mobileNavOpen} inert={!mobileNavOpen}>
                <GlassPanel className="mt-4 p-4">
                  <ModuleTree course={course} activeLessonId={activeLessonId} />
                </GlassPanel>
              </div>
            </div>
          </div>
        ) : null}

        {children}
      </div>
    </div>
  );
}
