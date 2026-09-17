import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router";

import { Button } from "../components/ui/Button";
import { Callout } from "../components/ui/Callout";
import { PasswordField } from "../components/ui/PasswordField";
import { TextField } from "../components/ui/TextField";
import { AuthCard, authLinkClass } from "../features/auth/AuthCard";
import { authPath, safeNext, useAuth } from "../lib/auth/AuthProvider";

const NAME_MAX = 50;
const PASSWORD_MIN = 8;
const PASSWORD_MAX = 128;

type Errors = Partial<Record<"name" | "email" | "password", string>>;

function validate(name: string, email: string, password: string): Errors {
  const errors: Errors = {};
  if (!name.trim()) errors.name = "Введите имя";
  else if (name.trim().length > NAME_MAX) errors.name = `Не длиннее ${NAME_MAX} символов`;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) errors.email = "Проверьте почту";
  if (password.length < PASSWORD_MIN) errors.password = `Не короче ${PASSWORD_MIN} символов`;
  else if (password.length > PASSWORD_MAX)
    errors.password = `Не длиннее ${PASSWORD_MAX} символов`;
  return errors;
}

export function RegisterPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const next = safeNext(searchParams.get("next"));

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  if (auth.status === "user" && !pending) return <Navigate to={next} replace />;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const found = validate(name, email, password);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setError(null);
    setPending(true);
    try {
      await auth.register({ name: name.trim(), email: email.trim(), password });
      navigate(next, { replace: true });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Не удалось зарегистрироваться");
      setPending(false);
    }
  }

  return (
    <AuthCard
      title="Регистрация"
      description="Прогресс, накопленный без входа, сразу перенесётся в аккаунт."
      footer={
        <>
          Уже есть аккаунт?{" "}
          <Link to={authPath("login", next)} className={authLinkClass}>
            Войти
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        {error ? (
          <Callout tone="danger" title="Не удалось зарегистрироваться">
            {error}
          </Callout>
        ) : null}
        <TextField
          label="Имя"
          name="name"
          autoComplete="name"
          hint="Видно в ваших отзывах"
          maxLength={NAME_MAX}
          value={name}
          error={errors.name}
          onChange={(event) => setName(event.target.value)}
          disabled={pending}
          autoFocus
        />
        <TextField
          label="Почта"
          type="email"
          name="email"
          autoComplete="email"
          value={email}
          error={errors.email}
          onChange={(event) => setEmail(event.target.value)}
          disabled={pending}
        />
        <PasswordField
          label="Пароль"
          name="password"
          autoComplete="new-password"
          hint={`Не короче ${PASSWORD_MIN} символов`}
          value={password}
          error={errors.password}
          onChange={(event) => setPassword(event.target.value)}
          disabled={pending}
        />
        <Button type="submit" size="lg" className="mt-2 w-full" disabled={pending}>
          {pending ? "Создаём аккаунт…" : "Зарегистрироваться"}
        </Button>
      </form>
    </AuthCard>
  );
}
