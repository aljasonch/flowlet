"use client";

import React from "react";
import Link from "next/link";
import {
  Eye,
  EyeOff,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  AlertTriangle,
  ArrowRight,
} from "lucide-react";
import { formatIDR, formatPercent } from "@/lib/format";
import { usePrivacyMode, togglePrivacyMode } from "@/lib/privacy";
import { Button } from "@/components/ui/Button";
import { HoldingList, type PortfolioHoldingRow } from "@/components/portfolio/HoldingList";
import { AllocationChart, type AllocationItem } from "@/components/portfolio/AllocationChart";
import { RefreshPricesButton } from "@/components/portfolio/RefreshPricesButton";
import { AutoRefreshPrices } from "@/components/portfolio/AutoRefreshPrices";

export interface PortfolioViewProps {
  summary: {
    total_value_idr: number | bigint;
    total_cost_idr: number | bigint;
    total_gain_idr: number | bigint;
    priced_count: number;
    unpriced_count: number;
  };
  holdings: PortfolioHoldingRow[];
  typeAllocation: AllocationItem[];
  assetAllocation: AllocationItem[];
  hasCryptoHoldings: boolean;
  hasUsdHoldings: boolean;
  showUsdMissingRateBanner: boolean;
  latestCryptoQuoteFetchedAt: string | null;
}

