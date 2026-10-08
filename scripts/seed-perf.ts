/**
 * Performance Benchmark Seeding Script
 * Test data only - never run in production.
 *
 * Seeds 3,000 transactions across the user's categories and income sources,
 * then benchmarks the execution time of the 4 Dashboard RPC functions
 * to verify they execute in under 2,000 ms.
 *
 * Usage:
 *   npx tsx scripts/seed-perf.ts <user-email> <user-password>
 */

import { createClient } from "@supabase/supabase-js";
import type { Database } from "../src/types/database";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in environment.");
  process.exit(1);
}

const email = process.argv[2] || process.env.TEST_USER_EMAIL;
const password = process.argv[3] || process.env.TEST_USER_PASSWORD;

if (!email || !password) {
  console.log("Usage: npx tsx scripts/seed-perf.ts <user-email> <user-password>");
  console.log("Alternatively set TEST_USER_EMAIL and TEST_USER_PASSWORD environment variables.");
  process.exit(0);
}

const userEmail = email as string;
const userPassword = password as string;

const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

async function run() {
  console.log(`Authenticating as ${userEmail}...`);
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: userEmail,
    password: userPassword,
  });

  if (authError || !authData.user) {
    console.error("Authentication failed:", authError?.message);
    process.exit(1);
  }

  const userId = authData.user.id;
  console.log(`Authenticated user ID: ${userId}`);

  // Fetch categories and income sources
  const [catRes, srcRes] = await Promise.all([
    supabase.from("categories").select("id, name").eq("is_archived", false),
    supabase.from("income_sources").select("id, name").eq("is_archived", false),
  ]);

  const categories = catRes.data || [];
  const sources = srcRes.data || [];

  if (categories.length === 0 || sources.length === 0) {
    console.error("User has no categories or income sources to seed transactions for.");
    process.exit(1);
  }

  console.log(`Found ${categories.length} categories and ${sources.length} income sources.`);

  const TOTAL_COUNT = 3000;
  const BATCH_SIZE = 250;
  console.log(`Generating ${TOTAL_COUNT} transactions...`);

  type NewTransaction = Database["public"]["Tables"]["transactions"]["Insert"];
  const transactions: NewTransaction[] = [];

  const startDate = new Date("2025-01-01").getTime();
  const endDate = new Date("2026-10-01").getTime();

  for (let i = 0; i < TOTAL_COUNT; i++) {
    const isExpense = Math.random() < 0.85; // 85% expenses, 15% income
    const randomTime = startDate + Math.random() * (endDate - startDate);
    const dateObj = new Date(randomTime);
    const yyyy = dateObj.getFullYear();
    const mm = String(dateObj.getMonth() + 1).padStart(2, "0");
    const dd = String(dateObj.getDate()).padStart(2, "0");
    const dateStr = `${yyyy}-${mm}-${dd}`;

    if (isExpense) {
      const cat = categories[Math.floor(Math.random() * categories.length)];
      // Expense between 10,000 and 1,500,000 IDR
      const amount = Math.floor(Math.random() * 149 + 1) * 10000;
      transactions.push({
        user_id: userId,
        type: "expense",
        amount,
        date: dateStr,
        category_id: cat.id,
        source_id: null,
        note: `Perf test expense #${i + 1}`,
      });
    } else {
      const src = sources[Math.floor(Math.random() * sources.length)];
      // Income between 1,000,000 and 20,000,000 IDR
      const amount = Math.floor(Math.random() * 20 + 1) * 1000000;
      transactions.push({
        user_id: userId,
        type: "income",
        amount,
        date: dateStr,
        category_id: null,
        source_id: src.id,
        note: `Perf test income #${i + 1}`,
      });
    }
  }

  console.log(`Inserting ${TOTAL_COUNT} transactions in batches of ${BATCH_SIZE}...`);
  const insertStart = performance.now();

  for (let i = 0; i < transactions.length; i += BATCH_SIZE) {
    const batch = transactions.slice(i, i + BATCH_SIZE);
    const { error: insertErr } = await supabase.from("transactions").insert(batch);
    if (insertErr) {
      console.error(`Batch insert failed at index ${i}:`, insertErr.message);
      process.exit(1);
    }
    process.stdout.write(`Inserted ${Math.min(i + BATCH_SIZE, transactions.length)} / ${transactions.length}\r`);
  }

  const insertDuration = (performance.now() - insertStart).toFixed(0);
  console.log(`\nSuccessfully seeded ${TOTAL_COUNT} transactions in ${insertDuration} ms.`);

  // Benchmark Dashboard RPCs
  console.log("\nBenchmarking Dashboard SQL RPC queries for period 2026-09...");
  const benchStart = performance.now();

  const [summary, cats, srcs, trend] = await Promise.all([
    supabase.rpc("month_summary", { p_year: 2026, p_month: 9 }),
    supabase.rpc("spending_by_category", { p_year: 2026, p_month: 9 }),
    supabase.rpc("income_by_source", { p_year: 2026, p_month: 9 }),
    supabase.rpc("monthly_trend", { p_year: 2026, p_month: 9, p_months: 6 }),
  ]);

  const benchDuration = performance.now() - benchStart;

  console.log("--- Dashboard RPC Benchmark Results ---");
  console.log(`month_summary returned:`, summary.data);
  console.log(`spending_by_category returned ${cats.data?.length ?? 0} categories.`);
  console.log(`income_by_source returned ${srcs.data?.length ?? 0} sources.`);
  console.log(`monthly_trend returned ${trend.data?.length ?? 0} months.`);
  console.log(`Total query execution time: ${benchDuration.toFixed(2)} ms.`);

  if (benchDuration < 2000) {
    console.log(`PASS: Dashboard queries executed in under 2,000 ms (${benchDuration.toFixed(2)} ms).`);
  } else {
    console.warn(`WARNING: Dashboard queries took longer than 2,000 ms (${benchDuration.toFixed(2)} ms).`);
  }
}

run().catch((err) => {
  console.error("Unexpected error in perf script:", err);
  process.exit(1);
});
