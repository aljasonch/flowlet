import { useSyncExternalStore } from "react";

/** Kept in sync with the Tailwind breakpoints (defaults, in px). */
const BREAKPOINTS = { sm: 640, lg: 1024 } as const;

export type Breakpoint = keyof typeof BREAKPOINTS;

function getMql(bp: Breakpoint): MediaQueryList | null {
  if (typeof window === "undefined" || !window.matchMedia) return null;
  return window.matchMedia(`(min-width: ${BREAKPOINTS[bp]}px)`);
}

const noop = () => {};

/**
 * Tracks a CSS breakpoint on the client. The server snapshot is always false, so
 * hydration matches SSR; React then checks the live value and re-renders if it
 * differs. This keeps charts out of containers that are `display: none` at the
 * current width: Recharts measures those as 0x0 and warns, and the ResizeObserver
 * it installs never re-fires when the container becomes visible.
 */
export function useMediaQuery(bp: Breakpoint): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mql = getMql(bp);
      if (!mql) return noop;
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    },
    () => getMql(bp)?.matches ?? false,
    () => false,
  );
}
