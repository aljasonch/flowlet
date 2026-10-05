"use client";

import React, { useState, useSyncExternalStore } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { formatIDR } from "@/lib/format";

const emptySubscribe = () => () => {};

export interface AllocationItem {
  name: string;
  subName?: string;
  value_idr: number | bigint;
  share_pct: number | string;
}

interface LegacyAllocationItem {
  name?: string;
  asset_type?: string;
  subName?: string;
  value_idr: number | bigint;
  share_pct: number | string;
}

interface AllocationChartProps {
  data?: LegacyAllocationItem[];
  typeData?: AllocationItem[];
  assetData?: AllocationItem[];
  hideNumbers?: boolean;
}

const PALETTE = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

interface FormattedChartItem {
  name: string;
  subName?: string;
  value: number;
  share: string;
}

function SinglePiePanel({
  title,
  subtitle,
  items,
  palette,
  hideNumbers = false,
}: {
  title: string;
  subtitle: string;
  items: FormattedChartItem[];
  palette: string[];
  hideNumbers?: boolean;
}) {
  const mounted = useSyncExternalStore(emptySubscribe, () => true, () => false);

  return (
    <div className="glass p-5 flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-[var(--text)]">
            {title}
          </h3>
          <span className="text-xs text-[var(--text-muted)] num">
            {subtitle}
          </span>
        </div>

        <div className="h-48 w-full flex items-center justify-center">
          {!mounted ? (
            <div className="w-36 h-36 rounded-full skeleton-pulse border-8 border-black/5 dark:border-white/5" />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={items}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={2}
                  dataKey="value"
                  stroke="var(--glass-strong)"
                  strokeWidth={1}
                >
                  {items.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={palette[index % palette.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const item = payload[0].payload as FormattedChartItem;
                      return (
                        <div className="glass-strong px-3 py-2 text-xs border border-[var(--glass-border)] rounded-[var(--radius-control)] shadow-md">
                          <p className="font-semibold text-[var(--text)]">
                            {item.name}
                            {item.subName ? ` · ${item.subName}` : ""}
                          </p>
                          <p className="text-[var(--text-muted)] num mt-0.5">
                            {hideNumbers ? "••••••" : formatIDR(BigInt(item.value))} ({item.share}%)
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

      {/* Breakdown list */}
      <div className="mt-4 pt-3 border-t border-[var(--glass-border)] space-y-2 max-h-48 overflow-y-auto">
        {items.map((item, index) => {
          const color = palette[index % palette.length];
          return (
            <div
              key={`${item.name}-${index}`}
              className="flex items-center justify-between text-xs"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: color }}
                />
                <span className="text-[var(--text)] font-medium truncate">
                  {item.name}
                  {item.subName && (
                    <span className="text-[var(--text-muted)] font-normal ml-1">
                      ({item.subName})
                    </span>
                  )}
                </span>
              </div>
              <div className="flex items-center gap-3 shrink-0 num">
                <span className="text-[var(--text-muted)]">{item.share}%</span>
                <span className="font-semibold text-[var(--text)]">
                  {hideNumbers ? "••••••" : formatIDR(BigInt(item.value))}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function AllocationChart({
  data,
  typeData,
  assetData,
  hideNumbers = false,
}: AllocationChartProps) {
  const [mobileTab, setMobileTab] = useState<"type" | "asset">("type");

  // Normalize typeData from props or legacy data
  const rawTypes =
    typeData ||
    (data
      ? data.map((d) => ({
          name:
            d.name ||
            (d.asset_type
              ? d.asset_type.charAt(0).toUpperCase() + d.asset_type.slice(1)
              : "Unknown"),
          subName: d.subName,
          value_idr: d.value_idr,
          share_pct: d.share_pct,
        }))
      : []);

  const formattedTypes: FormattedChartItem[] = rawTypes.map((item) => ({
    name: item.name,
    subName: item.subName,
    value: Number(item.value_idr),
    share: Number(item.share_pct).toFixed(1),
  }));

  const formattedAssets: FormattedChartItem[] = (assetData || []).map((item) => ({
    name: item.name,
    subName: item.subName,
    value: Number(item.value_idr),
    share: Number(item.share_pct).toFixed(1),
  }));

  if (formattedTypes.length === 0 && formattedAssets.length === 0) {
    return (
      <div className="glass p-5">
        <h3 className="text-base font-semibold text-[var(--text)]">
          Asset allocation
        </h3>
        <div className="py-12 text-center text-sm text-[var(--text-muted)]">
          No priced assets available for allocation.
        </div>
      </div>
    );
  }

  // If both type and asset allocations are available, render side-by-side on desktop and tabbed on mobile
  if (formattedTypes.length > 0 && formattedAssets.length > 0) {
    return (
      <div className="space-y-4">
        {/* Mobile View with Segmented Toggle (lg:hidden) */}
        <div className="lg:hidden space-y-3">
          <div className="flex p-1 glass-strong rounded-[var(--radius-control)] border border-[var(--glass-border)] text-xs">
            <button
              type="button"
              onClick={() => setMobileTab("type")}
              className={`flex-1 py-1.5 rounded-[var(--radius-control)] font-medium transition-all ${
                mobileTab === "type"
                  ? "bg-[var(--accent)] text-[var(--accent-contrast)] shadow-sm"
                  : "text-[var(--text-muted)] hover:text-[var(--text)]"
              }`}
            >
              By Asset Type
            </button>
            <button
              type="button"
              onClick={() => setMobileTab("asset")}
              className={`flex-1 py-1.5 rounded-[var(--radius-control)] font-medium transition-all ${
                mobileTab === "asset"
                  ? "bg-[var(--accent)] text-[var(--accent-contrast)] shadow-sm"
                  : "text-[var(--text-muted)] hover:text-[var(--text)]"
              }`}
            >
              By Asset
            </button>
          </div>

          {mobileTab === "type" ? (
            <SinglePiePanel
              title="Allocation by asset type"
              subtitle={`${formattedTypes.length} ${
                formattedTypes.length === 1 ? "type" : "types"
              }`}
              items={formattedTypes}
              palette={PALETTE}
              hideNumbers={hideNumbers}
            />
          ) : (
            <SinglePiePanel
              title="Allocation by asset"
              subtitle={`${formattedAssets.length} ${
                formattedAssets.length === 1 ? "asset" : "assets"
              }`}
              items={formattedAssets}
              palette={PALETTE}
              hideNumbers={hideNumbers}
            />
          )}
        </div>

        {/* Desktop View Side-by-Side (hidden lg:grid) */}
        <div className="hidden lg:grid lg:grid-cols-2 gap-4">
          <SinglePiePanel
            title="Allocation by asset type"
            subtitle={`${formattedTypes.length} ${
              formattedTypes.length === 1 ? "type" : "types"
            }`}
            items={formattedTypes}
            palette={PALETTE}
            hideNumbers={hideNumbers}
          />
          <SinglePiePanel
            title="Allocation by asset"
            subtitle={`${formattedAssets.length} ${
              formattedAssets.length === 1 ? "asset" : "assets"
            }`}
            items={formattedAssets}
            palette={PALETTE}
            hideNumbers={hideNumbers}
          />
        </div>
      </div>
    );
  }

  // Fallback if only one set is available
  const singleItems = formattedTypes.length > 0 ? formattedTypes : formattedAssets;
  const singleTitle =
    formattedTypes.length > 0 ? "Allocation by asset type" : "Allocation by asset";

  return (
    <SinglePiePanel
      title={singleTitle}
      subtitle={`${singleItems.length} items`}
      items={singleItems}
      palette={PALETTE}
      hideNumbers={hideNumbers}
    />
  );
}
