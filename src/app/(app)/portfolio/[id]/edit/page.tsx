import React from "react";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { HoldingForm } from "@/components/portfolio/HoldingForm";

interface EditHoldingPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditHoldingPage({ params }: EditHoldingPageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: holding } = await supabase
    .from("holdings")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!holding) {
    notFound();
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="enter" style={{ "--i": 0 } as React.CSSProperties}>
        <h1 className="text-2xl font-bold text-[var(--text)] tracking-tight">
          Edit position
        </h1>
        <p className="text-xs text-[var(--text-muted)] mt-0.5">
          Update holding quantity, average cost, or manual price
        </p>
      </div>

      <div className="enter" style={{ "--i": 1 } as React.CSSProperties}>
        <HoldingForm
          isEdit
          initialData={{
            id: holding.id,
            asset_type: holding.asset_type,
            symbol: holding.symbol,
            name: holding.name,
            platform: holding.platform,
            quantity: holding.quantity,
            avg_cost: holding.avg_cost,
            price_currency: holding.price_currency,
            price_source: holding.price_source,
            provider_ref: holding.provider_ref,
            manual_price: holding.manual_price,
          }}
        />
      </div>
    </div>
  );
}
