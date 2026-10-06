import type { PriceCurrency, PriceProvider, Quote } from "./types";

export class CoinGeckoProvider implements PriceProvider {
  readonly id = "coingecko" as const;
  private readonly baseUrl = "https://api.coingecko.com/api/v3";

  async fetchPrices(refs: string[], currency: PriceCurrency): Promise<Quote[]> {
    if (refs.length === 0) return [];

    const apiKey = process.env.COINGECKO_API_KEY;
    const vsCurrency = currency.toLowerCase();
    const ids = refs.map((r) => encodeURIComponent(r.trim().toLowerCase())).join(",");
    const url = `${this.baseUrl}/simple/price?ids=${ids}&vs_currencies=${vsCurrency}`;

    const headers: Record<string, string> = {
      Accept: "application/json",
    };

    if (apiKey && apiKey.trim() !== "") {
      headers["x-cg-demo-api-key"] = apiKey.trim();
    }

    const response = await fetch(url, {
      method: "GET",
      headers,
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });

    if (!response.ok) {
      throw new Error(`CoinGecko request failed with status ${response.status}`);
    }

    const data = (await response.json()) as Record<string, Record<string, number>>;
    const now = new Date().toISOString();
    const quotes: Quote[] = [];

    for (const ref of refs) {
      const key = ref.trim().toLowerCase();
      const val = data[key]?.[vsCurrency];
      if (typeof val === "number" && val > 0) {
        quotes.push({
          ref: key,
          currency,
          price: String(val),
          fetchedAt: now,
        });
      }
    }

    return quotes;
  }
}

export const coingecko = new CoinGeckoProvider();
