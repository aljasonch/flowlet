import { describe, it, expect, vi } from "vitest";
import { login } from "./auth";

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: {
      signInWithPassword: vi.fn().mockResolvedValue({
        error: { message: "Invalid login credentials" },
      }),
      getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
      signOut: vi.fn().mockResolvedValue({}),
    },
  }),
}));

describe("Auth Server Actions", () => {
  it("rejects invalid email address", async () => {
    const formData = new FormData();
    formData.append("email", "not-an-email");
    formData.append("password", "secret123");

    const result = await login(null, formData);
    expect(result.error).toBe("Please enter a valid email address");
  });

  it("rejects empty password", async () => {
    const formData = new FormData();
    formData.append("email", "valid@example.com");
    formData.append("password", "");

    const result = await login(null, formData);
    expect(result.error).toBe("Password is required");
  });

  it("returns error message when credentials fail", async () => {
    const formData = new FormData();
    formData.append("email", "wrong@example.com");
    formData.append("password", "wrongpassword");

    const result = await login(null, formData);
    expect(result.error).toBe("Invalid login credentials");
  });
});
