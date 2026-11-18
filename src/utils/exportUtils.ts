/**
 * File export utilities for AquaWatt
 * Generates and triggers actual browser downloads of CSV and JSON telemetry datasets.
 */

export function downloadCsv(filename: string, headers: string[], rows: (string | number | null | undefined)[][]): void {
  const csvRows: string[] = [];

  // Add header row
  csvRows.push(headers.map(h => `"${String(h).replace(/"/g, '""')}"`).join(','));

  // Add data rows
  for (const row of rows) {
    csvRows.push(row.map(val => `"${val == null ? '' : String(val).replace(/"/g, '""')}"`).join(','));
  }

  const csvString = csvRows.join('\r\n');
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
  triggerDownload(filename, blob);
}

export function downloadJson(filename: string, data: unknown): void {
  const jsonString = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8;' });
  triggerDownload(filename, blob);
}

function triggerDownload(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
