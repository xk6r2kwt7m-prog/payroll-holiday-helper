/** Shared by the secure form and service; confirmations are never persisted. */
export const normaliseNi = (v: string) => v.replace(/[\s-]/g, "").toUpperCase();
export const validNi = (v: string) => {
  const n = normaliseNi(v);
  return /^[ABCEGHJKLMNOPRSTWXYZ][ABCEGHJKLMNPRSTWXYZ]\d{6}[A-D]$/.test(n)
    && !/^(BG|GB|KN|NK|NT|TN|ZZ)/.test(n);
};
export function niProblems(personal: Record<string, string>, confirmation?: string): string[] {
  const number = personal.ni_number || "";
  if (!number) return personal.no_ni_number === "yes" ? [] : ["Give your NI number or select that you do not have one yet"];
  if (!validNi(number)) return ["That National Insurance number does not look right"];
  if (normaliseNi(number) !== normaliseNi(confirmation || "")) return ["The two National Insurance numbers do not match"];
  return [];
}
export function withoutConfirmations(value: unknown): Record<string, Record<string, string>> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value).filter(([key]) => ["personal", "bank", "rtw", "emergency", "notes"].includes(key)).map(([key, section]) => [key,
    Object.fromEntries(Object.entries(section && typeof section === "object" ? section : {}).filter(([k,v]) => !k.startsWith("confirm_") && typeof v === "string").map(([k,v]) => [k, String(v)]))
  ]));
}
