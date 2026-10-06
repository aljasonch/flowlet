export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

export function daysInMonth(year: number, month: number): number {
  if (month === 2) {
    return isLeapYear(year) ? 29 : 28;
  }
  if ([4, 6, 9, 11].includes(month)) {
    return 30;
  }
  return 31;
}

function formatDate(year: number, month: number, day: number): string {
  const y = String(year).padStart(4, "0");
  const m = String(month).padStart(2, "0");
  const d = String(day).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function periodStart(year: number, month: number, startDay: number): string {
  const maxDay = daysInMonth(year, month);
  const clampedDay = Math.min(startDay, maxDay);
  return formatDate(year, month, clampedDay);
}

export function periodEnd(year: number, month: number, startDay: number): string {
  const nextYear = month === 12 ? year + 1 : year;
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextStartDay = Math.min(startDay, daysInMonth(nextYear, nextMonth));

  if (nextStartDay > 1) {
    return formatDate(nextYear, nextMonth, nextStartDay - 1);
  }

  // If next period starts on the 1st, this period ends on the last day of current month
  return formatDate(year, month, daysInMonth(year, month));
}

export function getCurrentPeriod(
  today: string,
  startDay: number
): { year: number; month: number } {
  const [yearStr, monthStr] = today.split("-");
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);

  const start = periodStart(year, month, startDay);

  if (today < start) {
    if (month === 1) {
      return { year: year - 1, month: 12 };
    }
    return { year, month: month - 1 };
  }

  return { year, month };
}

export function formatPeriodRange(start: string, end: string): string {
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
  ];
  const formatSingle = (s: string) => {
    const [y, m, d] = s.split("-").map(Number);
    return `${d} ${months[m - 1]} ${y}`;
  };
  return `${formatSingle(start)} – ${formatSingle(end)}`;
}

export function formatPeriodMonth(year: number, month: number): string {
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  return `${months[month - 1]} ${year}`;
}

export function getAdjacentPeriod(
  year: number,
  month: number,
  offset: number
): { year: number; month: number } {
  let m = month + offset;
  let y = year;
  while (m > 12) {
    m -= 12;
    y += 1;
  }
  while (m < 1) {
    m += 12;
    y -= 1;
  }
  return { year: y, month: m };
}
