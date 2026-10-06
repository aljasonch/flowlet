export function getTodayDate(timezone?: string | null): string {
  let tz = timezone || "UTC";

  // Validate timezone name
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
  } catch {
    tz = "UTC";
  }

  // Format as YYYY-MM-DD using ISO / en-CA locale in the specified timezone
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  return formatter.format(new Date());
}
