"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { parseDecimalInput } from "@/lib/parse";
import { formatPrice } from "@/lib/format";
import {
  createHolding,
  updateHolding,
  type AssetType,
  type PriceCurrency,
  type PriceSource,
} from "@/actions/holdings";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { SegmentedToggle } from "@/components/ui/SegmentedToggle";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";

interface HoldingFormData {
  id?: string;
  asset_type: AssetType;
  symbol: string;
  name: string;
  platform?: string | null;
  quantity: string | number;
  avg_cost: string | number;
  price_currency: PriceCurrency;
  price_source: PriceSource;
  provider_ref?: string | null;
  manual_price?: string | number | null;
}

interface HoldingFormProps {
  initialData?: HoldingFormData;
  isEdit?: boolean;
}

const ASSET_TYPE_OPTIONS = [
  { value: "stock", label: "Stock" },
  { value: "crypto", label: "Crypto" },
  { value: "fund", label: "Fund" },
  { value: "gold", label: "Gold" },
  { value: "bond", label: "Bond" },
  { value: "other", label: "Other" },
];

export function HoldingForm({ initialData, isEdit = false }: HoldingFormProps) {
  const router = useRouter();
  const { toast } = useToast();

  const [assetType, setAssetType] = useState<AssetType>(
    initialData?.asset_type || "stock"
  );
  const [symbol, setSymbol] = useState(initialData?.symbol || "");
  const [name, setName] = useState(initialData?.name || "");
  const [platform, setPlatform] = useState(initialData?.platform || "");
  const [currency, setCurrency] = useState<PriceCurrency>(
    initialData?.price_currency || "IDR"
  );
  const [quantity, setQuantity] = useState(
    initialData?.quantity != null
      ? String(initialData.quantity).replace(".", ",")
      : ""
  );
  const [avgCost, setAvgCost] = useState(
    initialData?.avg_cost != null
      ? String(initialData.avg_cost).replace(".", ",")
      : ""
  );
  const [priceSource, setPriceSource] = useState<PriceSource>(
    initialData?.price_source || "manual"
  );
  const [providerRef, setProviderRef] = useState(
    initialData?.provider_ref || ""
  );
  const [manualPrice, setManualPrice] = useState(
    initialData?.manual_price != null
      ? String(initialData.manual_price).replace(".", ",")
      : ""
  );

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Live parsed values
  const parsedQty = parseDecimalInput(quantity);
  const parsedCost = parseDecimalInput(avgCost);
  const parsedPrice = parseDecimalInput(manualPrice);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!symbol.trim()) {
      toast("Please enter a symbol or ticker", "error");
      return;
    }
    if (!name.trim()) {
      toast("Please enter an asset name", "error");
      return;
    }
    if (!parsedQty) {
      toast("Please enter a valid quantity", "error");
      return;
    }
    if (!parsedCost) {
      toast("Please enter a valid average cost", "error");
      return;
    }

    if (priceSource === "coingecko" && assetType === "crypto" && !providerRef.trim()) {
      toast("Please specify a CoinGecko coin ID", "error");
      return;
    }

    setIsSubmitting(true);

    const payload = {
      asset_type: assetType,
      symbol: symbol.trim().toUpperCase(),
      name: name.trim(),
      platform: platform.trim() || null,
      quantity,
      avg_cost: avgCost,
      price_currency: currency,
      price_source: priceSource,
      provider_ref:
        priceSource === "coingecko" && assetType === "crypto"
          ? providerRef.trim().toLowerCase()
          : null,
      manual_price: priceSource === "manual" ? manualPrice : null,
    };

    let result;
    if (isEdit && initialData?.id) {
      result = await updateHolding(initialData.id, payload);
    } else {
      result = await createHolding(payload);
    }

    setIsSubmitting(false);

    if (result.error) {
      toast(result.error, "error");
      return;
    }

    toast(isEdit ? "Position updated" : "Position added", "success");
    router.push("/portfolio");
    router.refresh();
  };

  return (
    <form onSubmit={handleSubmit} className="glass-strong p-6 space-y-5">
      {/* Asset Type */}
      <div>
        <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">
          Asset type
        </label>
        <Select
          value={assetType}
          onChange={(e) => {
            const nextType = e.target.value as AssetType;
            setAssetType(nextType);
            if (nextType !== "crypto") {
              setPriceSource("manual");
            }
          }}
          options={ASSET_TYPE_OPTIONS}
        />
      </div>

      {/* Symbol & Name */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">
            Symbol / Ticker
          </label>
          <Input
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            placeholder="e.g. BBCA, BTC, AAPL"
            maxLength={40}
            required
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">
            Asset name
          </label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Bank Central Asia"
            maxLength={100}
            required
          />
        </div>
      </div>

      {/* Platform & Currency */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">
            Platform / Broker (optional)
          </label>
          <Input
            value={platform}
            onChange={(e) => setPlatform(e.target.value)}
            placeholder="e.g. Ajaib, Tokocrypto"
            maxLength={50}
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">
            Price currency
          </label>
          <SegmentedToggle
            value={currency}
            onChange={(val) => setCurrency(val as PriceCurrency)}
            options={[
              { value: "IDR", label: "IDR (Rp)" },
              { value: "USD", label: "USD ($)" },
            ]}
          />
        </div>
      </div>

      {/* Quantity & Avg Cost */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">
            Quantity
          </label>
          <Input
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="e.g. 100 or 0,0054"
            inputMode="decimal"
            required
          />
          <p className="text-[11px] text-[var(--text-muted)] num mt-1">
            Live preview: = {parsedQty ? parsedQty.replace(".", ",") : "-"}
          </p>
        </div>

        <div>
          <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">
            Average cost per unit ({currency})
          </label>
          <Input
            value={avgCost}
            onChange={(e) => setAvgCost(e.target.value)}
            placeholder={currency === "IDR" ? "e.g. 9500" : "e.g. 150,5"}
            inputMode="decimal"
            required
          />
          <p className="text-[11px] text-[var(--text-muted)] num mt-1">
            Live preview: = {parsedCost ? formatPrice(parsedCost, currency) : "-"}
          </p>
        </div>
      </div>

      {/* Crypto Price Source */}
      {assetType === "crypto" && (
        <div>
          <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">
            Price source
          </label>
          <SegmentedToggle
            value={priceSource}
            onChange={(val) => setPriceSource(val as PriceSource)}
            options={[
              { value: "manual", label: "Manual price" },
              { value: "coingecko", label: "CoinGecko (auto)" },
            ]}
          />
        </div>
      )}

      {/* CoinGecko Coin ID */}
      {assetType === "crypto" && priceSource === "coingecko" && (
        <div>
          <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">
            CoinGecko Coin ID
          </label>
          <Input
            value={providerRef}
            onChange={(e) => setProviderRef(e.target.value)}
            placeholder="e.g. bitcoin, ethereum, solana"
            required
          />
          <p className="text-[11px] text-[var(--text-muted)] mt-1">
            The exact coin identifier from coingecko.com
          </p>
        </div>
      )}

      {/* Manual Price Field */}
      {priceSource === "manual" && (
        <div>
          <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">
            Current unit price ({currency})
          </label>
          <Input
            value={manualPrice}
            onChange={(e) => setManualPrice(e.target.value)}
            placeholder="e.g. 9800"
            inputMode="decimal"
          />
          <p className="text-[11px] text-[var(--text-muted)] num mt-1">
            Live preview: = {parsedPrice ? formatPrice(parsedPrice, currency) : "-"}
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--glass-border)]">
        <Link href="/portfolio">
          <Button type="button" variant="secondary" disabled={isSubmitting}>
            Cancel
          </Button>
        </Link>
        <Button type="submit" variant="primary" disabled={isSubmitting}>
          {isSubmitting
            ? "Saving..."
            : isEdit
              ? "Update position"
              : "Add position"}
        </Button>
      </div>
    </form>
  );
}