export function PortfolioView({
  summary,
  holdings,
  typeAllocation,
  assetAllocation,
  hasCryptoHoldings,
  hasUsdHoldings,
  showUsdMissingRateBanner,
  latestCryptoQuoteFetchedAt,
}: PortfolioViewProps) {
  const hideNumbers = usePrivacyMode();

  const totalValueBig = BigInt(summary.total_value_idr);
  const totalCostBig = BigInt(summary.total_cost_idr);
  const totalGainBig = BigInt(summary.total_gain_idr);

  const isGain = totalGainBig > BigInt(0);
  const isLoss = totalGainBig < BigInt(0);

  let overallGainPct: number | null = null;
  if (totalCostBig > BigInt(0)) {
    overallGainPct = Number((totalGainBig * BigInt(10000)) / totalCostBig) / 100;
  }

  return (
    <div className="space-y-6">
      <AutoRefreshPrices
        hasCryptoHoldings={hasCryptoHoldings}
        latestFetchedAt={latestCryptoQuoteFetchedAt}
      />

      {/* Top Header */}
      <div
        className="enter flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        style={{ "--i": 0 } as React.CSSProperties}
      >
        <div>
          <h1 className="text-2xl font-bold text-[var(--text)] tracking-tight">
            Portfolio
          </h1>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            Holdings, valuation and unrealized gain or loss
          </p>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
          {/* Privacy Toggle Button */}
          <Button
            type="button"
            variant="ghost"
            onClick={togglePrivacyMode}
            className="p-2 shrink-0"
            aria-label={hideNumbers ? "Show balances" : "Hide balances"}
            title={hideNumbers ? "Show balances" : "Hide balances"}
          >
            {hideNumbers ? (
              <EyeOff className="w-4 h-4 text-[var(--text-muted)]" />
            ) : (
              <Eye className="w-4 h-4 text-[var(--text-muted)]" />
            )}
          </Button>

          {/* Refresh Prices (Icon only on mobile) */}
          <RefreshPricesButton
            hasCryptoHoldings={hasCryptoHoldings}
            hasUsdHoldings={hasUsdHoldings}
          />

          {/* Add Position Button */}
          <Link href="/portfolio/new" className="flex-1 sm:flex-initial">
            <Button variant="primary" className="w-full sm:w-auto">
              <Plus className="w-4 h-4 mr-1.5" />
              <span>Add position</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* USD Rate Missing Banner */}
      {showUsdMissingRateBanner && (
        <div
          className="enter glass p-4 border border-[var(--chart-4)]/40 flex items-start gap-3"
          style={{ "--i": 1 } as React.CSSProperties}
        >
          <AlertTriangle className="w-5 h-5 text-[var(--chart-4)] shrink-0 mt-0.5" />
          <div className="flex-1 text-xs">
            <p className="font-semibold text-[var(--text)]">
              USD to IDR exchange rate required
            </p>
            <p className="text-[var(--text-muted)] mt-0.5">
              You have positions priced in USD, but no exchange rate is configured.
              IDR totals exclude these positions until a rate is set in Settings.
            </p>
            <Link
              href="/settings"
              className="inline-flex items-center gap-1 font-medium text-[var(--accent)] hover:underline mt-1.5"
            >
              Set exchange rate in Settings
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      {/* Mobile Consolidated Hero Card (sm:hidden) */}
      <div
        className="enter sm:hidden glass p-4 space-y-3"
        style={{ "--i": 1 } as React.CSSProperties}
      >
        <div className="flex items-center justify-between">
          <div>
            <span className="block text-[11px] font-medium text-[var(--text-muted)]">
              Total portfolio value
            </span>
            <div className="mt-0.5 text-2xl font-bold text-[var(--text)] num tracking-tight">
              {hideNumbers ? "Rp ••••••" : formatIDR(totalValueBig)}
            </div>
            <div className="text-[11px] text-[var(--text-muted)] num mt-0.5">
              {summary.priced_count} priced position{summary.priced_count === 1 ? "" : "s"}
            </div>
          </div>
          <span
            className={`text-xs px-2.5 py-1 rounded-full font-semibold flex items-center gap-1 ${
              hideNumbers
                ? "bg-black/5 dark:bg-white/10 text-[var(--text-muted)]"
                : isGain
                  ? "bg-[var(--positive)]/15 text-[var(--positive)]"
                  : isLoss
                    ? "bg-[var(--negative)]/15 text-[var(--negative)]"
                    : "bg-black/5 dark:bg-white/10 text-[var(--text-muted)]"
            }`}
          >
            {hideNumbers ? (
              "••••"
            ) : (
              <>
                {isGain && <ArrowUpRight className="w-3.5 h-3.5" />}
                {isLoss && <ArrowDownRight className="w-3.5 h-3.5" />}
                <span>
                  {overallGainPct != null ? (isGain ? `+${formatPercent(overallGainPct)}` : formatPercent(overallGainPct)) : "0.00%"}
                </span>
              </>
            )}
          </span>
        </div>

        {/* Sub-row: Invested Cost & Unrealized P&L split */}
        <div className="grid grid-cols-2 gap-3 pt-2.5 border-t border-[var(--glass-border)]">
          <div>
            <span className="block text-[10px] font-medium text-[var(--text-muted)]">
              Invested cost
            </span>
            <span className="text-sm font-semibold text-[var(--text)] num block mt-0.5">
              {hideNumbers ? "Rp ••••••" : formatIDR(totalCostBig)}
            </span>
          </div>
          <div>
            <span className="block text-[10px] font-medium text-[var(--text-muted)]">
              Unrealized gain / loss
            </span>
            <span
              className={`text-sm font-semibold num block mt-0.5 ${
                hideNumbers
                  ? "text-[var(--text)]"
                  : isGain
                    ? "text-[var(--positive)]"
                    : isLoss
                      ? "text-[var(--negative)]"
                      : "text-[var(--text)]"
              }`}
            >
              {hideNumbers
                ? "••••••"
                : isGain
                  ? `+${formatIDR(totalGainBig)}`
                  : formatIDR(totalGainBig)}
            </span>
          </div>
        </div>
      </div>

      {/* Desktop 3-Card Grid (hidden sm:grid) */}
      <div
        className="enter hidden sm:grid sm:grid-cols-3 gap-4"
        style={{ "--i": 1 } as React.CSSProperties}
      >
        <div className="glass p-5">
          <span className="block text-xs font-medium text-[var(--text-muted)]">
            Total portfolio value
          </span>
          <div className="mt-2 text-2xl font-semibold text-[var(--text)] num tracking-tight">
            {hideNumbers ? "Rp ••••••" : formatIDR(totalValueBig)}
          </div>
          <div className="text-[11px] text-[var(--text-muted)] num mt-1">
            {summary.priced_count} priced position{summary.priced_count === 1 ? "" : "s"}
          </div>
        </div>

        <div className="glass p-5">
          <span className="block text-xs font-medium text-[var(--text-muted)]">
            Total invested cost
          </span>
          <div className="mt-2 text-2xl font-semibold text-[var(--text)] num tracking-tight">
            {hideNumbers ? "Rp ••••••" : formatIDR(totalCostBig)}
          </div>
          <div className="text-[11px] text-[var(--text-muted)] num mt-1">
            Excludes unpriced positions
          </div>
        </div>

        <div className="glass p-5">
          <span className="block text-xs font-medium text-[var(--text-muted)]">
            Unrealized gain / loss
          </span>
          <div
            className={`mt-2 text-2xl font-semibold num tracking-tight flex items-center gap-1 ${
              hideNumbers
                ? "text-[var(--text)]"
                : isGain
                  ? "text-[var(--positive)]"
                  : isLoss
                    ? "text-[var(--negative)]"
                    : "text-[var(--text)]"
            }`}
          >
            {hideNumbers ? (
              <span>••••••</span>
            ) : (
              <>
                {isGain && <ArrowUpRight className="w-6 h-6 mr-0.5" />}
                {isLoss && <ArrowDownRight className="w-6 h-6 mr-0.5" />}
                {isGain ? `+${formatIDR(totalGainBig)}` : formatIDR(totalGainBig)}
              </>
            )}
          </div>
          <div className="text-[11px] text-[var(--text-muted)] num mt-1">
            {hideNumbers
              ? "••••••"
              : `${overallGainPct != null ? formatPercent(overallGainPct) : "0.00%"} overall return`}
          </div>
        </div>
      </div>

      {/* Unpriced note if any */}
      {summary.unpriced_count > 0 && (
        <div
          className="enter text-xs text-[var(--chart-4)] glass px-4 py-2"
          style={{ "--i": 2 } as React.CSSProperties}
        >
          {summary.unpriced_count} position{summary.unpriced_count === 1 ? "" : "s"} has no price and is excluded from valuation totals.
        </div>
      )}

      {/* Allocation Charts if any priced assets */}
      {(typeAllocation.length > 0 || assetAllocation.length > 0) && (
        <div className="enter" style={{ "--i": 2 } as React.CSSProperties}>
          <AllocationChart
            typeData={typeAllocation}
            assetData={assetAllocation}
            hideNumbers={hideNumbers}
          />
        </div>
      )}

      {/* Holdings List */}
      <div className="enter space-y-3" style={{ "--i": 3 } as React.CSSProperties}>
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-[var(--text)]">
            Holdings
          </h2>
          <span className="text-xs text-[var(--text-muted)] num">
            {holdings.length} position{holdings.length === 1 ? "" : "s"}
          </span>
        </div>

        <HoldingList initialHoldings={holdings} hideNumbers={hideNumbers} />
      </div>

      {/* Disclaimer and Attribution */}
      <div
        className="enter text-center text-[11px] text-[var(--text-muted)] pt-4 space-y-1"
        style={{ "--i": 4 } as React.CSSProperties}
      >
        <p>Prices may be delayed or inaccurate. This is not financial advice.</p>
        {hasCryptoHoldings && (
          <p>
            Crypto market data powered by{" "}
            <a
              href="https://www.coingecko.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-[var(--text)] transition-colors"
            >
              CoinGecko
            </a>
          </p>
        )}
      </div>
    </div>
  );
}
