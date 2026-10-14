import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { createClient as createCookieClient } from "@/lib/supabase/server";
import { createClient as createJsClient } from "@supabase/supabase-js";
import { POST } from "./route";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@supabase/supabase-js", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/prices/coingecko", () => ({
  coingecko: { fetchPrices: vi.fn() },
}));
vi.mock("@/lib/prices/fx", () => ({ fetchLiveUsdIdrRate: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

// Minimal thenable query builder: terminal await resolves per select() args.
function mockDb(opts: { holdings?: unknown[]; usdCount?: number }) {
  const terminal = (selectArgs: unknown[]) => {
    const isCount =
      Array.isArray(selectArgs) &&
      selectArgs.length === 2 &&
      typeof selectArgs[1] === "object";
    return isCount
      ? { data: null, error: null, count: opts.usdCount ?? 0 }
      : { data: opts.holdings ?? [], error: null };
  };
  const chain: Record<string, unknown> = {};
  let selectArgs: unknown[] = [];
  chain.select = vi.fn((...args: unknown[]) => {
    selectArgs = args;
    return chain;
  });
  chain.eq = vi.fn(() => chain);
  chain.order = vi.fn(() => chain);
  chain.limit = vi.fn(() => chain);
  chain.maybeSingle = vi.fn(() => Promise.resolve({ data: null }));
  chain.then = (resolve: (v: unknown) => unknown) =>
    Promise.resolve(terminal(selectArgs)).then(resolve);
  return { from: vi.fn(() => chain) };
}

function authedClient(db: ReturnType<typeof mockDb>, userId = "user-1") {
  return {
    ...db,
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: userId } } }) },
  };
}

function unauthedClient(db: ReturnType<typeof mockDb>) {
  return {
    ...db,
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
  };
}

function postReq(token?: string) {
  return new NextRequest("http://localhost/api/prices/refresh", {
    method: "POST",
    headers: token ? { authorization: `Bearer ${token}` } : {},
  });
}

describe("POST /api/prices/refresh auth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
  });

  it("returns 401 when neither cookie session nor Bearer token authenticates", async () => {
    vi.mocked(createCookieClient).mockResolvedValue(
      unauthedClient(mockDb({})) as never
    );
    const res = await POST(postReq());
    expect(res.status).toBe(401);
    expect(createJsClient).not.toHaveBeenCalled();
  });

  it("authenticates Flutter Bearer token via anon-key client and refreshes", async () => {
    const bearer = authedClient(mockDb({ holdings: [], usdCount: 0 }));
    vi.mocked(createJsClient).mockReturnValue(bearer as never);
    const res = await POST(postReq("flutter-user-jwt"));
    expect(createJsClient).toHaveBeenCalledOnce();
    const [, anonKey, options] = vi.mocked(createJsClient).mock.calls[0] as [
      string,
      string,
      { global: { headers: { Authorization: string } } },
    ];
    expect(anonKey).toBe("test-anon-key");
    expect(options.global.headers.Authorization).toBe(
      "Bearer flutter-user-jwt"
    );
    expect(createCookieClient).not.toHaveBeenCalled();
    const body = await res.json();
    expect(body).toMatchObject({ refreshed: true, updated: 0 });
  });

  it("keeps cookie auth working for the web app", async () => {
    vi.mocked(createCookieClient).mockResolvedValue(
      authedClient(mockDb({ holdings: [], usdCount: 0 })) as never
    );
    const res = await POST(postReq());
    expect(createJsClient).not.toHaveBeenCalled();
    const body = await res.json();
    expect(body).toMatchObject({ refreshed: true, updated: 0 });
  });

  it("returns 401 when the Bearer token is invalid", async () => {
    vi.mocked(createJsClient).mockReturnValue(
      unauthedClient(mockDb({})) as never
    );
    const res = await POST(postReq("bad-jwt"));
    expect(res.status).toBe(401);
  });
});
