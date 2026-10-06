export function isPriceStale(
  priceSource: "manual" | "coingecko",
  priceAsOf: string | null | undefined,
  now = new Date()
): boolean {
  if (!priceAsOf) return true;
  const asOfTime = new Date(priceAsOf).getTime();
  if (isNaN(asOfTime)) return true;
  const diffHours = (now.getTime() - asOfTime) / (1000 * 60 * 60);

  if (priceSource === "manual") {
    // Stale when manual price is older than 30 days (720 hours)
    return diffHours > 30 * 24;
  }
  // Stale when automatic quote is older than 24 hours
  return diffHours > 24;
}

export function formatTimeAgo(dateString: string | null | undefined): string {
  if (!dateString) return "Never";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "Unknown";

  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 30) return `${diffDays}d ago`;
  return `${Math.floor(diffDays / 30)}mo ago`;
}
