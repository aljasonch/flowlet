"use client";

import React from "react";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { variant = "primary", size = "md", className = "", children, ...props },
    ref
  ) => {
    const baseStyles =
      "inline-flex items-center justify-center font-medium rounded-(--radius-control) transition-all duration-(--dur-fast) ease-(--ease) active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none focus:outline-none focus:ring-2 focus:ring-(--accent)";

    const sizeStyles = {
      sm: "px-3 py-1.5 text-xs",
      md: "px-4 py-2 text-sm",
      lg: "px-5 py-2.5 text-base",
    }[size];

    const variantStyles = {
      primary:
        "bg-(--accent) text-(--accent-contrast) hover:opacity-90 shadow-sm",
      secondary:
        "glass text-(--text) hover:bg-(--glass-strong) border border-(--glass-border)",
      danger: "bg-(--negative) text-white hover:opacity-90 shadow-sm",
      ghost:
        "text-(--text-muted) hover:text-(--text) hover:bg-black/5 dark:hover:bg-white/5",
    }[variant];

    return (
      <button
        ref={ref}
        className={`${baseStyles} ${sizeStyles} ${variantStyles} ${className}`}
        {...props}
      >
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";
