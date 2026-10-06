import { notFound } from "next/navigation";
import { createClient, getUser } from "@/lib/supabase/server";
import { TransactionForm } from "@/components/transactions/TransactionForm";

interface EditTransactionPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditTransactionPage({
  params,
}: EditTransactionPageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const user = await getUser();

  if (!user) return null;

  const { data: transaction } = await supabase
    .from("transactions")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!transaction) {
    notFound();
  }

  // Categories & sources: include active ones or the currently assigned one
  const [categoriesRes, sourcesRes] = await Promise.all([
    supabase
      .from("categories")
      .select("id, name, is_archived")
      .eq("user_id", user.id)
      .or(`is_archived.eq.false,id.eq.${transaction.category_id || "00000000-0000-0000-0000-000000000000"}`)
      .order("name"),
    supabase
      .from("income_sources")
      .select("id, name, is_archived")
      .eq("user_id", user.id)
      .or(`is_archived.eq.false,id.eq.${transaction.source_id || "00000000-0000-0000-0000-000000000000"}`)
      .order("name"),
  ]);

  const categories = categoriesRes.data;
  const sources = sourcesRes.data;

  return (
    <div className="py-4">
      <TransactionForm
        categories={categories || []}
        sources={sources || []}
        initialData={{
          id: transaction.id,
          type: transaction.type,
          amount: Number(transaction.amount),
          date: transaction.date,
          category_id: transaction.category_id,
          source_id: transaction.source_id,
          note: transaction.note,
        }}
      />
    </div>
  );
}
