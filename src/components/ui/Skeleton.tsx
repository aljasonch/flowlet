import React from "react";

export type SkeletonProps = React.HTMLAttributes<HTMLDivElement>;

export function Skeleton({ className = "", ...props }: SkeletonProps) {
  return (
    <div
      className={`skeleton-pulse rounded-[var(--radius-control)] bg-neutral-300/40 dark:bg-neutral-700/40 ${className}`}
      {...props}
    />
  );
}
