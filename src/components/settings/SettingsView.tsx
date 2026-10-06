"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import {
  updateMonthStartDay,
  updateUsdIdrRate,
  refreshLiveExchangeRate,
  addCategory,
  renameCategory,
  toggleArchiveCategory,
  addIncomeSource,
  renameIncomeSource,
  toggleArchiveIncomeSource,
} from "@/actions/settings";
import { Edit2, Archive, RotateCcw, RefreshCw } from "lucide-react";

interface Category {
  id: string;
  name: string;
  is_archived: boolean;
}

interface IncomeSource {
  id: string;
  name: string;
  is_archived: boolean;
}

interface SettingsViewProps {
  initialProfile: {
    month_start_day: number;
    currency: string;
    usd_idr_rate: number | null;
    usd_idr_rate_updated_at: string | null;
  };
  initialCategories: Category[];
  initialSources: IncomeSource[];
}

export function SettingsView({
  initialProfile,
  initialCategories,
  initialSources,
}: SettingsViewProps) {
  const { toast } = useToast();

  // Month start day state
  const [startDay, setStartDay] = useState(initialProfile.month_start_day);
  const [isUpdatingDay, setIsUpdatingDay] = useState(false);

  // USD to IDR rate state
  const [usdRate, setUsdRate] = useState<string>(
    initialProfile.usd_idr_rate?.toString() ?? ""
  );
  const [rateUpdatedAt, setRateUpdatedAt] = useState<string | null>(
    initialProfile.usd_idr_rate_updated_at
  );
  const [isUpdatingRate, setIsUpdatingRate] = useState(false);
  const [isFetchingLiveRate, setIsFetchingLiveRate] = useState(false);

  // Category states
  const [categories] = useState<Category[]>(initialCategories);
  const [newCatName, setNewCatName] = useState("");
  const [catError, setCatError] = useState("");
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editingCatName, setEditingCatName] = useState("");

  // Income source states
  const [sources] = useState<IncomeSource[]>(initialSources);
  const [newSourceName, setNewSourceName] = useState("");
  const [sourceError, setSourceError] = useState("");
  const [editingSourceId, setEditingSourceId] = useState<string | null>(null);
  const [editingSourceName, setEditingSourceName] = useState("");

  const handleSaveMonthStart = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdatingDay(true);
    const res = await updateMonthStartDay(Number(startDay));
    setIsUpdatingDay(false);

    if (res.error) {
      toast(res.error, "error");
    } else {
      toast(
        "Month start day updated. Cash-flow reports will recompute based on this day.",
        "success"
      );
    }
  };

  const handleSaveRate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdatingRate(true);
    const parsedRate = usdRate.trim() ? parseFloat(usdRate) : null;
    const res = await updateUsdIdrRate(parsedRate);
    setIsUpdatingRate(false);

    if (res.error) {
      toast(res.error, "error");
    } else {
      setRateUpdatedAt(new Date().toISOString());
      toast("USD to IDR rate updated successfully", "success");
    }
  };

  const handleFetchLiveRate = async () => {
    setIsFetchingLiveRate(true);
    const res = await refreshLiveExchangeRate();
    setIsFetchingLiveRate(false);

    if (res.error) {
      toast(res.error, "error");
    } else if (res.data?.rate) {
      setUsdRate(res.data.rate.toString());
      setRateUpdatedAt(new Date().toISOString());
      toast(
        `Live exchange rate updated: 1 USD = Rp ${res.data.rate.toLocaleString("id-ID")}`,
        "success"
      );
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setCatError("");
    if (!newCatName.trim()) return;

    const res = await addCategory(newCatName.trim());
    if (res.error) {
      setCatError(res.error);
    } else {
      setNewCatName("");
      toast("Category added", "success");
    }
  };

  const handleRenameCategory = async (id: string) => {
    setCatError("");
    if (!editingCatName.trim()) return;

    const res = await renameCategory(id, editingCatName.trim());
    if (res.error) {
      setCatError(res.error);
    } else {
      setEditingCatId(null);
      toast("Category renamed", "success");
    }
  };

  const handleToggleArchiveCat = async (id: string, currentArchived: boolean) => {
    const res = await toggleArchiveCategory(id, !currentArchived);
    if (res.error) {
      toast(res.error, "error");
    } else {
      toast(
        !currentArchived ? "Category archived" : "Category restored",
        "success"
      );
    }
  };

  const handleAddSource = async (e: React.FormEvent) => {
    e.preventDefault();
    setSourceError("");
    if (!newSourceName.trim()) return;

    const res = await addIncomeSource(newSourceName.trim());
    if (res.error) {
      setSourceError(res.error);
    } else {
      setNewSourceName("");
      toast("Income source added", "success");
    }
  };

  const handleRenameSource = async (id: string) => {
    setSourceError("");
    if (!editingSourceName.trim()) return;

    const res = await renameIncomeSource(id, editingSourceName.trim());
    if (res.error) {
      setSourceError(res.error);
    } else {
      setEditingSourceId(null);
      toast("Income source renamed", "success");
    }
  };

  const handleToggleArchiveSource = async (id: string, currentArchived: boolean) => {
    const res = await toggleArchiveIncomeSource(id, !currentArchived);
    if (res.error) {
      toast(res.error, "error");
    } else {
      toast(
        !currentArchived ? "Income source archived" : "Income source restored",
        "success"
      );
    }
  };

  const activeCategories = categories.filter((c) => !c.is_archived);
  const archivedCategories = categories.filter((c) => c.is_archived);

  const activeSources = sources.filter((s) => !s.is_archived);
  const archivedSources = sources.filter((s) => s.is_archived);

  return (
    <div className="space-y-8 max-w-4xl">
      <div className="enter" style={{ "--i": 0 } as React.CSSProperties}>
        <h1 className="text-2xl font-semibold text-[var(--text)]">Settings</h1>
        <p className="text-sm text-[var(--text-muted)] mt-1">
          Configure cash flow rules, reporting preferences, and categories
        </p>
      </div>

      {/* General Settings */}
      <section
        className="enter glass p-6 space-y-6"
        style={{ "--i": 1 } as React.CSSProperties}
      >
        <h2 className="text-base font-semibold text-[var(--text)] border-b border-[var(--glass-border)] pb-2">
          Reporting preferences
        </h2>

        <form onSubmit={handleSaveMonthStart} className="space-y-3">
          <div className="max-w-xs">
            <Input
              label="Month start day (1 - 31)"
              type="number"
              min={1}
              max={31}
              value={startDay}
              onChange={(e) => setStartDay(parseInt(e.target.value, 10) || 1)}
              required
            />
          </div>
          <p className="text-xs text-[var(--text-muted)]">
            Cash-flow reports compute based on this day. Past transactions will not be modified.
          </p>
          <Button type="submit" size="sm" disabled={isUpdatingDay}>
            {isUpdatingDay ? "Saving..." : "Save month start day"}
          </Button>
        </form>

        <div className="pt-2 border-t border-[var(--glass-border)]">
          <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">
            Reporting currency
          </label>
          <div className="glass-strong rounded-[var(--radius-control)] border border-[var(--glass-border)] px-3 py-2 text-sm text-[var(--text)] max-w-xs">
            Indonesian Rupiah (IDR)
          </div>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Cash-flow reporting currency is fixed to IDR.
          </p>
        </div>

        <form
          onSubmit={handleSaveRate}
          className="pt-2 border-t border-[var(--glass-border)] space-y-3"
        >
          <div className="max-w-xs">
            <Input
              label="USD to IDR exchange rate"
              type="number"
              step="any"
              placeholder="e.g. 16200"
              value={usdRate}
              onChange={(e) => setUsdRate(e.target.value)}
            />
          </div>
          {rateUpdatedAt && (
            <p className="text-xs text-[var(--text-muted)]">
              Last updated: {new Date(rateUpdatedAt).toLocaleString("id-ID")}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="submit"
              size="sm"
              variant="secondary"
              disabled={isUpdatingRate || isFetchingLiveRate}
            >
              {isUpdatingRate ? "Saving..." : "Save exchange rate"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={isUpdatingRate || isFetchingLiveRate}
              onClick={handleFetchLiveRate}
            >
              <RefreshCw
                className={`w-3.5 h-3.5 mr-1.5 ${
                  isFetchingLiveRate ? "animate-spin" : ""
                }`}
              />
              {isFetchingLiveRate ? "Fetching live rate..." : "Fetch live rate"}
            </Button>
          </div>
        </form>
      </section>

      {/* Expense Categories */}
      <section
        className="enter glass p-6 space-y-4"
        style={{ "--i": 2 } as React.CSSProperties}
      >
        <h2 className="text-base font-semibold text-[var(--text)] border-b border-[var(--glass-border)] pb-2">
          Expense categories
        </h2>

        <form onSubmit={handleAddCategory} className="flex gap-2 max-w-md">
          <Input
            placeholder="New category name"
            value={newCatName}
            onChange={(e) => setNewCatName(e.target.value)}
            error={catError}
          />
          <Button type="submit" size="md">
            Add
          </Button>
        </form>

        <div className="mt-4 space-y-2">
          <h3 className="text-xs font-semibold text-[var(--text-muted)]">
            Active categories
          </h3>
          <div className="divide-y divide-[var(--glass-border)] glass-strong rounded-[var(--radius-panel)] border border-[var(--glass-border)] overflow-hidden">
            {activeCategories.map((cat) => (
              <div
                key={cat.id}
                className="p-3 flex items-center justify-between gap-3 text-sm"
              >
                {editingCatId === cat.id ? (
                  <div className="flex items-center gap-2 flex-1">
                    <Input
                      value={editingCatName}
                      onChange={(e) => setEditingCatName(e.target.value)}
                      autoFocus
                    />
                    <Button size="sm" onClick={() => handleRenameCategory(cat.id)}>
                      Save
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setEditingCatId(null)}
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <>
                    <span className="font-medium text-[var(--text)]">{cat.name}</span>
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setEditingCatId(cat.id);
                          setEditingCatName(cat.name);
                        }}
                        aria-label={`Rename ${cat.name}`}
                      >
                        <Edit2 size={16} strokeWidth={1.75} />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleToggleArchiveCat(cat.id, cat.is_archived)}
                        aria-label={`Archive ${cat.name}`}
                      >
                        <Archive size={16} strokeWidth={1.75} />
                      </Button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>

        {archivedCategories.length > 0 && (
          <div className="mt-4 space-y-2">
            <h3 className="text-xs font-semibold text-[var(--text-muted)]">
              Archived categories
            </h3>
            <div className="divide-y divide-[var(--glass-border)] glass-strong rounded-[var(--radius-panel)] border border-[var(--glass-border)] opacity-70">
              {archivedCategories.map((cat) => (
                <div
                  key={cat.id}
                  className="p-3 flex items-center justify-between text-sm"
                >
                  <span className="text-[var(--text-muted)]">{cat.name}</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleToggleArchiveCat(cat.id, cat.is_archived)}
                    aria-label={`Restore ${cat.name}`}
                  >
                    <RotateCcw size={16} strokeWidth={1.75} />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Income Sources */}
      <section
        className="enter glass p-6 space-y-4"
        style={{ "--i": 3 } as React.CSSProperties}
      >
        <h2 className="text-base font-semibold text-[var(--text)] border-b border-[var(--glass-border)] pb-2">
          Income sources
        </h2>

        <form onSubmit={handleAddSource} className="flex gap-2 max-w-md">
          <Input
            placeholder="New income source name"
            value={newSourceName}
            onChange={(e) => setNewSourceName(e.target.value)}
            error={sourceError}
          />
          <Button type="submit" size="md">
            Add
          </Button>
        </form>

        <div className="mt-4 space-y-2">
          <h3 className="text-xs font-semibold text-[var(--text-muted)]">
            Active sources
          </h3>
          <div className="divide-y divide-[var(--glass-border)] glass-strong rounded-[var(--radius-panel)] border border-[var(--glass-border)] overflow-hidden">
            {activeSources.map((source) => (
              <div
                key={source.id}
                className="p-3 flex items-center justify-between gap-3 text-sm"
              >
                {editingSourceId === source.id ? (
                  <div className="flex items-center gap-2 flex-1">
                    <Input
                      value={editingSourceName}
                      onChange={(e) => setEditingSourceName(e.target.value)}
                      autoFocus
                    />
                    <Button size="sm" onClick={() => handleRenameSource(source.id)}>
                      Save
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setEditingSourceId(null)}
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <>
                    <span className="font-medium text-[var(--text)]">
                      {source.name}
                    </span>
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setEditingSourceId(source.id);
                          setEditingSourceName(source.name);
                        }}
                        aria-label={`Rename ${source.name}`}
                      >
                        <Edit2 size={16} strokeWidth={1.75} />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          handleToggleArchiveSource(source.id, source.is_archived)
                        }
                        aria-label={`Archive ${source.name}`}
                      >
                        <Archive size={16} strokeWidth={1.75} />
                      </Button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>

        {archivedSources.length > 0 && (
          <div className="mt-4 space-y-2">
            <h3 className="text-xs font-semibold text-[var(--text-muted)]">
              Archived sources
            </h3>
            <div className="divide-y divide-[var(--glass-border)] glass-strong rounded-[var(--radius-panel)] border border-[var(--glass-border)] opacity-70">
              {archivedSources.map((source) => (
                <div
                  key={source.id}
                  className="p-3 flex items-center justify-between text-sm"
                >
                  <span className="text-[var(--text-muted)]">{source.name}</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      handleToggleArchiveSource(source.id, source.is_archived)
                    }
                    aria-label={`Restore ${source.name}`}
                  >
                    <RotateCcw size={16} strokeWidth={1.75} />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
