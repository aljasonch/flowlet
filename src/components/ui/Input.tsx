"use client";

import React from "react";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, className = "", id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-xs font-medium text-(--text-muted) mb-1"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`w-full glass-strong rounded-(--radius-control) border border-(--glass-border) px-3 py-2 text-sm text-(--text) placeholder-(--text-muted) focus:outline-none focus:ring-2 focus:ring-(--accent) transition-colors ${
            error ? "border-(--negative) focus:ring-(--negative)" : ""
          } ${className}`}
          {...props}
        />
        {hint && !error && (
          <p className="mt-1 text-xs text-(--text-muted)">{hint}</p>
        )}
        {error && (
          <p className="mt-1 text-xs text-(--negative)">{error}</p>
        )}
      </div>
    );
  }
);
Input.displayName = "Input";
