import { paiseToRupeeString } from './money';

export interface CsvExpenseRow {
  date: string;
  amount_paise: number;
  category_name: string;
  payment_method?: string | null;
  note?: string | null;
}

/**
 * Escapes a field for CSV according to RFC 4180.
 */
function escapeCsvCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Converts a list of expense rows to CSV string.
 * Columns: date, amount, category, payment_method, note
 */
export function generateExpensesCsv(rows: CsvExpenseRow[]): string {
  const headers = ['date', 'amount', 'category', 'payment_method', 'note'];
  const lines: string[] = [headers.join(',')];

  for (const row of rows) {
    const formattedAmount = paiseToRupeeString(row.amount_paise);
    const line = [
      escapeCsvCell(row.date),
      escapeCsvCell(formattedAmount),
      escapeCsvCell(row.category_name),
      escapeCsvCell(row.payment_method || ''),
      escapeCsvCell(row.note || ''),
    ].join(',');
    lines.push(line);
  }

  return lines.join('\n');
}
