"use client";

import React from "react";
import { usePrivacyMode } from "@/lib/privacy";
import { formatIDR } from "@/lib/format";

interface SummaryCardsProps {
  income: number | bigint;
  expenses: number | bigint;
  net: number | bigint;
  hideNumbers?: boolean;
}

export function SummaryCards({
  income,
  expenses,
  net,
  hideNumbers: hideProp,
}: SummaryCardsProps) {
  const privacy = usePrivacyMode();
  const hideNumbers = hideProp ?? privacy;
  const incomeBig = BigInt(income);
  const expensesBig = BigInt(expenses);
  const netBig = BigInt(net);

  const isNetPositive = netBig > BigInt(0);
  const isNetNegative = netBig < BigInt(0);

  return (
    <>
      {/* Mobile Consolidated Hero Card (sm:hidden) */}
      <div className="sm:hidden glass p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <span className="block text-[11px] font-medium text-[var(--text-muted)]">
              Net cash flow
            </span>
            <div
              className={`mt-0.5 text-2xl font-bold num tracking-tight ${
                hideNumbers
                  ? "text-[var(--text)]"
                  : isNetPositive
                    ? "text-[var(--positive)]"
                    : isNetNegative
                      ? "text-[var(--negative)]"
                      : "text-[var(--text)]"
              }`}
            >
              {hideNumbers
                ? "••••••"
                : isNetPositive
                  ? `+${formatIDR(netBig)}`
                  : formatIDR(netBig)}
            </div>
          </div>
          <span
            className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
              isNetPositive
                ? "bg-[var(--positive)]/15 text-[var(--positive)]"
                : isNetNegative
                  ? "bg-[var(--negative)]/15 text-[var(--negative)]"
                  : "bg-black/5 dark:bg-white/10 text-[var(--text-muted)]"
            }`}
          >
            {isNetPositive ? "Surplus" : isNetNegative ? "Deficit" : "Balanced"}
          </span>
        </div>

        {/* Sub-row: Income & Expenses split */}
        <div className="grid grid-cols-2 gap-3 pt-2.5 border-t border-[var(--glass-border)]">
          <div>
            <span className="block text-[10px] font-medium text-[var(--text-muted)]">
              Income
            </span>
            <span className="text-sm font-semibold text-[var(--positive)] num block mt-0.5">
              {hideNumbers ? "Rp ••••••" : formatIDR(incomeBig)}
            </span>
          </div>
          <div>
            <span className="block text-[10px] font-medium text-[var(--text-muted)]">
              Expenses
            </span>
            <span className="text-sm font-semibold text-[var(--text)] num block mt-0.5">
              {hideNumbers ? "Rp ••••••" : formatIDR(expensesBig)}
            </span>
          </div>
        </div>
      </div>

      {/* Desktop 3-Card Grid (hidden sm:grid) */}
      <div className="hidden sm:grid sm:grid-cols-3 gap-4">
        {/* Income Card */}
        <div className="glass p-5">
          <span className="block text-xs font-medium text-[var(--text-muted)]">
            Total income
          </span>
          <div className="mt-2 text-2xl font-semibold text-[var(--text)] num tracking-tight">
            {hideNumbers ? "Rp ••••••" : formatIDR(incomeBig)}
          </div>
        </div>

        {/* Expenses Card */}
        <div className="glass p-5">
          <span className="block text-xs font-medium text-[var(--text-muted)]">
            Total expenses
          </span>
          <div className="mt-2 text-2xl font-semibold text-[var(--text)] num tracking-tight">
            {hideNumbers ? "Rp ••••••" : formatIDR(expensesBig)}
          </div>
        </div>

        {/* Net Card */}
        <div className="glass p-5">
          <span className="block text-xs font-medium text-[var(--text-muted)]">
            Net cash flow
          </span>
          <div
            className={`mt-2 text-2xl font-semibold num tracking-tight ${
              hideNumbers
                ? "text-[var(--text)]"
                : isNetPositive
                  ? "text-[var(--positive)]"
                  : isNetNegative
                    ? "text-[var(--negative)]"
                    : "text-[var(--text)]"
            }`}
          >
            {hideNumbers
              ? "••••••"
              : isNetPositive
                ? `+${formatIDR(netBig)}`
                : formatIDR(netBig)}
          </div>
        </div>
      </div>
    </>
  );
}
