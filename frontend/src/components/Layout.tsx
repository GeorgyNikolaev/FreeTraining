import { GraduationCap, LogIn, LogOut, Stethoscope } from "lucide-react";
import type { ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router";

import { authPath, useAuth } from "../lib/auth/AuthProvider";
import { Button } from "./ui/Button";
import { Menu } from "./ui/Menu";
import { ThemeToggle } from "./ui/ThemeToggle";

function AccountControl() {
  const auth = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  if (auth.status === "loading") return null;

  if (auth.status === "guest") {
    // На страницах входа и регистрации кнопка «Войти» в шапке лишняя
    if (["/login", "/register"].includes(location.pathname)) return null;
    const next = location.pathname + location.search;
    return (
      <Link to={authPath("login", next)} tabIndex={-1}>
        <Button variant="secondary" size="sm" className="h-9">
          <LogIn size={16} />
          Войти
        </Button>
      </Link>
    );
  }

  const { user } = auth;
  return (
    <Menu
      label="Аккаунт"
      trigger={
        <>
          <span
            aria-hidden
            className="inline-flex size-6 items-center justify-center rounded-full bg-accent-soft
              text-xs font-semibold text-accent"
          >
            {user.name.charAt(0).toUpperCase()}
          </span>
          <span className="hidden max-w-40 truncate sm:inline">{user.name}</span>
        </>
      }
      header={
        <div className="flex min-w-0 flex-col">
          <span className="truncate text-sm font-medium text-body">{user.name}</span>
          <span className="truncate text-xs text-subtle">{user.email}</span>
        </div>
      }
      items={[
        {
          id: "logout",
          label: "Выйти",
          icon: LogOut,
          onSelect: () => {
            void auth.logout().finally(() => navigate("/"));
          },
        },
      ]}
    />
  );
}

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
            <AccountControl />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
    </div>
  );
}
