export type PriceCurrency = "IDR" | "USD";

export interface Quote {
  ref: string;
  currency: PriceCurrency;
  price: string; // decimal string, e.g. "1250000.5"
  fetchedAt: string; // ISO timestamp
}

export interface PriceProvider {
  id: "coingecko";
  fetchPrices(refs: string[], currency: PriceCurrency): Promise<Quote[]>;
}
