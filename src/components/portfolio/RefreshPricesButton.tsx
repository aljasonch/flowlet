"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";

interface RefreshPricesButtonProps {
  hasCryptoHoldings?: boolean;
  hasUsdHoldings?: boolean;
}

export function RefreshPricesButton({
  hasCryptoHoldings = false,
  hasUsdHoldings = false,
}: RefreshPricesButtonProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  if (!hasCryptoHoldings && !hasUsdHoldings) return null;

  const handleRefresh = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);

    try {
      const res = await fetch("/api/prices/refresh", {
        method: "POST",
      });

      if (!res.ok) {
        toast("Failed to refresh prices", "error");
        setIsRefreshing(false);
        return;
      }

      const data = await res.json();
      setIsRefreshing(false);

      if (data.refreshed) {
        if (data.updated > 0 && data.fxUpdated) {
          toast(
            `Updated ${data.updated} price${data.updated === 1 ? "" : "s"} and USD exchange rate`,
            "success"
          );
        } else if (data.updated > 0) {
          toast(`Updated ${data.updated} price${data.updated === 1 ? "" : "s"}`, "success");
        } else if (data.fxUpdated) {
          toast("Updated USD exchange rate", "success");
        } else {
          toast("Prices are up to date", "info");
        }
        router.refresh();
      } else if (data.reason === "throttled") {
        toast("Prices were refreshed recently (< 60s)", "info");
      } else if (data.reason === "provider_error") {
        toast("Could not contact CoinGecko; using cached prices", "error");
      }
    } catch {
      setIsRefreshing(false);
      toast("Network error refreshing prices", "error");
    }
  };

  return (
    <Button
      type="button"
      variant="secondary"
      onClick={handleRefresh}
      disabled={isRefreshing}
      className="inline-flex items-center gap-1.5"
      aria-label="Refresh prices"
    >
      <RefreshCw
        className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`}
      />
      <span className="hidden sm:inline">
        {isRefreshing ? "Refreshing..." : "Refresh prices"}
      </span>
    </Button>
  );
}
