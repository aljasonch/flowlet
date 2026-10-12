"use client";

import React from "react";
import { motion } from "motion/react";

export interface ToggleOption {
  value: string;
  label: string;
}

export interface SegmentedToggleProps {
  options: ToggleOption[];
  value: string;
  onChange: (value: string) => void;
  layoutId?: string;
  className?: string;
}

export function SegmentedToggle({
  options,
  value,
  onChange,
  layoutId = "segmented-toggle",
  className = "",
}: SegmentedToggleProps) {
  return (
    <div
      role="radiogroup"
      className={`relative inline-flex p-1 rounded-(--radius-control) glass-strong border border-(--glass-border) ${className}`}
    >
      {options.map((option) => {
        const isSelected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={isSelected}
            onClick={() => onChange(option.value)}
            className={`relative z-10 px-4 py-1.5 text-xs font-medium rounded-[calc(var(--radius-control)-4px)] transition-colors duration-(--dur-fast) focus:outline-none ${
              isSelected
                ? "text-(--accent-contrast)"
                : "text-(--text-muted) hover:text-(--text)"
            }`}
          >
            {isSelected && (
              <motion.div
                layoutId={layoutId}
                transition={{ type: "spring", stiffness: 450, damping: 35 }}
                className="absolute inset-0 rounded-[calc(var(--radius-control)-4px)] bg-(--accent) shadow-sm -z-10"
              />
            )}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
