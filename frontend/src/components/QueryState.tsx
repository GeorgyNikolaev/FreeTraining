import type { ReactNode } from "react";

import type { ApiError } from "../lib/api/client";
import { Callout } from "./ui/Callout";
import { Skeleton } from "./ui/Skeleton";

export function QueryState({
  isLoading,
  error,
  children,
}: {
  isLoading: boolean;
  error: ApiError | null;
  children: ReactNode;
}) {
  if (isLoading) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-6 w-1/3" />
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <Callout tone="danger" title="Не удалось загрузить данные">
        {error.message}
      </Callout>
    );
  }

  return <>{children}</>;
}
