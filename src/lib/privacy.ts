import { useSyncExternalStore } from "react";

const STORAGE_KEY = "hide_financial_numbers";
const LEGACY_KEY = "portfolio_hide_numbers";

const listeners = new Set<() => void>();

function emitChange() {
  for (const listener of listeners) {
    listener();
  }
}

function subscribe(callback: () => void) {
  listeners.add(callback);
  const onStorage = () => callback();
  if (typeof window !== "undefined") {
    window.addEventListener("storage", onStorage);
  }
  return () => {
    listeners.delete(callback);
    if (typeof window !== "undefined") {
      window.removeEventListener("storage", onStorage);
    }
  };
}

export function getPrivacySnapshot(): boolean {
  try {
    if (typeof localStorage === "undefined") return false;
    return (
      localStorage.getItem(STORAGE_KEY) === "true" ||
      localStorage.getItem(LEGACY_KEY) === "true"
    );
  } catch {
    return false;
  }
}

const getServerSnapshot = () => false;

export function usePrivacyMode(): boolean {
  return useSyncExternalStore(subscribe, getPrivacySnapshot, getServerSnapshot);
}

export function togglePrivacyMode(): void {
  try {
    const current = getPrivacySnapshot();
    const next = !current;
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(STORAGE_KEY, String(next));
      localStorage.setItem(LEGACY_KEY, String(next));
    }
    emitChange();
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("storage"));
    }
  } catch {
    // Ignore storage errors
  }
}
