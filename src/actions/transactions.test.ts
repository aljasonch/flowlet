import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createTransaction,
  updateTransaction,
  deleteTransaction,
} from "./transactions";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

const mockInsert = vi.fn();
const mockUpdate = vi.fn();
const mockDelete = vi.fn();
const mockEq = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: "test-user-id" } },
      }),
    },
    from: vi.fn(() => ({
      insert: mockInsert.mockResolvedValue({ error: null }),
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

describe("Transactions Server Actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Validation", () => {
    it("rejects zero or negative amount", async () => {
      const res1 = await createTransaction({
        type: "expense",
        amount: 0,
        date: "2026-10-05",
        category_id: "123e4567-e89b-12d3-a456-426614174000",
      });
      expect(res1.error).toBeDefined();

      const res2 = await createTransaction({
        type: "expense",
        amount: -50000,
        date: "2026-10-05",
        category_id: "123e4567-e89b-12d3-a456-426614174000",
      });
      expect(res2.error).toBeDefined();
    });

    it("rejects amount over maximum 9_999_999_999_999", async () => {
      const res = await createTransaction({
        type: "expense",
        amount: 10_000_000_000_000,
        date: "2026-10-05",
        category_id: "123e4567-e89b-12d3-a456-426614174000",
      });
      expect(res.error).toBeDefined();
    });

    it("rejects expense without category_id", async () => {
      // @ts-expect-error test invalid payload
      const res = await createTransaction({
        type: "expense",
        amount: 50000,
        date: "2026-10-05",
      });
      expect(res.error).toBeDefined();
    });

    it("rejects income without source_id", async () => {
      // @ts-expect-error test invalid payload
      const res = await createTransaction({
        type: "income",
        amount: 50000,
        date: "2026-10-05",
      });
      expect(res.error).toBeDefined();
    });

    it("accepts valid expense", async () => {
      mockInsert.mockResolvedValueOnce({ error: null });
      const res = await createTransaction({
        type: "expense",
        amount: 75000,
        date: "2026-10-05",
        category_id: "123e4567-e89b-12d3-a456-426614174000",
        note: "Groceries",
      });
      expect(res.success).toBe(true);
    });

    it("accepts valid income", async () => {
      mockInsert.mockResolvedValueOnce({ error: null });
      const res = await createTransaction({
        type: "income",
        amount: 10000000,
        date: "2026-10-05",
        source_id: "123e4567-e89b-12d3-a456-426614174001",
        note: "Monthly salary",
      });
      expect(res.success).toBe(true);
    });
  });

  describe("updateTransaction", () => {
    it("updates transaction with valid payload", async () => {
      const res = await updateTransaction("123e4567-e89b-12d3-a456-426614174002", {
        type: "expense",
        amount: 80000,
        date: "2026-10-06",
        category_id: "123e4567-e89b-12d3-a456-426614174000",
        note: "Updated note",
      });
      expect(res.success).toBe(true);
    });

    it("rejects invalid transaction id on update", async () => {
      const res = await updateTransaction("invalid-uuid", {
        type: "expense",
        amount: 80000,
        date: "2026-10-06",
        category_id: "123e4567-e89b-12d3-a456-426614174000",
      });
      expect(res.error).toBe("Invalid transaction ID");
    });
  });

  describe("deleteTransaction", () => {
    it("deletes user's transaction", async () => {
      const res = await deleteTransaction("123e4567-e89b-12d3-a456-426614174002");
      expect(res.success).toBe(true);
    });

    it("rejects invalid transaction id on delete", async () => {
      const res = await deleteTransaction("invalid-uuid");
      expect(res.error).toBe("Invalid transaction ID");
    });
  });
});

