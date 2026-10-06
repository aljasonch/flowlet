import { getDebtsSummary } from "@/lib/supabase/server";

export async function DesktopDebtsBadge() {
  const summary = await getDebtsSummary();
  const unpaidDebtCount = summary.unpaid_debt_count ?? 0;
  const unpaidReceivableCount = summary.unpaid_receivable_count ?? 0;

  if (unpaidDebtCount === 0 && unpaidReceivableCount === 0) return null;

  return (
    <div className="ml-auto flex items-center gap-1.5 shrink-0">
      {unpaidDebtCount > 0 && (
        <span
          className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-[var(--negative)] text-white shadow-xs"
          title={`${unpaidDebtCount} unpaid debts`}
        >
          {unpaidDebtCount}
        </span>
      )}
      {unpaidReceivableCount > 0 && (
        <span
          className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-[var(--positive)] text-white shadow-xs"
          title={`${unpaidReceivableCount} unpaid receivables`}
        >
          {unpaidReceivableCount}
        </span>
      )}
    </div>
  );
}

export async function MobileDebtsBadge() {
  const summary = await getDebtsSummary();
  const unpaidDebtCount = summary.unpaid_debt_count ?? 0;
  const unpaidReceivableCount = summary.unpaid_receivable_count ?? 0;

  if (unpaidDebtCount === 0 && unpaidReceivableCount === 0) return null;

  return (
    <div className="absolute -top-1.5 -right-3 flex items-center gap-0.5">
      {unpaidDebtCount > 0 && (
        <span
          className="text-[9px] font-bold px-1 min-w-[14px] h-[14px] flex items-center justify-center rounded-full bg-[var(--negative)] text-white shadow-xs leading-none"
          title={`${unpaidDebtCount} unpaid debts`}
        >
          {unpaidDebtCount}
        </span>
      )}
      {unpaidReceivableCount > 0 && (
        <span
          className="text-[9px] font-bold px-1 min-w-[14px] h-[14px] flex items-center justify-center rounded-full bg-[var(--positive)] text-white shadow-xs leading-none"
          title={`${unpaidReceivableCount} unpaid receivables`}
        >
          {unpaidReceivableCount}
        </span>
      )}
    </div>
  );
}
