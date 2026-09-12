import { Link } from "react-router";

import { Button } from "../components/ui/Button";
import { EmptyState } from "../components/ui/EmptyState";

export function NotFoundPage() {
  return (
    <EmptyState
      title="Страница не найдена"
      description="Похоже, такого адреса здесь нет."
      action={
        <Link to="/">
          <Button variant="secondary">Вернуться к курсам</Button>
        </Link>
      }
    />
  );
}
