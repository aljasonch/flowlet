import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createHolding,
  updateHolding,
  deleteHolding,
} from "./holdings";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

const mockInsert = vi.fn();
const mockUpdate = vi.fn();
const mockDelete = vi.fn();
const mockEq = vi.fn();
const mockSelect = vi.fn();
const mockSingle = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: "test-user-id" } },
      }),
    },
    from: vi.fn(() => ({
      insert: mockInsert.mockReturnValue({
        select: mockSelect.mockReturnValue({
          single: mockSingle.mockResolvedValue({ data: { id: "holding-123" }, error: null }),
        }),
      }),
      update: mockUpdate.mockReturnValue({
        eq: mockEq.mockReturnValue({
          eq: mockEq.mockResolvedValue({ error: null }),
        }),
      }),
      delete: mockDelete.mockReturnValue({
        eq: mockEq.mockReturnValue({
          eq: mockEq.mockResolvedValue({ error: null }),
        }),
      }),
    })),
  }),
}));

describe("Holdings Server Actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Validation", () => {
    it("rejects zero or negative quantity", async () => {
      const res1 = await createHolding({
        asset_type: "stock",
        symbol: "BBCA",
        name: "Bank Central Asia",
        quantity: "0",
        avg_cost: "9500",
        price_currency: "IDR",
        price_source: "manual",
      });
      expect(res1.error).toBeDefined();

      const res2 = await createHolding({
        asset_type: "stock",
        symbol: "BBCA",
        name: "Bank Central Asia",
        quantity: "-10",
        avg_cost: "9500",
        price_currency: "IDR",
        price_source: "manual",
      });
      expect(res2.error).toBeDefined();
    });

    it("accepts exact decimal quantities such as 0,0054", async () => {
      mockSingle.mockResolvedValueOnce({ data: { id: "crypto-1" }, error: null });
      const res = await createHolding({
        asset_type: "crypto",
        symbol: "BTC",
        name: "Bitcoin",
        quantity: "0,0054",
        avg_cost: "950000000",
        price_currency: "IDR",
        price_source: "manual",
        manual_price: "1000000000",
      });
      expect(res.success).toBe(true);
    });

    it("rejects negative average cost", async () => {
      const res = await createHolding({
        asset_type: "stock",
        symbol: "BBCA",
        name: "Bank Central Asia",
        quantity: "100",
        avg_cost: "-1",
        price_currency: "IDR",
        price_source: "manual",
      });
      expect(res.error).toBeDefined();
    });

    it("rejects CoinGecko price source for non-crypto assets", async () => {
      const res = await createHolding({
        asset_type: "stock",
        symbol: "AAPL",
        name: "Apple Inc.",
        quantity: "10",
        avg_cost: "150",
        price_currency: "USD",
        price_source: "coingecko",
        provider_ref: "apple",
      });
      expect(res.error).toBeDefined();
    });

    it("rejects CoinGecko crypto without provider_ref", async () => {
      const res = await createHolding({
        asset_type: "crypto",
        symbol: "ETH",
        name: "Ethereum",
        quantity: "1,5",
        avg_cost: "2500",
        price_currency: "USD",
        price_source: "coingecko",
        provider_ref: "",
      });
      expect(res.error).toBeDefined();
    });

    it("rejects provider_ref when price_source is manual", async () => {
      const res = await createHolding({
        asset_type: "stock",
        symbol: "BBCA",
        name: "Bank Central Asia",
        quantity: "100",
        avg_cost: "9500",
        price_currency: "IDR",
        price_source: "manual",
        provider_ref: "bbca",
      });
      expect(res.error).toBeDefined();
    });

    it("accepts valid holding with manual price", async () => {
      mockSingle.mockResolvedValueOnce({ data: { id: "stock-1" }, error: null });
      const res = await createHolding({
        asset_type: "stock",
        symbol: "BBCA",
        name: "Bank Central Asia",
        quantity: "500",
        avg_cost: "9200",
        price_currency: "IDR",
        price_source: "manual",
        manual_price: "9800",
      });
      expect(res.success).toBe(true);
    });
  });

  describe("updateHolding", () => {
    it("updates existing holding", async () => {
      const res = await updateHolding("holding-123", {
        asset_type: "stock",
        symbol: "BBCA",
        name: "Bank Central Asia",
        quantity: "600",
        avg_cost: "9300",
        price_currency: "IDR",
        price_source: "manual",
        manual_price: "10000",
      });
      expect(res.success).toBe(true);
    });
  });

  describe("deleteHolding", () => {
    it("deletes holding", async () => {
      const res = await deleteHolding("holding-123");
      expect(res.success).toBe(true);
    });
  });
});
