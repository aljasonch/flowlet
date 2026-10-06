import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fetchLiveUsdIdrRate } from "./fx";

describe("fetchLiveUsdIdrRate", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("parses and returns valid IDR rate", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        result: "success",
        rates: {
          IDR: 16250.75,
        },
      }),
    } as unknown as Response);

    const rate = await fetchLiveUsdIdrRate();
    expect(rate).toBe(16250.75);
    expect(global.fetch).toHaveBeenCalledWith(
      "https://open.er-api.com/v6/latest/USD",
      expect.objectContaining({
        signal: expect.any(AbortSignal),
      })
    );
  });

  it("throws error when response is not ok", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
    } as unknown as Response);

    await expect(fetchLiveUsdIdrRate()).rejects.toThrow("Failed to fetch exchange rate");
  });

  it("throws error when IDR rate is missing or invalid", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        result: "error",
        rates: {},
      }),
    } as unknown as Response);

    await expect(fetchLiveUsdIdrRate()).rejects.toThrow("Invalid exchange rate response");
  });
});
