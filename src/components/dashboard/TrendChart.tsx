"use client";

import React, { useSyncExternalStore } from "react";
import { usePrivacyMode } from "@/lib/privacy";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { formatIDR } from "@/lib/format";

const emptySubscribe = () => () => {};

interface MonthTrendItem {
  year: number;
  month: number;
  total_income: number;
  total_expense: number;
}

interface TrendChartProps {
  data: MonthTrendItem[];
  hideNumbers?: boolean;
}

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

function formatCompactIDR(value: number): string {
  if (value >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(1)}B`;
  }
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(0)}k`;
  }
  return String(value);
}

export function TrendChart({ data, hideNumbers: hideProp }: TrendChartProps) {
  const privacy = usePrivacyMode();
  const hideNumbers = hideProp ?? privacy;
  const mounted = useSyncExternalStore(emptySubscribe, () => true, () => false);

  const formattedData = data.map((item) => ({
    ...item,
    label: `${MONTH_NAMES[item.month - 1]} ${item.year % 100}`,
  }));

  const hasActivity = data.some(
    (item) => item.total_income > 0 || item.total_expense > 0
  );

  return (
    <div className="glass p-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
        <div>
          <h3 className="text-base font-semibold text-[var(--text)]">
            6-month trend
          </h3>
          <p className="text-xs text-[var(--text-muted)]">
            Monthly income vs expenses
          </p>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-xs bg-[var(--chart-1)]" />
            <span className="text-[var(--text)]">Income</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-xs bg-[var(--chart-2)]" />
            <span className="text-[var(--text)]">Expenses</span>
          </div>
        </div>
      </div>

      {!hasActivity ? (
        <div className="py-16 text-center text-sm text-[var(--text-muted)]">
          No historical activity to display for the past 6 months.
        </div>
      ) : (
        <div className="h-60 w-full">
          {!mounted ? (
            <div className="h-full w-full skeleton-pulse rounded-[var(--radius-control)] bg-black/5 dark:bg-white/5" />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={formattedData}
                margin={{ top: 10, right: 10, left: -15, bottom: 0 }}
              >
                <CartesianGrid
                  stroke="var(--glass-border)"
                  strokeDasharray="2 2"
                  vertical={false}
                />
                <XAxis
                  dataKey="label"
                  stroke="var(--text-muted)"
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: "var(--glass-border)" }}
                />
                <YAxis
                  stroke="var(--text-muted)"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={hideNumbers ? () => "" : formatCompactIDR}
                />
                <Tooltip
                  cursor={{ fill: "rgba(0, 0, 0, 0.04)" }}
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const inc = payload.find((p) => p.dataKey === "total_income")?.value as number ?? 0;
                      const exp = payload.find((p) => p.dataKey === "total_expense")?.value as number ?? 0;
                      const net = inc - exp;

                      return (
                        <div className="glass-strong p-3 text-xs border border-[var(--glass-border)] rounded-[var(--radius-control)] shadow-md space-y-1.5">
                          <p className="font-semibold text-[var(--text)] border-b border-[var(--glass-border)] pb-1">
                            {label}
                          </p>
                          <div className="flex items-center justify-between gap-4">
                            <span className="text-[var(--text-muted)]">Income:</span>
                            <span className="font-medium text-[var(--text)] num">
                              {hideNumbers ? "Rp ••••••" : formatIDR(BigInt(inc))}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-4">
                            <span className="text-[var(--text-muted)]">Expenses:</span>
                            <span className="font-medium text-[var(--text)] num">
                              {hideNumbers ? "Rp ••••••" : formatIDR(BigInt(exp))}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-4 pt-1 border-t border-[var(--glass-border)]">
                            <span className="text-[var(--text-muted)]">Net:</span>
                            <span
                              className={`font-semibold num ${
                                hideNumbers
                                  ? "text-[var(--text)]"
                                  : net > 0
                                    ? "text-[var(--positive)]"
                                    : net < 0
                                      ? "text-[var(--negative)]"
                                      : "text-[var(--text)]"
                              }`}
                            >
                              {hideNumbers
                                ? "••••••"
                                : net > 0
                                  ? `+${formatIDR(BigInt(net))}`
                                  : formatIDR(BigInt(net))}
                            </span>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar
                  dataKey="total_income"
                  name="Income"
                  fill="var(--chart-1)"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={28}
                />
                <Bar
                  dataKey="total_expense"
                  name="Expenses"
                  fill="var(--chart-2)"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={28}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      )}
    </div>
  );
}
