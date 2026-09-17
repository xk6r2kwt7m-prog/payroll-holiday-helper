// Mirror of src/lib/alcohol-automation.ts so the daily job asks exactly the
// same people the screen shows. Keep the two in step.

const FOH_WORDS = [
  "front of house", "foh", "waiter", "waitress", "server", "service", "bar",
  "bartender", "barback", "barista", "host", "hostess", "floor", "runner",
  "cashier", "till", "counter", "restaurant manager", "assistant manager",
  "general manager", "duty manager", "shift manager", "supervisor", "team leader",
];

const BACK_OF_HOUSE_WORDS = [
  "back of house", "boh", "kitchen", "chef", "cook", "commis", "kp",
  "kitchen porter", "dishwash", "prep", "cleaner", "maintenance",
  "delivery driver", "office", "accounts", "hr",
];

const norm = (v?: string | null) => (v ?? "").toLowerCase().trim();
const hasWord = (text: string, words: string[]) => words.some((w) => text.includes(w));

export function isFrontOfHouse(jobTitle?: string | null, department?: string | null): boolean {
  const text = `${norm(jobTitle)} ${norm(department)}`.trim();
  if (!text) return false;
  if (hasWord(text, BACK_OF_HOUSE_WORDS) && !hasWord(text, ["bar", "front of house", "foh"])) {
    return false;
  }
  return hasWord(text, FOH_WORDS);
}

const LIVE_REQUEST_STATUSES = ["sent", "viewed", "read", "signed"];

/** True when this person already has an open request or a live authorisation. */
export function hasLiveAlcoholRecord(
  employeeId: string,
  requests: { employee_id?: string | null; status?: string | null; expires_at?: string | null; is_test_record?: boolean | null }[],
  authorisations: { employee_id?: string | null; status?: string | null; revoked_at?: string | null }[],
  now: Date
): boolean {
  const liveAuth = authorisations.some(
    (a) =>
      a.employee_id === employeeId &&
      !a.revoked_at &&
      ["approved", "active", "signed"].includes(a.status ?? "")
  );
  if (liveAuth) return true;

  return requests.some(
    (r) =>
      r.employee_id === employeeId &&
      !r.is_test_record &&
      LIVE_REQUEST_STATUSES.includes(r.status ?? "") &&
      (!r.expires_at || new Date(r.expires_at).getTime() > now.getTime())
  );
}
