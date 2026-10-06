"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

interface AutoRefreshPricesProps {
  latestFetchedAt: string | null;
  hasCryptoHoldings: boolean;
}

export function AutoRefreshPrices({
  latestFetchedAt,
  hasCryptoHoldings,
}: AutoRefreshPricesProps) {
  const router = useRouter();

  useEffect(() => {
    if (!hasCryptoHoldings) return;

    let shouldRefresh = false;
    if (!latestFetchedAt) {
      shouldRefresh = true;
    } else {
      const elapsed = Date.now() - new Date(latestFetchedAt).getTime();
      if (elapsed > 15 * 60 * 1000) {
        shouldRefresh = true;
      }
    }

    if (!shouldRefresh) return;

    fetch("/api/prices/refresh", { method: "POST" })
      .then((res) => res.json())
      .then((data) => {
        if (data.refreshed && data.updated > 0) {
          router.refresh();
        }
      })
      .catch((err) => {
        console.error("Auto-refresh prices error:", err);
      });
  }, [hasCryptoHoldings, latestFetchedAt, router]);

  return null;
}
