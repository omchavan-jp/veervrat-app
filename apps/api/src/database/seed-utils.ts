import * as fs from 'node:fs';

export const TIER_MAP: Record<string, 'LOCAL' | 'NATIONAL' | 'INTERNATIONAL'> = {
  local: 'LOCAL',
  national: 'NATIONAL',
  international: 'INTERNATIONAL',
};

export function parseWeaknessNames(raw: string): string[] {
  return raw
    .split('|')
    .map((s) => s.trim())
    .filter(Boolean);
}

// RFC 4180 parser — handles quoted fields containing commas and embedded newlines
export function splitCsvRows(content: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < content.length; i++) {
    const ch = content[i];
    const next = content[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        field += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        field += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        row.push(field);
        field = '';
      } else if (ch === '\r' && next === '\n') {
        row.push(field);
        field = '';
        rows.push(row);
        row = [];
        i++;
      } else if (ch === '\n') {
        row.push(field);
        field = '';
        rows.push(row);
        row = [];
      } else {
        field += ch;
      }
    }
  }
  if (field || row.length) {
    row.push(field);
    if (row.some((f) => f !== '')) rows.push(row);
  }

  return rows;
}

export async function parseCsv(filePath: string): Promise<Record<string, string>[]> {
  const content = await fs.promises.readFile(filePath, 'utf-8');
  const rows = splitCsvRows(content);
  if (rows.length < 2) return [];
  const headers = rows[0];
  return rows.slice(1).map((cols) => {
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => {
      obj[h.trim()] = (cols[i] ?? '').trim();
    });
    return obj;
  });
}
