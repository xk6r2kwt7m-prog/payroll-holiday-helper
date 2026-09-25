/** Fetch every page; callers must order by a unique key for stable boundaries. */
export async function fetchAllRows<T>(
  fetchPage: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
  pageSize = 1000,
): Promise<T[]> {
  if (!Number.isInteger(pageSize) || pageSize < 1) throw new Error("Invalid page size");
  const rows: T[] = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await fetchPage(from, from + pageSize - 1);
    if (error) throw new Error(error.message);
    if (!data) throw new Error("The database returned no data. Please retry.");
    rows.push(...data);
    if (data.length < pageSize) return rows;
  }
}
