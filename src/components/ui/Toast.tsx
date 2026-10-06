"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { CheckCircle2, AlertCircle, X } from "lucide-react";

export type ToastType = "success" | "error" | "info";

export interface ToastItem {
  id: string;
  message: string;
  type?: ToastType;
}

interface ToastContextType {
  toast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const toast = useCallback((message: string, type: ToastType = "info") => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed z-50 flex flex-col gap-2 pointer-events-none inset-x-3 top-[calc(env(safe-area-inset-top)+0.75rem)] sm:inset-x-auto sm:top-auto sm:bottom-6 sm:right-6 sm:w-full sm:max-w-sm">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.22, ease: [0.2, 0, 0, 1] }}
              className="pointer-events-auto glass-strong rounded-[var(--radius-control)] border border-[var(--glass-border)] p-3 sm:p-3.5 shadow-lg flex items-center justify-between gap-3 text-sm text-[var(--text)]"
            >
              <div className="flex items-center gap-2 min-w-0">
                {t.type === "success" && (
                  <CheckCircle2
                    size={18}
                    strokeWidth={1.75}
                    className="text-[var(--positive)] shrink-0"
                  />
                )}
                {t.type === "error" && (
                  <AlertCircle
                    size={18}
                    strokeWidth={1.75}
                    className="text-[var(--negative)] shrink-0"
                  />
                )}
                <span>{t.message}</span>
              </div>
              <button
                type="button"
                onClick={() => removeToast(t.id)}
                aria-label="Dismiss toast"
                className="text-[var(--text-muted)] hover:text-[var(--text)] p-0.5 rounded hover:bg-black/5 dark:hover:bg-white/5 transition-colors focus:outline-none"
              >
                <X size={16} strokeWidth={1.75} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
