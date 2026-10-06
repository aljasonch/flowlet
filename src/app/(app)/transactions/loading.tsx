import { Skeleton } from "@/components/ui/Skeleton";

export default function TransactionsLoading() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto w-full">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-9 w-32" />
      </div>
      <Skeleton className="h-24 rounded-[var(--radius-panel)]" />
      <div className="space-y-2">
        <Skeleton className="h-16 rounded-[var(--radius-panel)]" />
        <Skeleton className="h-16 rounded-[var(--radius-panel)]" />
        <Skeleton className="h-16 rounded-[var(--radius-panel)]" />
        <Skeleton className="h-16 rounded-[var(--radius-panel)]" />
      </div>
    </div>
  );
}
