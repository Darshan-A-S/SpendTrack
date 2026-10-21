/**
 * Utility functions for currency conversion, parsing, and formatting.
 * Money is always stored as an integer (paise) to avoid floating point issues.
 * 1 Rupee = 100 Paise.
 */

export const MAX_PAISE = 99999999900; // 99,99,99,999 rupees in paise

/**
 * Parses a user input string (e.g. "123", "123.45", "12,345.50") into paise as an integer.
 * Returns null if invalid, negative, or exceeds maximum.
 */
export function parseToPaise(input: string): number | null {
  if (!input) return null;

  // Clean whitespace and commas
  const cleaned = input.trim().replace(/,/g, '');
  if (!cleaned) return null;

  // Validate format: digits with optional up to 2 decimal places
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(cleaned);
  if (!match) return null;

  const integerPart = match[1];
  const decimalPart = (match[2] || '').padEnd(2, '0');

  const rupees = parseInt(integerPart, 10);
  const paiseFrac = parseInt(decimalPart, 10);

  if (isNaN(rupees) || isNaN(paiseFrac)) return null;

  const totalPaise = rupees * 100 + paiseFrac;

  if (totalPaise <= 0 || totalPaise > MAX_PAISE) {
    return null;
  }

  return totalPaise;
}

/**
 * Converts paise to a decimal rupee string with 2 decimal places (e.g. 10050 -> "100.50").
 */
export function paiseToRupeeString(paise: number): string {
  const isNegative = paise < 0;
  const absPaise = Math.abs(Math.round(paise));
  const rupees = Math.floor(absPaise / 100);
  const remainder = absPaise % 100;
  const formatted = `${rupees}.${remainder.toString().padStart(2, '0')}`;
  return isNegative ? `-${formatted}` : formatted;
}

/**
 * Formats a number with Indian numbering system grouping (e.g., 12,34,567).
 */
export function formatIndianNumber(num: number | string): string {
  const str = num.toString();
  const [intPart] = str.split('.');
  
  if (intPart.length <= 3) {
    return intPart;
  }

  const lastThree = intPart.substring(intPart.length - 3);
  const otherNumbers = intPart.substring(0, intPart.length - 3);
  const formattedOther = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',');
  return `${formattedOther},${lastThree}`;
}

/**
 * Formats paise into a localized display string with currency symbol.
 * Example: formatCurrency(123456700, '₹', 'en-IN') -> "₹12,34,567.00"
 */
export function formatCurrency(
  paise: number,
  currencySymbol: string = '₹',
  locale: string = 'en-IN',
  includeDecimals: boolean = true
): string {
  const isNegative = paise < 0;
  const absPaise = Math.abs(Math.round(paise));
  const rupees = Math.floor(absPaise / 100);
  const remainder = absPaise % 100;

  let formattedInt: string;
  if (locale === 'en-IN' || currencySymbol === '₹') {
    formattedInt = formatIndianNumber(rupees);
  } else {
    formattedInt = rupees.toLocaleString(locale);
  }

  let result = currencySymbol ? `${currencySymbol}${formattedInt}` : formattedInt;

  if (includeDecimals) {
    result += `.${remainder.toString().padStart(2, '0')}`;
  }

  return isNegative ? `-${result}` : result;
}

/**
 * Sums an array of items by a paise property safely as integers.
 */
export function sumPaise<T>(items: T[], getPaise: (item: T) => number): number {
  return items.reduce((total, item) => total + (Math.round(getPaise(item)) || 0), 0);
}
