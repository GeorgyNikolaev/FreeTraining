import { QueryState } from "../components/QueryState";
import { Callout } from "../components/ui/Callout";
import { Card, CardBody } from "../components/ui/Card";
import { useContentHealth } from "../lib/api/queries";
import type { ContentErrorOut } from "../lib/api/types";

function IssueList({ items }: { items: ContentErrorOut[] }) {
  return (
    <ul className="flex flex-col divide-y divide-line">
      {items.map((item, index) => (
        <li key={index} className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0">
          <p className="font-mono text-xs text-subtle">
            <span>{item.course_id}</span> / <span>{item.location}</span>
          </p>
          <p className="text-sm">{item.message}</p>
        </li>
      ))}
    </ul>
  );
}

export function HealthPage() {
  const { data, isLoading, error } = useContentHealth();

  return (
    <QueryState isLoading={isLoading} error={error}>
      {data ? (
        <div className="flex flex-col gap-6">
          <header className="flex flex-col gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">
              Состояние содержимого
            </h1>
            <p className="text-sm text-muted">
              Курсов прочитано: {data.course_count}. Здесь видно, что мешает курсу
              попасть в каталог. Формат описан в docs/course-format.md.
            </p>
          </header>

          {data.ok ? (
            <Callout tone="success" title="Все курсы читаются">
              Ошибок в файлах курсов нет.
            </Callout>
          ) : (
            <section className="flex flex-col gap-3">
              <h2 className="text-lg font-semibold tracking-tight">Ошибки</h2>
              <Card>
                <CardBody>
                  <IssueList items={data.errors} />
                </CardBody>
              </Card>
            </section>
          )}

          {data.warnings.length > 0 ? (
            <section className="flex flex-col gap-3">
              <h2 className="text-lg font-semibold tracking-tight">Предупреждения</h2>
              <Card>
                <CardBody>
                  <IssueList items={data.warnings} />
                </CardBody>
              </Card>
            </section>
          ) : null}
        </div>
      ) : null}
    </QueryState>
  );
}
