import { z } from "zod";

const fxApiResponseSchema = z.object({
  result: z.literal("success"),
  rates: z.record(z.string(), z.number()),
});

/**
 * Fetches the current live USD to IDR exchange rate.
 * Uses the free, open ExchangeRate-API endpoint without API keys.
 */
export async function fetchLiveUsdIdrRate(): Promise<number> {
  const res = await fetch("https://open.er-api.com/v6/latest/USD", {
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch exchange rate: HTTP ${res.status}`);
  }

  const json = await res.json();
  const parsed = fxApiResponseSchema.safeParse(json);

  if (!parsed.success || typeof parsed.data.rates.IDR !== "number" || parsed.data.rates.IDR <= 0) {
    throw new Error("Invalid exchange rate response");
  }

  return parsed.data.rates.IDR;
}
