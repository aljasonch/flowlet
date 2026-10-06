import { createClient, getUser } from "@/lib/supabase/server";
import { TransactionForm } from "@/components/transactions/TransactionForm";

export default async function NewTransactionPage() {
  const supabase = await createClient();
  const user = await getUser();

  if (!user) return null;

  // Only active (non-archived) categories and sources in add-form dropdowns
  const [categoriesRes, sourcesRes] = await Promise.all([
    supabase
      .from("categories")
      .select("id, name")
      .eq("user_id", user.id)
      .eq("is_archived", false)
      .order("name"),
    supabase
      .from("income_sources")
      .select("id, name")
      .eq("user_id", user.id)
      .eq("is_archived", false)
      .order("name"),
  ]);

  const categories = categoriesRes.data;
  const sources = sourcesRes.data;

  return (
    <div className="py-4">
      <TransactionForm
        categories={categories || []}
        sources={sources || []}
      />
    </div>
  );
}
