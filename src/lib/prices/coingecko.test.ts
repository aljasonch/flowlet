import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { coingecko } from "./coingecko";

describe("CoinGeckoProvider", () => {
  const originalEnv = process.env.COINGECKO_API_KEY;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    process.env.COINGECKO_API_KEY = originalEnv;
  });

  it("returns empty array when no refs are requested", async () => {
    const quotes = await coingecko.fetchPrices([], "USD");
    expect(quotes).toEqual([]);
  });

  it("fetches quotes and includes demo key header", async () => {
    process.env.COINGECKO_API_KEY = "test-demo-key";

    const mockResponse = {
      bitcoin: { usd: 65432.1 },
      ethereum: { usd: 2650.75 },
    };

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue(mockResponse),
    });
    vi.stubGlobal("fetch", fetchMock);

    const quotes = await coingecko.fetchPrices(["bitcoin", "ethereum"], "USD");

    expect(fetchMock).toHaveBeenCalledOnce();
    const [calledUrl, calledOptions] = fetchMock.mock.calls[0];

    expect(calledUrl).toContain("/simple/price?ids=bitcoin,ethereum&vs_currencies=usd");
    expect(calledOptions.headers["x-cg-demo-api-key"]).toBe("test-demo-key");

    expect(quotes).toHaveLength(2);
    expect(quotes[0]).toMatchObject({
      ref: "bitcoin",
      currency: "USD",
      price: "65432.1",
    });
    expect(quotes[1]).toMatchObject({
      ref: "ethereum",
      currency: "USD",
      price: "2650.75",
    });
    expect(quotes[0].fetchedAt).toBeDefined();
  });

  it("handles IDR currency and ignores coins with missing/zero prices", async () => {
    const mockResponse = {
      bitcoin: { idr: 1025000000 },
      unknowncoin: {},
    };

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue(mockResponse),
    }));

    const quotes = await coingecko.fetchPrices(["bitcoin", "unknowncoin"], "IDR");
    expect(quotes).toHaveLength(1);
    expect(quotes[0]).toMatchObject({
      ref: "bitcoin",
      currency: "IDR",
      price: "1025000000",
    });
  });

  it("throws error when provider returns non-200 status", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
    }));

    await expect(
      coingecko.fetchPrices(["bitcoin"], "USD")
    ).rejects.toThrow("CoinGecko request failed with status 429");
  });
});
