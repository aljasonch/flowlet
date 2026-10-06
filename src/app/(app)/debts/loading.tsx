import { Skeleton } from "@/components/ui/Skeleton";

export default function DebtsLoading() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto w-full">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-44" />
        <Skeleton className="h-9 w-32" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Skeleton className="h-24 rounded-[var(--radius-panel)]" />
        <Skeleton className="h-24 rounded-[var(--radius-panel)]" />
      </div>
      <Skeleton className="h-64 rounded-[var(--radius-panel)]" />
    </div>
  );
}
