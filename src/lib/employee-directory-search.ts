/** Search only directory identifiers, never banking, NI or other protected fields. */
export function matchesEmployeeSearch(employee: {
  forename: string; surname: string; department: string; employee_ref?: string | null;
}, query: string): boolean {
  const normalise = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const tokens = normalise(query).trim().split(/\s+/).filter(Boolean);
  const text = normalise([employee.forename, employee.surname, employee.department, employee.employee_ref || ""].join(" "));
  return tokens.every(token => text.includes(token));
}
