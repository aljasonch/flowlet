import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createDebt,
  recordDebtPayment,
  deleteDebt,
  deleteDebtPayment,
} from "./debts";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

const mockInsert = vi.fn();
const mockDelete = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: "test-user-id" } },
      }),
    },
    from: vi.fn((table: string) => {
      if (table === "debts") {
        return {
          insert: mockInsert.mockResolvedValue({ error: null }),
          delete: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: mockDelete.mockResolvedValue({ error: null }),
            }),
          }),
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: "debt-123",
                    user_id: "test-user-id",
                    type: "debt",
                    person_name: "Budi",
                    amount: 1000000,
                  },
                  error: null,
                }),
              }),
            }),
          }),
        };
      }
      if (table === "transactions") {
        return {
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { id: "tx-123" },
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === "debt_payments") {
        return {
          insert: mockInsert.mockResolvedValue({ error: null }),
          delete: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: mockDelete.mockResolvedValue({ error: null }),
            }),
          }),
        };
      }
      return {
        insert: mockInsert.mockResolvedValue({ error: null }),
      };
    }),
  }),
}));

describe("Debts Server Actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createDebt", () => {
    it("fails on empty person_name", async () => {
      const formData = new FormData();
      formData.set("type", "debt");
      formData.set("person_name", "");
      formData.set("amount", "100000");
      formData.set("date", "2026-10-05");

      const result = await createDebt(null, formData);
      expect(result.error).toBeDefined();
      expect(mockInsert).not.toHaveBeenCalled();
    });

    it("fails on zero or negative amount", async () => {
      const formData = new FormData();
      formData.set("type", "debt");
      formData.set("person_name", "Budi");
      formData.set("amount", "0");
      formData.set("date", "2026-10-05");

      const result = await createDebt(null, formData);
      expect(result.error).toBeDefined();
      expect(mockInsert).not.toHaveBeenCalled();
    });

    it("successfully creates a valid debt", async () => {
      const formData = new FormData();
      formData.set("type", "debt");
      formData.set("person_name", "Budi");
      formData.set("amount", "1000000");
      formData.set("date", "2026-10-05");
      formData.set("due_date", "2026-10-25");
      formData.set("note", "Pinjam uang");

      const result = await createDebt(null, formData);
      expect(result.error).toBeUndefined();
      expect(result.success).toBe(true);
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "debt",
          person_name: "Budi",
          amount: 1000000,
          date: "2026-10-05",
          due_date: "2026-10-25",
        })
      );
    });
  });

  describe("recordDebtPayment", () => {
    it("fails on zero or invalid payment amount", async () => {
      const formData = new FormData();
      formData.set("amount", "0");
      formData.set("payment_date", "2026-10-05");

      const result = await recordDebtPayment("debt-123", null, formData);
      expect(result.error).toBeDefined();
    });

    it("successfully records payment without cashflow sync", async () => {
      const formData = new FormData();
      formData.set("amount", "500000");
      formData.set("payment_date", "2026-10-05");
      formData.set("record_to_cashflow", "false");

      const result = await recordDebtPayment("debt-123", null, formData);
      expect(result.error).toBeUndefined();
      expect(result.success).toBe(true);
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          debt_id: "debt-123",
          amount: 500000,
          payment_date: "2026-10-05",
          transaction_id: null,
        })
      );
    });

    it("successfully records payment with cashflow sync for debt", async () => {
      const formData = new FormData();
      formData.set("amount", "500000");
      formData.set("payment_date", "2026-10-05");
      formData.set("record_to_cashflow", "true");
      formData.set("category_id", "cat-123");

      const result = await recordDebtPayment("debt-123", null, formData);
      expect(result.error).toBeUndefined();
      expect(result.success).toBe(true);
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          debt_id: "debt-123",
          amount: 500000,
          payment_date: "2026-10-05",
          transaction_id: "tx-123",
        })
      );
    });
  });

  describe("deleteDebt", () => {
    it("deletes the debt for the authenticated user", async () => {
      const result = await deleteDebt("debt-123");
      expect(result.error).toBeUndefined();
      expect(result.success).toBe(true);
      expect(mockDelete).toHaveBeenCalled();
    });
  });

  describe("deleteDebtPayment", () => {
    it("deletes the debt payment for the authenticated user", async () => {
      const result = await deleteDebtPayment("payment-123");
      expect(result.error).toBeUndefined();
      expect(result.success).toBe(true);
      expect(mockDelete).toHaveBeenCalled();
    });
  });
});
