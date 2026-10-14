import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";
import { coingecko } from "@/lib/prices/coingecko";
import { fetchLiveUsdIdrRate } from "@/lib/prices/fx";
import type { PriceCurrency, Quote } from "@/lib/prices/types";

// Client for non-browser callers (e.g. the Flutter app) that authenticate
// with an Authorization: Bearer <user-jwt> header instead of cookies.
// Uses the anon key only; the JWT is verified by supabase.auth.getUser()
// and RLS applies to every query. The service_role key is never used.
function createBearerClient(token: string) {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  );
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const token =
    authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : null;
  const supabase = token ? createBearerClient(token) : await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 1. Fetch user's CoinGecko holdings and check for USD holdings
  const [{ data: holdings, error: holdingsErr }, { count: usdCount }] =
    await Promise.all([
      supabase
        .from("holdings")
        .select("provider_ref, price_currency")
        .eq("user_id", user.id)
        .eq("price_source", "coingecko"),
      supabase
        .from("holdings")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("price_currency", "USD"),
    ]);

  if (holdingsErr) {
    return NextResponse.json(
      { refreshed: false, reason: "db_error", message: holdingsErr.message },
      { status: 500 }
    );
  }

  // Refresh USD/IDR exchange rate if user has USD holdings
  let fxUpdated = false;
  if (usdCount && usdCount > 0) {
    try {
      const liveRate = await fetchLiveUsdIdrRate();
      await supabase
        .from("profiles")
        .update({
          usd_idr_rate: liveRate,
          usd_idr_rate_updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id);
      fxUpdated = true;
    } catch (fxErr) {
      console.warn("Failed to auto-refresh USD/IDR exchange rate:", fxErr);
    }
  }

  if (!holdings || holdings.length === 0) {
    if (fxUpdated) {
      revalidatePath("/portfolio");
      revalidatePath("/");
    }
    return NextResponse.json({
      refreshed: true,
      updated: 0,
      failed: [],
      fetchedAt: new Date().toISOString(),
      fxUpdated,
    });
  }

  // 2. Throttle check: if newest quote is under 60 seconds old, reject call
  const { data: newestQuote } = await supabase
    .from("price_quotes")
    .select("fetched_at")
    .eq("user_id", user.id)
    .eq("source", "coingecko")
    .order("fetched_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (newestQuote?.fetched_at) {
    const elapsed = Date.now() - new Date(newestQuote.fetched_at).getTime();
    if (elapsed < 60_000) {
      return NextResponse.json({
        refreshed: false,
        reason: "throttled",
      });
    }
  }

  // 3. Group provider refs by currency
  const idrRefs = new Set<string>();
  const usdRefs = new Set<string>();

  for (const h of holdings) {
    if (h.provider_ref && h.provider_ref.trim() !== "") {
      const ref = h.provider_ref.trim().toLowerCase();
      if (h.price_currency === "USD") {
        usdRefs.add(ref);
      } else {
        idrRefs.add(ref);
      }
    }
  }

  const allQuotes: Quote[] = [];
  const failed: string[] = [];

  try {
    if (idrRefs.size > 0) {
      const refs = Array.from(idrRefs);
      const quotes = await coingecko.fetchPrices(refs, "IDR" as PriceCurrency);
      allQuotes.push(...quotes);
      const returnedRefs = new Set(quotes.map((q) => q.ref));
      for (const r of refs) {
        if (!returnedRefs.has(r)) failed.push(r);
      }
    }

    if (usdRefs.size > 0) {
      const refs = Array.from(usdRefs);
      const quotes = await coingecko.fetchPrices(refs, "USD" as PriceCurrency);
      allQuotes.push(...quotes);
      const returnedRefs = new Set(quotes.map((q) => q.ref));
      for (const r of refs) {
        if (!returnedRefs.has(r)) failed.push(r);
      }
    }
  } catch (err) {
    console.error("CoinGecko provider error:", err);
    // Keep existing quotes untouched on provider failure
    return NextResponse.json({
      refreshed: false,
      reason: "provider_error",
    });
  }

  // 4. Upsert quotes into database
  if (allQuotes.length > 0) {
    const upsertRows = allQuotes.map((q) => ({
      user_id: user.id,
      source: "coingecko" as const,
      ref: q.ref,
      currency: q.currency,
      price: q.price,
      fetched_at: q.fetchedAt,
    }));

    const { error: upsertErr } = await supabase
      .from("price_quotes")
      .upsert(upsertRows, {
        onConflict: "user_id,source,ref,currency",
      });

    if (upsertErr) {
      return NextResponse.json(
        { refreshed: false, reason: "db_error", message: upsertErr.message },
        { status: 500 }
      );
    }
  }

  revalidatePath("/portfolio");
  revalidatePath("/");

  return NextResponse.json({
    refreshed: true,
    updated: allQuotes.length,
    failed,
    fetchedAt: new Date().toISOString(),
    fxUpdated,
  });
}
