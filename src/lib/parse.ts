const MAX_AMOUNT = 9_999_999_999_999;

export function parseAmountInput(input: string): number {
  if (!input) return 0;
  const digits = input.replace(/\D/g, "");
  if (!digits) return 0;
  const parsed = parseInt(digits, 10);
  if (isNaN(parsed)) return 0;
  return Math.min(parsed, MAX_AMOUNT);
}

export function parseDecimalInput(input: string): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (!trimmed) return null;

  // Dots are ignored as thousand separators, never treated as decimal points
  const withoutDots = trimmed.replace(/\./g, "");

  // Comma is the decimal separator (Indonesian convention)
  const commaCount = (withoutDots.match(/,/g) || []).length;
  if (commaCount > 1) return null;

  const normalized = withoutDots.replace(",", ".");

  // Check valid non-negative decimal string (only digits and at most one decimal point)
  if (!/^\d+(\.\d+)?$/.test(normalized)) {
    return null;
  }

  return normalized;
}

export function escapeIlike(input: string): string {
  return input.replace(/[%_\\]/g, "\\$&");
}

