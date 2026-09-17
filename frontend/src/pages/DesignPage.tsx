import { LogOut, Settings } from "lucide-react";
import { useState, type ReactNode } from "react";

import { Badge } from "../components/ui/Badge";
import { Breadcrumbs } from "../components/ui/Breadcrumbs";
import { Button } from "../components/ui/Button";
import { Callout } from "../components/ui/Callout";
import { Card, CardBody, CardTitle } from "../components/ui/Card";
import { Dialog } from "../components/ui/Dialog";
import { EmptyState } from "../components/ui/EmptyState";
import { GlassPanel } from "../components/ui/GlassPanel";
import { Menu } from "../components/ui/Menu";
import { PasswordField } from "../components/ui/PasswordField";
import { ProgressBar } from "../components/ui/ProgressBar";
import { ProgressRing } from "../components/ui/ProgressRing";
import { Skeleton } from "../components/ui/Skeleton";
import { StarRating, StarRatingInput } from "../components/ui/StarRating";
import { Tabs } from "../components/ui/Tabs";
import { TextArea } from "../components/ui/TextArea";
import { TextField } from "../components/ui/TextField";

const COLORS = [
  ["surface", "Фон страницы"],
  ["raised", "Приподнятая поверхность"],
  ["sunken", "Утопленная поверхность"],
  ["accent", "Акцент"],
  ["success", "Верно"],
  ["danger", "Неверно"],
  ["rating", "Звёзды оценки"],
  ["line", "Граница"],
] as const;

const SPACE = [4, 8, 12, 16, 24, 32, 48, 64];

const TEXT_SCALE = [
  "text-xs",
  "text-sm",
  "text-base",
  "text-lg",
  "text-xl",
  "text-2xl",
  "text-3xl",
] as const;

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-t border-line pt-8">
      <h2 className="mb-6 text-lg font-semibold tracking-tight">{title}</h2>
      {children}
    </section>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-4 py-3">
      <span className="w-40 shrink-0 text-sm text-muted">{label}</span>
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3">{children}</div>
    </div>
  );
}

