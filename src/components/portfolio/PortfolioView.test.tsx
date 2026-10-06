import React from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ToastProvider } from "@/components/ui/Toast";
import { PortfolioView, type PortfolioViewProps } from "./PortfolioView";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

const mockProps: PortfolioViewProps = {
  summary: {
    total_value_idr: 50000000,
    total_cost_idr: 40000000,
    total_gain_idr: 10000000,
    priced_count: 2,
    unpriced_count: 0,
  },
  holdings: [
    {
      id: "h1",
      asset_type: "crypto",
      symbol: "BTC",
      name: "Bitcoin",
      platform: "Binance",
      quantity: "0.05",
      avg_cost: "500000000",
      price_currency: "IDR",
      price_source: "coingecko",
      current_price: "600000000",
      price_as_of: "2026-10-05T10:00:00Z",
      value_native: "30000000",
      cost_native: "25000000",
      gain_native: "5000000",
      gain_pct: "20",
      value_idr: 30000000,
      cost_idr: 25000000,
      gain_idr: 5000000,
    },
  ],
  typeAllocation: [
    { name: "Crypto", value_idr: 30000000, share_pct: 100 },
  ],
  assetAllocation: [
    { name: "BTC", subName: "Bitcoin", value_idr: 30000000, share_pct: 100 },
  ],
  hasCryptoHoldings: true,
  hasUsdHoldings: false,
  showUsdMissingRateBanner: false,
  latestCryptoQuoteFetchedAt: "2026-10-05T10:00:00Z",
};

describe("PortfolioView", () => {
  beforeEach(() => {
    localStorage.clear();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({}),
    } as unknown as Response);
  });

  it("renders portfolio values and supports privacy toggle", () => {
    render(
      <ToastProvider>
        <PortfolioView {...mockProps} />
      </ToastProvider>
    );

    // Check formatted total value
    expect(screen.getAllByText("Rp 50.000.000").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Rp 40.000.000").length).toBeGreaterThan(0);

    // Toggle privacy
    const privacyBtn = screen.getByRole("button", { name: "Hide balances" });
    fireEvent.click(privacyBtn);

    expect(screen.getAllByText("Rp ••••••").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "Show balances" })).toBeDefined();
  });

  it("switches allocation tabs on mobile", () => {
    render(
      <ToastProvider>
        <PortfolioView {...mockProps} />
      </ToastProvider>
    );

    // Mobile tabs (should fail right now because tabs are not implemented yet)
    const typeTab = screen.getByRole("button", { name: "By Asset Type" });
    const assetTab = screen.getByRole("button", { name: "By Asset" });

    expect(typeTab).toBeDefined();
    expect(assetTab).toBeDefined();

    // Click By Asset tab
    fireEvent.click(assetTab);
    expect(screen.getAllByText("BTC").length).toBeGreaterThan(0);

    // Click By Asset Type tab
    fireEvent.click(typeTab);
    expect(screen.getAllByText("Crypto").length).toBeGreaterThan(0);
  });
});
