import Decimal from "decimal.js";

const idrFormatter = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

const usdFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatIDR(amount: number | bigint | string | null | undefined): string {
  if (amount == null) return "-";
  const intAmount = typeof amount === "bigint" ? amount : BigInt(String(amount).split(".")[0] || "0");
  return idrFormatter.format(intAmount);
}

export function formatUSD(amount: number | string | null | undefined): string {
  if (amount == null) return "-";
  return usdFormatter.format(Number(amount));
}

export function formatPrice(
  amount: number | string | null | undefined,
  currency: "IDR" | "USD" = "IDR",
  maxDecimals = 8
): string {
  if (amount == null) return "-";
  const str = String(amount).trim();
  if (!str) return "-";

  try {
    const d = new Decimal(str);
    if (!d.isFinite()) return "-";

    if (currency === "USD") {
      const fixed = d.toFixed(maxDecimals);
      const trimmed = fixed.replace(/\.?0+$/, "");
      const parts = trimmed.split(".");
      const intNum = Number(parts[0]);
      const intFormatted = isNaN(intNum) ? parts[0] : intNum.toLocaleString("en-US");
      const decPart = parts[1] || "";

      if (decPart.length > 2) {
        return `$${intFormatted}.${decPart}`;
      }
      return `$${Number(d.toFixed(2)).toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;
    }

    // IDR
    const fixed = d.toFixed(maxDecimals);
    const trimmed = fixed.replace(/\.?0+$/, "");
    const parts = trimmed.split(".");
    const intNum = Number(parts[0]);
    const intFormatted = isNaN(intNum) ? parts[0] : intNum.toLocaleString("id-ID");
    const decPart = parts[1];

    if (decPart && decPart.length > 0) {
      return `Rp ${intFormatted},${decPart}`;
    }
    return `Rp ${intFormatted}`;
  } catch {
    return "-";
  }
}

export function formatQuantity(quantity: number | string | null | undefined): string {
  if (quantity == null) return "-";
  const d = new Decimal(String(quantity));
  // Show up to 8 decimals with trailing zeros trimmed
  const fixed = d.toFixed(8);
  if (fixed.includes(".")) {
    return fixed.replace(/\.?0+$/, "");
  }
  return fixed;
}

export function formatPercent(percent: number | string | null | undefined): string {
  if (percent == null) return "-";
  const d = new Decimal(String(percent));
  const sign = d.gte(0) ? "+" : "";
  return `${sign}${d.toFixed(2)}%`;
}
