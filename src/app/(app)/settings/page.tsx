import { createClient, getUser } from "@/lib/supabase/server";
import { SettingsView } from "@/components/settings/SettingsView";

export default async function SettingsPage() {
  const supabase = await createClient();
  const user = await getUser();

  if (!user) {
    return null;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("month_start_day, currency, usd_idr_rate, usd_idr_rate_updated_at")
    .eq("user_id", user.id)
    .single();

  const { data: categories } = await supabase
    .from("categories")
    .select("id, name, is_archived")
    .eq("user_id", user.id)
    .order("name");

  const { data: sources } = await supabase
    .from("income_sources")
    .select("id, name, is_archived")
    .eq("user_id", user.id)
    .order("name");

  return (
    <SettingsView
      initialProfile={
        profile || {
          month_start_day: 1,
          currency: "IDR",
          usd_idr_rate: null,
          usd_idr_rate_updated_at: null,
        }
      }
      initialCategories={categories || []}
      initialSources={sources || []}
    />
  );
}
