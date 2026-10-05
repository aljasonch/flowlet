"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import {
  formatPeriodRange,
  formatPeriodMonth,
  getAdjacentPeriod,
  periodStart,
  periodEnd,
} from "@/lib/period";

interface PeriodSelectorProps {
  year: number;
  month: number;
  monthStartDay: number;
  currentPeriodYear: number;
  currentPeriodMonth: number;
}

export function PeriodSelector({
  year,
  month,
  monthStartDay,
  currentPeriodYear,
  currentPeriodMonth,
}: PeriodSelectorProps) {
  const router = useRouter();

  const isCurrentPeriod =
    year === currentPeriodYear && month === currentPeriodMonth;

  const start = periodStart(year, month, monthStartDay);
  const end = periodEnd(year, month, monthStartDay);
  const rangeLabel = formatPeriodRange(start, end);
  const monthLabel = formatPeriodMonth(year, month);

  const navigateTo = (y: number, m: number) => {
    const formattedMonth = `${y}-${String(m).padStart(2, "0")}`;
    router.push(`/?month=${formattedMonth}`);
  };

  const handlePrevious = () => {
    const prev = getAdjacentPeriod(year, month, -1);
    navigateTo(prev.year, prev.month);
  };

  const handleNext = () => {
    const next = getAdjacentPeriod(year, month, 1);
    navigateTo(next.year, next.month);
  };

  const handleCurrent = () => {
    navigateTo(currentPeriodYear, currentPeriodMonth);
  };

  return (
    <div className="glass p-3 sm:p-4 flex items-center justify-between gap-3">
      {/* Left: Previous Button */}
      <button
        type="button"
        onClick={handlePrevious}
        aria-label="Previous period"
        className="p-2 rounded-full glass border border-[var(--glass-border)] text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-black/5 dark:hover:bg-white/5 active:scale-95 transition-all duration-[var(--dur-fast)] shrink-0"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>

      {/* Center: Month & Date Range Info */}
      <div className="text-center flex-1 min-w-0">
        <h2 className="text-base sm:text-lg font-bold text-[var(--text)] leading-tight truncate">
          {monthLabel}
        </h2>
        <p className="text-xs text-[var(--text-muted)] num mt-0.5 truncate">
          {rangeLabel}
        </p>
        {!isCurrentPeriod && (
          <button
            type="button"
            onClick={handleCurrent}
            className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-[var(--accent)] hover:underline focus:outline-none"
          >
            <Calendar className="w-3 h-3" />
            Current period
          </button>
        )}
      </div>

      {/* Right: Next Button */}
      <button
        type="button"
        onClick={handleNext}
        aria-label="Next period"
        className="p-2 rounded-full glass border border-[var(--glass-border)] text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-black/5 dark:hover:bg-white/5 active:scale-95 transition-all duration-[var(--dur-fast)] shrink-0"
      >
        <ChevronRight className="w-5 h-5" />
      </button>
    </div>
  );
}
