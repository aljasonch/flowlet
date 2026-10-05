import { createClient } from "@/lib/supabase/server";
import { TransactionForm } from "@/components/transactions/TransactionForm";

export default async function NewTransactionPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // Only active (non-archived) categories and sources in add-form dropdowns
  const { data: categories } = await supabase
    .from("categories")
    .select("id, name")
    .eq("user_id", user.id)
    .eq("is_archived", false)
    .order("name");

  const { data: sources } = await supabase
    .from("income_sources")
    .select("id, name")
    .eq("user_id", user.id)
    .eq("is_archived", false)
    .order("name");

  return (
    <div className="py-4">
      <TransactionForm
        categories={categories || []}
        sources={sources || []}
      />
    </div>
  );
}
