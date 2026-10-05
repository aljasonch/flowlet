import React from "react";

export interface LogoProps {
  size?: number;
  className?: string;
  showWordmark?: boolean;
  showSubtitle?: boolean;
  ariaLabel?: string;
}

export function Logo({
  size = 32,
  className = "",
  showWordmark = false,
  showSubtitle = false,
  ariaLabel = "Flowlet logo",
}: LogoProps) {
  const mark = (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 ${className}`}
      aria-label={ariaLabel}
      role="img"
    >
      <rect
        width="64"
        height="64"
        rx="16"
        className="fill-[var(--accent)]"
      />
      <rect x="18" y="16" width="7" height="32" rx="3.5" fill="#FFFFFF" />
      <path
        d="M22 20C30 20 42 18 46 22C46.8 22.8 46 25 44 26C38 28.5 28 27 22 27V20Z"
        fill="#FFFFFF"
      />
      <path
        d="M22 31C28 31 36 29.5 39 32.5C39.6 33.1 39 35 37.5 35.8C33 37.5 27 36.5 22 36.5V31Z"
        fill="#FFFFFF"
      />
      <circle cx="43" cy="34" r="2.5" fill="#5FCB92" />
    </svg>
  );

  if (!showWordmark) {
    return mark;
  }

  return (
    <div className="flex items-center gap-2.5">
      {mark}
      <div className="flex flex-col justify-center min-w-0">
        <span className="text-base font-semibold text-[var(--text)] tracking-tight leading-tight">
          Flowlet
        </span>
        {showSubtitle && (
          <span className="text-xs text-[var(--text-muted)] leading-tight mt-0.5">
            Personal cash & assets
          </span>
        )}
      </div>
    </div>
  );
}
