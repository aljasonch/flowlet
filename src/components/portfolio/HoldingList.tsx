"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  ArrowDownRight,
  Pencil,
  Trash2,
  Clock,
  Plus,
} from "lucide-react";
import {
  formatIDR,
  formatUSD,
  formatPrice,
  formatQuantity,
  formatPercent,
} from "@/lib/format";
import { isPriceStale, formatTimeAgo } from "@/lib/staleness";
import { deleteHolding } from "@/actions/holdings";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";

export interface PortfolioHoldingRow {
  id: string;
  asset_type: string;
  symbol: string;
  name: string;
  platform: string | null;
  quantity: number | string;
  avg_cost: number | string;
  price_currency: string;
  price_source: string;
  current_price: number | string | null;
  price_as_of: string | null;
  value_native: number | string | null;
  cost_native: number | string;
  gain_native: number | string | null;
  gain_pct: number | string | null;
  value_idr: number | bigint | null;
  cost_idr: number | bigint | null;
  gain_idr: number | bigint | null;
}

interface HoldingListProps {
  initialHoldings: PortfolioHoldingRow[];
  hideNumbers?: boolean;
}

export function HoldingList({
  initialHoldings,
  hideNumbers = false,
}: HoldingListProps) {
  const [holdings, setHoldings] = useState<PortfolioHoldingRow[]>(initialHoldings);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();

  const holdingToDelete = holdings.find((h) => h.id === deletingId);

  const confirmDelete = async () => {
    if (!deletingId) return;
    setIsDeleting(true);

    const previousHoldings = [...holdings];
    setHoldings((prev) => prev.filter((h) => h.id !== deletingId));

    const result = await deleteHolding(deletingId);
    setIsDeleting(false);
    setDeletingId(null);

    if (result.error) {
      setHoldings(previousHoldings);
      toast(result.error, "error");
    } else {
      toast("Position removed", "success");
    }
  };

  if (holdings.length === 0) {
    return (
      <div className="glass p-8 text-center flex flex-col items-center justify-center space-y-4">
        <p className="text-sm text-[var(--text-muted)]">
          No holdings in your portfolio yet.
        </p>
        <Link href="/portfolio/new">
          <Button variant="primary">
            <Plus className="w-4 h-4 mr-1.5" />
            Add position
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {holdings.map((h) => {
          const isStale = isPriceStale(
            h.price_source as "manual" | "coingecko",
            h.price_as_of
          );
          const hasPrice = h.current_price != null;
          const gainPctNum =
            h.gain_pct != null ? Number(h.gain_pct) : null;
          const isPositiveGain = gainPctNum != null && gainPctNum > 0;
          const isNegativeGain = gainPctNum != null && gainPctNum < 0;

          return (
            <div
              key={h.id}
              className="glass p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all duration-[var(--dur-fast)]"
            >
              {/* Asset Info */}
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-base text-[var(--text)] tracking-tight">
                    {h.symbol}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/10 text-[var(--text-muted)] font-medium capitalize">
                    {h.asset_type}
                  </span>
                  {h.platform && (
                    <span className="text-xs text-[var(--text-muted)]">
                      via {h.platform}
                    </span>
                  )}
                  {hasPrice && isStale && (
                    <span className="inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded bg-[var(--chart-4)]/15 text-[var(--chart-4)] font-medium">
                      <Clock className="w-3 h-3" />
                      Stale
                    </span>
                  )}
                </div>

                <div className="text-xs text-[var(--text-muted)] mt-1 truncate">
                  {h.name}
                </div>

                <div className="flex items-center gap-3 text-xs text-[var(--text-muted)] num mt-2">
                  <span>Qty: {hideNumbers ? "••••" : formatQuantity(h.quantity)}</span>
                  <span>•</span>
                  <span>
                    Avg: {hideNumbers ? "••••" : formatPrice(h.avg_cost, h.price_currency as "IDR" | "USD")}
                  </span>
                  {hasPrice && (
                    <>
                      <span>•</span>
                      <span>
                        Px: {hideNumbers ? "••••" : formatPrice(h.current_price, h.price_currency as "IDR" | "USD")}
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Valuation & Gain/Loss */}
              <div className="flex items-center justify-between sm:justify-end gap-6 pt-3 sm:pt-0 border-t sm:border-0 border-[var(--glass-border)] shrink-0">
                <div className="text-left sm:text-right">
                  <div className="text-base font-semibold text-[var(--text)] num">
                    {hideNumbers
                      ? "Rp ••••••"
                      : h.value_idr != null
                        ? formatIDR(h.value_idr)
                        : h.value_native != null
                          ? formatUSD(h.value_native)
                          : "Unpriced"}
                  </div>

                  {/* Unrealized Gain/Loss */}
                  <div className="text-xs num mt-0.5 flex items-center sm:justify-end gap-1">
                    {hideNumbers ? (
                      <span className="text-[var(--text-muted)] font-medium">
                        ••••••
                      </span>
                    ) : gainPctNum != null ? (
                      <span
                        className={`inline-flex items-center font-medium ${
                          isPositiveGain
                            ? "text-[var(--positive)]"
                            : isNegativeGain
                              ? "text-[var(--negative)]"
                              : "text-[var(--text-muted)]"
                        }`}
                      >
                        {isPositiveGain && <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" />}
                        {isNegativeGain && <ArrowDownRight className="w-3.5 h-3.5 mr-0.5" />}
                        {h.gain_idr != null
                          ? isPositiveGain
                            ? `+${formatIDR(h.gain_idr)}`
                            : formatIDR(h.gain_idr)
                          : h.gain_native != null
                            ? isPositiveGain
                              ? `+${formatUSD(h.gain_native)}`
                              : formatUSD(h.gain_native)
                            : ""}
                        {" "}({formatPercent(h.gain_pct)})
                      </span>
                    ) : (
                      <span className="text-[var(--text-muted)]">
                        {hasPrice ? "No cost baseline" : "Unpriced position"}
                      </span>
                    )}
                  </div>

                  {h.price_as_of && (
                    <div className="text-[10px] text-[var(--text-muted)] mt-0.5">
                      Updated {formatTimeAgo(h.price_as_of)}
                    </div>
                  )}
                </div>

                {/* Edit & Delete Controls */}
                <div className="flex items-center gap-1">
                  <Link
                    href={`/portfolio/${h.id}/edit`}
                    className="p-1.5 rounded-[var(--radius-control)] text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-black/5 dark:hover:bg-white/5 transition-colors duration-[var(--dur-fast)]"
                    aria-label={`Edit ${h.symbol}`}
                  >
                    <Pencil className="w-4 h-4" />
                  </Link>
                  <button
                    type="button"
                    onClick={() => setDeletingId(h.id)}
                    className="p-1.5 rounded-[var(--radius-control)] text-[var(--text-muted)] hover:text-[var(--negative)] hover:bg-black/5 dark:hover:bg-white/5 transition-colors duration-[var(--dur-fast)]"
                    aria-label={`Delete ${h.symbol}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deletingId !== null}
        onClose={() => {
          if (!isDeleting) setDeletingId(null);
        }}
        title="Delete position"
        description={`Are you sure you want to remove ${
          holdingToDelete?.symbol || "this position"
        } from your portfolio? This action cannot be undone.`}
      >
        <div className="flex items-center justify-end gap-3 mt-4">
          <Button
            variant="secondary"
            onClick={() => setDeletingId(null)}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={confirmDelete}
            disabled={isDeleting}
          >
            {isDeleting ? "Deleting..." : "Delete"}
          </Button>
        </div>
      </Dialog>
    </>
  );
}
