import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  updateMonthStartDay,
  updateUsdIdrRate,
  addCategory,
} from "./settings";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

const mockUpdate = vi.fn();
const mockInsert = vi.fn();
const mockEq = vi.fn();

vi.mock("@/lib/supabase/server", () => {
  return {
    createClient: vi.fn().mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "test-user-id" } },
        }),
      },
      from: vi.fn(() => ({
        update: mockUpdate.mockReturnValue({
          eq: mockEq.mockReturnValue({
            eq: mockEq.mockResolvedValue({ error: null }),
          }),
        }),
        insert: mockInsert.mockResolvedValue({ error: null }),
      })),
    }),
  };
});

describe("Settings Server Actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("updateMonthStartDay", () => {
    it("rejects day below 1", async () => {
      const result = await updateMonthStartDay(0);
      expect(result.error).toBeDefined();
    });

    it("rejects day above 31", async () => {
      const result = await updateMonthStartDay(32);
      expect(result.error).toBeDefined();
    });

    it("accepts valid day between 1 and 31", async () => {
      mockEq.mockResolvedValue({ error: null });
      const result = await updateMonthStartDay(25);
      expect(result.success).toBe(true);
    });
  });

  describe("updateUsdIdrRate", () => {
    it("rejects zero rate", async () => {
      const result = await updateUsdIdrRate(0);
      expect(result.error).toBe("Rate must be greater than 0");
    });

    it("rejects negative rate", async () => {
      const result = await updateUsdIdrRate(-15000);
      expect(result.error).toBe("Rate must be greater than 0");
    });

    it("accepts valid positive rate", async () => {
      mockEq.mockResolvedValue({ error: null });
      const result = await updateUsdIdrRate(16250);
      expect(result.success).toBe(true);
    });
  });

  describe("addCategory", () => {
    it("rejects empty category name", async () => {
      const result = await addCategory("");
      expect(result.error).toBeDefined();
    });

    it("rejects names over 50 characters", async () => {
      const result = await addCategory("A".repeat(51));
      expect(result.error).toBeDefined();
    });
  });
});
