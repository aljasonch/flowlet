import { cache } from "react";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/types/database";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // Ignored if middleware refreshes sessions.
          }
        },
      },
    }
  );
}

export const getUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

export const getDebtsSummary = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.rpc("debts_summary");
  return (
    data?.[0] ?? {
      total_unpaid_debt: 0,
      total_unpaid_receivable: 0,
      unpaid_debt_count: 0,
      unpaid_receivable_count: 0,
      overdue_count: 0,
    }
  );
});


