import React from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { HoldingForm } from "@/components/portfolio/HoldingForm";

export default async function NewHoldingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="enter" style={{ "--i": 0 } as React.CSSProperties}>
        <h1 className="text-2xl font-bold text-[var(--text)] tracking-tight">
          Add position
        </h1>
        <p className="text-xs text-[var(--text-muted)] mt-0.5">
          Record a new asset holding in your portfolio
        </p>
      </div>

      <div className="enter" style={{ "--i": 1 } as React.CSSProperties}>
        <HoldingForm />
      </div>
    </div>
  );
}
