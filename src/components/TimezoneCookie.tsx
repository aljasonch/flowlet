"use client";

import { useEffect } from "react";

export function TimezoneCookie() {
  useEffect(() => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (tz) {
        document.cookie = `tz=${encodeURIComponent(tz)}; path=/; max-age=31536000; SameSite=Lax`;
      }
    } catch {
      // Ignore if browser prevents reading timezone
    }
  }, []);

  return null;
}
