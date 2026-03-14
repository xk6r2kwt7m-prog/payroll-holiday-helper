/**
 * Generic CSV export utility.
 * Converts an array of flat objects into a downloadable CSV file.
 */

export interface CsvColumn<T> {
  header: string;
  accessor: (row: T) => string | number | null | undefined;
}

export function exportToCsv<T>(
  filename: string,
  columns: CsvColumn<T>[],
  rows: T[]
) {
  const headers = columns.map((c) => `"${c.header}"`).join(",");
  const body = rows
    .map((row) =>
      columns
        .map((col) => {
          const val = col.accessor(row);
          if (val === null || val === undefined) return "";
          const str = String(val).replace(/"/g, '""');
          return `"${str}"`;
        })
        .join(",")
    )
    .join("\n");

  const csv = `${headers}\n${body}`;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
