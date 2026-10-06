import React from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function EmptyDashboard() {
  return (
    <div className="glass p-8 text-center flex flex-col items-center justify-center space-y-4">
      <p className="text-sm text-[var(--text-muted)] max-w-sm">
        No transactions recorded for this period.
      </p>
      <Link href="/transactions/new">
        <Button variant="primary">
          <Plus className="w-4 h-4 mr-2" />
          Add transaction
        </Button>
      </Link>
    </div>
  );
}
