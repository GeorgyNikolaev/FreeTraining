import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router";

import { Button } from "../components/ui/Button";
import { Callout } from "../components/ui/Callout";
import { PasswordField } from "../components/ui/PasswordField";
import { TextField } from "../components/ui/TextField";
import { AuthCard, authLinkClass } from "../features/auth/AuthCard";
import { authPath, safeNext, useAuth } from "../lib/auth/AuthProvider";

export function LoginPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const next = safeNext(searchParams.get("next"));

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  if (auth.status === "user" && !pending) return <Navigate to={next} replace />;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!email.trim() || !password) {
      setError("Введите почту и пароль");
      return;
    }
    setError(null);
    setPending(true);
    try {
      await auth.login({ email, password });
      navigate(next, { replace: true });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Не удалось войти");
      setPending(false);
    }
  }

  return (
    <AuthCard
      title="Вход"
      description="Прогресс, накопленный без входа, не пропадёт: после входа мы спросим, перенести ли его в аккаунт."
      footer={
        <>
          Нет аккаунта?{" "}
          <Link to={authPath("register", next)} className={authLinkClass}>
            Зарегистрироваться
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        {error ? (
          <Callout tone="danger" title="Не удалось войти">
            {error}
          </Callout>
        ) : null}
        <TextField
          label="Почта"
          type="email"
          name="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          disabled={pending}
          autoFocus
        />
        <PasswordField
          label="Пароль"
          name="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          disabled={pending}
        />
        <Button type="submit" size="lg" className="mt-2 w-full" disabled={pending}>
          {pending ? "Входим…" : "Войти"}
        </Button>
      </form>
    </AuthCard>
  );
}
