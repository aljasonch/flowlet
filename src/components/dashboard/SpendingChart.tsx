"use client";

import React, { useSyncExternalStore } from "react";
import { usePrivacyMode } from "@/lib/privacy";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { formatIDR } from "@/lib/format";

const emptySubscribe = () => () => {};

interface CategorySpend {
  category_id: string;
  name: string;
  total: number;
}

interface SpendingChartProps {
  data: CategorySpend[];
  hideNumbers?: boolean;
}

const PALETTE = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

export function SpendingChart({ data, hideNumbers: hideProp }: SpendingChartProps) {
  const privacy = usePrivacyMode();
  const hideNumbers = hideProp ?? privacy;
  const mounted = useSyncExternalStore(emptySubscribe, () => true, () => false);
  const totalExpense = data.reduce((sum, item) => sum + item.total, 0);

  if (data.length === 0 || totalExpense === 0) {
    return (
      <div className="glass p-5">
        <h3 className="text-base font-semibold text-[var(--text)]">
          Spending by category
        </h3>
        <div className="py-12 text-center text-sm text-[var(--text-muted)]">
          No expenses recorded in this period.
        </div>
      </div>
    );
  }

  // Format data for Recharts, sorted by total descending
  const chartData = data
    .filter((item) => item.total > 0)
    .sort((a, b) => b.total - a.total);

  return (
    <div className="glass p-5 flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-[var(--text)]">
            Spending by category
          </h3>
          <span className="text-xs text-[var(--text-muted)] num">
            {chartData.length} {chartData.length === 1 ? "category" : "categories"}
          </span>
        </div>

        <div className="h-48 w-full flex items-center justify-center">
          {!mounted ? (
            <div className="w-36 h-36 rounded-full skeleton-pulse border-8 border-black/5 dark:border-white/5" />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={2}
                  dataKey="total"
                  stroke="var(--glass-strong)"
                  strokeWidth={1}
                >
                  {chartData.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={PALETTE[index % PALETTE.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const item = payload[0].payload as CategorySpend;
                      const share = ((item.total / totalExpense) * 100).toFixed(1);
                      return (
                        <div className="glass-strong px-3 py-2 text-xs border border-[var(--glass-border)] rounded-[var(--radius-control)] shadow-md">
                          <p className="font-semibold text-[var(--text)]">
                            {item.name}
                          </p>
                          <p className="text-[var(--text-muted)] num mt-0.5">
                            {hideNumbers ? "••••••" : formatIDR(BigInt(item.total))} ({share}%)
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Category breakdown rows */}
      <div className="mt-4 pt-3 border-t border-[var(--glass-border)] space-y-2">
        {chartData.slice(0, 5).map((item, index) => {
          const share = ((item.total / totalExpense) * 100).toFixed(1);
          const color = PALETTE[index % PALETTE.length];
          return (
            <div
              key={item.category_id || index}
              className="flex items-center justify-between text-xs"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: color }}
                />
                <span className="text-[var(--text)] truncate">{item.name}</span>
              </div>
              <div className="flex items-center gap-3 shrink-0 num">
                <span className="text-[var(--text-muted)]">{share}%</span>
                <span className="font-medium text-[var(--text)]">
                  {hideNumbers ? "••••••" : formatIDR(BigInt(item.total))}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
