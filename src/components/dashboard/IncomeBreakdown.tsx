"use client";

import React from "react";
import { usePrivacyMode } from "@/lib/privacy";
import { formatIDR } from "@/lib/format";

interface IncomeSourceItem {
  source_id: string;
  name: string;
  total: number;
}

interface IncomeBreakdownProps {
  data: IncomeSourceItem[];
  hideNumbers?: boolean;
}

export function IncomeBreakdown({
  data,
  hideNumbers: hideProp,
}: IncomeBreakdownProps) {
  const privacy = usePrivacyMode();
  const hideNumbers = hideProp ?? privacy;
  const totalIncome = data.reduce((sum, item) => sum + item.total, 0);

  if (data.length === 0 || totalIncome === 0) {
    return (
      <div className="glass p-5">
        <h3 className="text-base font-semibold text-[var(--text)]">
          Income by source
        </h3>
        <div className="py-12 text-center text-sm text-[var(--text-muted)]">
          No income recorded in this period.
        </div>
      </div>
    );
  }

  const sortedData = [...data]
    .filter((item) => item.total > 0)
    .sort((a, b) => b.total - a.total);

  return (
    <div className="glass p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-[var(--text)]">
          Income by source
        </h3>
        <span className="text-xs text-[var(--text-muted)] num">
          {sortedData.length} {sortedData.length === 1 ? "source" : "sources"}
        </span>
      </div>

      <div className="divide-y divide-[var(--glass-border)]">
        {sortedData.map((item) => {
          const share = ((item.total / totalIncome) * 100).toFixed(1);
          const percentVal = Math.min(100, Math.max(0, (item.total / totalIncome) * 100));

          return (
            <div key={item.source_id} className="py-3 first:pt-0 last:pb-0">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="font-medium text-[var(--text)] truncate">
                  {item.name}
                </span>
                <div className="flex items-center gap-3 shrink-0 num">
                  <span className="text-[var(--text-muted)]">{share}%</span>
                  <span className="font-semibold text-[var(--text)]">
                    {hideNumbers ? "••••••" : formatIDR(BigInt(item.total))}
                  </span>
                </div>
              </div>

              {/* Flat bar track */}
              <div className="h-1.5 w-full bg-black/5 dark:bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[var(--chart-1)] rounded-full transition-all duration-[var(--dur-base)]"
                  style={{ width: `${percentVal}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
