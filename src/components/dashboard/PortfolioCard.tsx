import React from "react";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, ArrowDownRight, Briefcase } from "lucide-react";
import { formatIDR, formatPercent } from "@/lib/format";

interface PortfolioCardProps {
  totalValueIdr: number | bigint;
  totalCostIdr: number | bigint;
  totalGainIdr: number | bigint;
  pricedCount: number;
  unpricedCount: number;
  hideNumbers?: boolean;
}

export function PortfolioCard({
  totalValueIdr,
  totalCostIdr,
  totalGainIdr,
  pricedCount,
  unpricedCount,
  hideNumbers = false,
}: PortfolioCardProps) {
  const valueBig = BigInt(totalValueIdr);
  const costBig = BigInt(totalCostIdr);
  const gainBig = BigInt(totalGainIdr);

  const isGain = gainBig > BigInt(0);
  const isLoss = gainBig < BigInt(0);

  let gainPct: number | null = null;
  if (costBig > BigInt(0)) {
    gainPct = Number((gainBig * BigInt(10000)) / costBig) / 100;
  }

  const hasHoldings = pricedCount > 0 || unpricedCount > 0;

  return (
    <div className="glass p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Briefcase className="w-4 h-4 text-[var(--accent)]" />
          <h2 className="text-sm font-semibold text-[var(--text)]">
            Portfolio
          </h2>
        </div>
        <Link
          href="/portfolio"
          className="inline-flex items-center gap-1 text-xs font-medium text-[var(--accent)] hover:underline"
        >
          View portfolio
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {!hasHoldings ? (
        <div className="py-4 text-xs text-[var(--text-muted)] flex items-center justify-between">
          <span>No portfolio positions recorded yet.</span>
          <Link
            href="/portfolio/new"
            className="text-xs font-medium text-[var(--accent)] hover:underline"
          >
            Add first position &rarr;
          </Link>
        </div>
      ) : (
        <div>
          <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
            <div className="text-2xl font-bold text-[var(--text)] num tracking-tight">
              {hideNumbers ? "Rp ••••••" : formatIDR(valueBig)}
            </div>

            <div className="text-xs num flex items-center gap-1">
              {hideNumbers ? (
                <span className="text-[var(--text-muted)] font-medium">••••••</span>
              ) : (
                <span
                  className={`inline-flex items-center font-medium ${
                    isGain
                      ? "text-[var(--positive)]"
                      : isLoss
                        ? "text-[var(--negative)]"
                        : "text-[var(--text-muted)]"
                  }`}
                >
                  {isGain && <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" />}
                  {isLoss && <ArrowDownRight className="w-3.5 h-3.5 mr-0.5" />}
                  {isGain ? `+${formatIDR(gainBig)}` : formatIDR(gainBig)}
                  {gainPct != null && ` (${formatPercent(gainPct)})`}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-[var(--text-muted)] num mt-2 pt-2 border-t border-[var(--glass-border)]">
            <span>{pricedCount} priced position{pricedCount === 1 ? "" : "s"}</span>
            {unpricedCount > 0 && (
              <span className="text-[var(--chart-4)]">
                {unpricedCount} unpriced position{unpricedCount === 1 ? "" : "s"}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
