import type { ReactNode } from "react";

import { LoadingState } from "@/components/ui/loading-spinner";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/states";

interface AsyncSectionProps<T> {
  isLoading: boolean;
  isError: boolean;
  data: T | undefined;
  onRetry?: () => void;
  skeleton?: ReactNode;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: ReactNode;
  isEmpty?: (data: T) => boolean;
  errorTitle?: string;
  children: (data: T) => ReactNode;
}

/**
 * Single place where loading / skeleton / error / empty states are handled,
 * so no candidate page ever renders blank.
 */
export function AsyncSection<T>({
  isLoading,
  isError,
  data,
  onRetry,
  skeleton,
  emptyTitle = "Nothing here yet",
  emptyDescription,
  emptyAction,
  isEmpty,
  errorTitle = "We couldn't load this",
  children,
}: AsyncSectionProps<T>) {
  if (isLoading) {
    return <>{skeleton ?? <LoadingState />}</>;
  }

  if (isError || data === undefined || data === null) {
    return (
      <ErrorState
        title={errorTitle}
        description="Something went wrong fetching this section. Retry in a moment."
        onRetry={onRetry}
      />
    );
  }

  if (isEmpty?.(data)) {
    return <EmptyState title={emptyTitle} description={emptyDescription} action={emptyAction} />;
  }

  return <>{children(data)}</>;
}

export function CardGridSkeleton({
  count = 4,
  height = "h-40",
}: {
  count?: number;
  height?: string;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: count }).map((_, index) => (
        <Skeleton key={index} className={`w-full rounded-2xl ${height}`} />
      ))}
    </div>
  );
}

export function ListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, index) => (
        <Skeleton key={index} className="h-24 w-full rounded-2xl" />
      ))}
    </div>
  );
}

export function StatsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: count }).map((_, index) => (
        <Skeleton key={index} className="h-28 w-full rounded-2xl" />
      ))}
    </div>
  );
}
