import { Skeleton } from "@/components/ui/Skeleton";

export default function SettingsLoading() {
  return (
    <div className="space-y-6 max-w-3xl mx-auto w-full">
      <Skeleton className="h-8 w-32" />
      <Skeleton className="h-48 rounded-[var(--radius-panel)]" />
      <Skeleton className="h-64 rounded-[var(--radius-panel)]" />
    </div>
  );
}
