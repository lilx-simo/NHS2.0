import { sanitizeCsvCell } from "@/lib/security";

type CsvRow = Record<string, string | number | null | undefined>;

export function downloadCSV(data: CsvRow[], filename: string): void {
  if (data.length === 0) return;
  const headers = Object.keys(data[0]);
  // Headers are developer-controlled so no injection risk, but sanitise for consistency
  const headerRow = headers.map((h) => sanitizeCsvCell(h)).join(",");
  const rows = data.map((row) =>
    headers.map((h) => sanitizeCsvCell(row[h])).join(",")
  );
  const csv = "﻿" + [headerRow, ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
