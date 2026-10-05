import { Skeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-5xl mx-auto w-full">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-9 w-28" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Skeleton className="h-28 rounded-[var(--radius-panel)]" />
        <Skeleton className="h-28 rounded-[var(--radius-panel)]" />
        <Skeleton className="h-28 rounded-[var(--radius-panel)]" />
      </div>
      <Skeleton className="h-64 rounded-[var(--radius-panel)]" />
    </div>
  );
}