export function DesignPage() {
  const [rating, setRating] = useState<number | null>(4);
  const [review, setReview] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <div className="flex flex-col gap-12">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Дизайн-система</h1>
        <p className="max-w-2xl text-sm text-muted">
          Всё оформление задано в одном файле — <code>src/styles/tokens.css</code>.
          Компоненты обращаются только к смысловым именам, поэтому смена темы или
          акцента не затрагивает их код. Правила словами — в{" "}
          <code>docs/design-system.md</code>.
        </p>
      </header>

      <Section title="Цвет">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {COLORS.map(([token, label]) => (
            <div key={token} className="flex flex-col gap-2">
              <div
                className="h-16 rounded-card border border-line"
                style={{ backgroundColor: `var(--${token})` }}
              />
              <div className="text-xs">
                <p className="font-medium">{label}</p>
                <p className="font-mono text-subtle">--{token}</p>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Типографика">
        <div className="flex flex-col gap-3">
          <p className="text-3xl font-semibold tracking-tight">Заголовок страницы</p>
          <p className="text-xl font-semibold tracking-tight">Заголовок раздела</p>
          <p className="text-base">Обычный текст интерфейса</p>
          <p className="text-reading max-w-prose">
            Текст урока набирается крупнее интерфейсного и с большим межстрочным
            интервалом: читать его приходится долго, и именно ради этого чтения
            платформа существует.
          </p>
          <p className="text-sm text-muted">Второстепенный текст</p>
          <p className="font-mono text-sm">const answer = 42;</p>
        </div>

        <div className="mt-6 flex flex-col gap-2 border-t border-line pt-6">
          {TEXT_SCALE.map((cls) => (
            <div key={cls} className="flex items-baseline gap-4">
              <span className="w-20 shrink-0 font-mono text-xs text-subtle">
                {cls}
              </span>
              <span className={cls}>Пример текста</span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Пространство">
        <div className="flex flex-wrap items-end gap-4">
          {SPACE.map((step) => (
            <div key={step} className="flex flex-col items-center gap-2">
              <div
                className="bg-accent-soft"
                style={{ width: step, height: step }}
              />
              <span className="font-mono text-xs text-subtle">{step}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Скругления и глубина">
        <div className="flex flex-wrap gap-4">
          <div className="flex h-20 w-32 items-center justify-center rounded-control
            border border-line bg-raised text-xs text-muted">
            control 10px
          </div>
          <div className="flex h-20 w-32 items-center justify-center rounded-card
            bg-raised text-xs text-muted shadow-soft">
            card 14px
          </div>
          <div className="flex h-20 w-32 items-center justify-center rounded-panel
            bg-raised text-xs text-muted shadow-lift">
            panel 20px
          </div>
        </div>
      </Section>

      <Section title="Стекло">
        <div className="relative overflow-hidden rounded-card">
          <div className="grid grid-cols-6">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="h-28 bg-accent-soft odd:bg-sunken" />
            ))}
          </div>
          <GlassPanel className="absolute inset-x-6 top-6 p-4 text-sm">
            Стекло применяется только к шапке, навигации урока и выдвижной панели.
            Под текстом урока его нет никогда.
          </GlassPanel>
        </div>
      </Section>

      <Section title="Компоненты">
        <div className="flex flex-col divide-y divide-line">
          <Row label="Кнопки">
            <Button>Основная</Button>
            <Button variant="secondary">Вторичная</Button>
            <Button variant="ghost">Прозрачная</Button>
            <Button variant="danger">Опасная</Button>
            <Button disabled>Заблокирована</Button>
          </Row>
          <Row label="Размеры кнопок">
            <Button size="sm">Маленькая</Button>
            <Button size="md">Средняя</Button>
            <Button size="lg">Большая</Button>
          </Row>
          <Row label="Метки">
            <Badge>Новичок</Badge>
            <Badge tone="accent">В процессе</Badge>
            <Badge tone="success">Пройден</Badge>
            <Badge tone="danger">Незачёт</Badge>
            <Badge tone="warning">Предупреждение</Badge>
          </Row>
          <Row label="Прогресс">
            <div className="w-56">
              <ProgressBar value={40} label="Пример прогресса" />
            </div>
            <ProgressRing value={40} />
            <ProgressRing value={100} />
          </Row>
          <Row label="Оценка">
            <StarRating value={4.3} count={12} />
            <StarRatingInput value={rating} onChange={setRating} />
            <StarRatingInput value={2} onChange={() => {}} disabled />
          </Row>
          <Row label="Поле текста">
            <div className="w-full max-w-md">
              <TextArea
                label="Отзыв"
                placeholder="Что понравилось, чего не хватило"
                maxLength={2000}
                value={review}
                onChange={(event) => setReview(event.target.value)}
              />
            </div>
          </Row>
          <Row label="Однострочное поле">
            <div className="grid w-full max-w-2xl gap-4 sm:grid-cols-2">
              <TextField label="Почта" type="email" placeholder="you@example.com" />
              <TextField label="Имя" hint="Видно в ваших отзывах" />
              <TextField label="Почта" defaultValue="не почта" error="Проверьте почту" />
              <TextField label="Заблокировано" defaultValue="Только чтение" disabled />
            </div>
          </Row>
          <Row label="Пароль">
            <div className="w-full max-w-xs">
              <PasswordField label="Пароль" hint="Не короче 8 символов" defaultValue="secret-pass" />
            </div>
          </Row>
          <Row label="Меню">
            <Menu
              label="Аккаунт"
              trigger={
                <>
                  <span
                    aria-hidden
                    className="inline-flex size-6 items-center justify-center rounded-full
                      bg-accent-soft text-xs font-semibold text-accent"
                  >
                    А
                  </span>
                  Анна
                </>
              }
              header={
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-body">Анна</span>
                  <span className="text-xs text-subtle">anna@example.com</span>
                </div>
              }
              items={[
                { id: "settings", label: "Настройки", icon: Settings, onSelect: () => {} },
                { id: "logout", label: "Выйти", icon: LogOut, onSelect: () => {} },
              ]}
            />
          </Row>
          <Row label="Диалог">
            <Button variant="secondary" onClick={() => setDialogOpen(true)}>
              Открыть диалог
            </Button>
            <Dialog
              open={dialogOpen}
              onClose={() => setDialogOpen(false)}
              title="Перенести прогресс в аккаунт?"
              actions={
                <>
                  <Button variant="secondary" onClick={() => setDialogOpen(false)}>
                    Не переносить
                  </Button>
                  <Button onClick={() => setDialogOpen(false)}>Перенести</Button>
                </>
              }
            >
              В диалоге одно акцентное действие, остальные кнопки вторичные. Escape
              закрывает окно.
            </Dialog>
          </Row>
          <Row label="Карточка">
            <Card className="w-72">
              <CardBody>
                <CardTitle>Основы Python</CardTitle>
                <p className="mt-2 text-sm text-muted">
                  Синтаксис, типы данных и функции с нуля.
                </p>
              </CardBody>
            </Card>
          </Row>
          <Row label="Выноски">
            <div className="flex w-full flex-col gap-3">
              <Callout title="Подсказка">Обычное пояснение</Callout>
              <Callout tone="success" title="Верно">
                Ответ засчитан
              </Callout>
              <Callout tone="danger" title="Неверно">
                Правильный ответ другой
              </Callout>
              <Callout tone="warning" title="Предупреждение">
                В уроке нет заголовка
              </Callout>
              <Callout
                tone="success"
                title="С действиями"
                actions={
                  <>
                    <Button variant="secondary" size="sm">
                      Оценить курс
                    </Button>
                    <Button variant="ghost" size="sm">
                      Не сейчас
                    </Button>
                  </>
                }
              >
                Кнопки под текстом только вторичные или прозрачные
              </Callout>
            </div>
          </Row>
          <Row label="Вкладки">
            <Tabs
              items={[
                { id: "modules", label: "Модули" },
                { id: "cheatsheet", label: "Шпаргалка" },
              ]}
              active="modules"
              onChange={() => {}}
            />
          </Row>
          <Row label="Хлебные крошки">
            <Breadcrumbs
              items={[
                { label: "Курсы", to: "/" },
                { label: "Основы Python", to: "/courses/python-basics" },
                { label: "Переменные" },
              ]}
            />
          </Row>
          <Row label="Заглушки загрузки">
            <div className="flex w-full flex-col gap-2">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-24 w-full" />
            </div>
          </Row>
          <Row label="Пустое состояние">
            <div className="w-full">
              <EmptyState
                title="Курсов пока нет"
                description="Положите папку с курсом в каталог content и обновите страницу."
                action={<Button variant="secondary">Как добавить курс</Button>}
              />
            </div>
          </Row>
        </div>
      </Section>
    </div>
  );
}
