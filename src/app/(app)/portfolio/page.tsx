import React from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PortfolioView } from "@/components/portfolio/PortfolioView";
import type { PortfolioHoldingRow } from "@/components/portfolio/HoldingList";
import type { AllocationItem } from "@/components/portfolio/AllocationChart";

export default async function PortfolioPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch profile for usd_idr_rate and latest quote in parallel
  const [profileRes, latestQuoteRes, holdingsRes, summaryRes, allocRes] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("usd_idr_rate")
        .eq("user_id", user.id)
        .single(),
      supabase
        .from("price_quotes")
        .select("fetched_at")
        .eq("user_id", user.id)
        .eq("source", "coingecko")
        .order("fetched_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase.rpc("portfolio_holdings"),
      supabase.rpc("portfolio_summary"),
      supabase.rpc("portfolio_allocation"),
    ]);

  const usdRate = profileRes.data?.usd_idr_rate;
  const latestCryptoQuote = latestQuoteRes.data;

  const rawHoldings = holdingsRes.data ?? [];
  const holdings: PortfolioHoldingRow[] = rawHoldings.map((h) => ({
    id: h.id,
    asset_type: h.asset_type,
    symbol: h.symbol,
    name: h.name,
    platform: h.platform,
    quantity: h.quantity,
    avg_cost: h.avg_cost,
    price_currency: h.price_currency,
    price_source: h.price_source,
    current_price: h.current_price,
    price_as_of: h.price_as_of,
    value_native: h.value_native,
    cost_native: h.cost_native,
    gain_native: h.gain_native,
    gain_pct: h.gain_pct,
    value_idr: h.value_idr,
    cost_idr: h.cost_idr,
    gain_idr: h.gain_idr,
  }));

  const summary = summaryRes.data?.[0] ?? {
    total_value_idr: 0,
    total_cost_idr: 0,
    total_gain_idr: 0,
    priced_count: 0,
    unpriced_count: 0,
  };

  const hasCryptoHoldings = holdings.some((h) => h.price_source === "coingecko");
  const hasUsdHoldings = holdings.some((h) => h.price_currency === "USD");
  const showUsdMissingRateBanner =
    hasUsdHoldings && (!usdRate || Number(usdRate) <= 0);

  const totalValueBig = BigInt(summary.total_value_idr);

  const typeAllocation: AllocationItem[] = (allocRes.data ?? []).map((a) => ({
    name: a.asset_type.charAt(0).toUpperCase() + a.asset_type.slice(1),
    value_idr: a.value_idr,
    share_pct: a.share_pct,
  }));

  // Aggregate priced holdings by symbol for per-asset allocation
  const assetMap = new Map<
    string,
    { symbol: string; name: string; value_idr: bigint }
  >();
  for (const h of holdings) {
    if (h.value_idr != null) {
      const val = BigInt(h.value_idr);
      if (val > BigInt(0)) {
        const existing = assetMap.get(h.symbol);
        if (existing) {
          existing.value_idr += val;
        } else {
          assetMap.set(h.symbol, {
            symbol: h.symbol,
            name: h.name,
            value_idr: val,
          });
        }
      }
    }
  }

  const assetAllocation: AllocationItem[] = Array.from(assetMap.values())
    .sort((a, b) =>
      b.value_idr > a.value_idr ? 1 : b.value_idr < a.value_idr ? -1 : 0
    )
    .map((item) => ({
      name: item.symbol,
      subName: item.name,
      value_idr: item.value_idr,
      share_pct:
        totalValueBig > BigInt(0)
          ? Number((item.value_idr * BigInt(10000)) / totalValueBig) / 100
          : 0,
    }));

  return (
    <PortfolioView
      summary={summary}
      holdings={holdings}
      typeAllocation={typeAllocation}
      assetAllocation={assetAllocation}
      hasCryptoHoldings={hasCryptoHoldings}
      hasUsdHoldings={hasUsdHoldings}
      showUsdMissingRateBanner={showUsdMissingRateBanner}
      latestCryptoQuoteFetchedAt={latestCryptoQuote?.fetched_at || null}
    />
  );
}
