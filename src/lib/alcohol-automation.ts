/**
 * Front-of-house alcohol authorisation — pure helpers, no DB access.
 *
 * Rules that must not be broken:
 *  - Nobody is authorised by the system. A person reads the document and signs
 *    it themselves; the DPS or personal licence holder still approves it.
 *  - Back-of-house roles are never asked automatically. The manager can always
 *    send to anyone by hand.
 *  - A person is never asked twice while a live request or authorisation exists.
 */

/** Words in a job title (or department) that mean the person serves customers. */
const FOH_WORDS = [
  "front of house",
  "foh",
  "waiter",
  "waitress",
  "server",
  "service",
  "bar",
  "bartender",
  "barback",
  "barista",
  "host",
  "hostess",
  "floor",
  "runner",
  "cashier",
  "till",
  "counter",
  "restaurant manager",
  "assistant manager",
  "general manager",
  "duty manager",
  "shift manager",
  "supervisor",
  "team leader",
];

/** Words that mean the person does not serve alcohol as part of their job. */
const BACK_OF_HOUSE_WORDS = [
  "back of house",
  "boh",
  "kitchen",
  "chef",
  "cook",
  "commis",
  "kp",
  "kitchen porter",
  "dishwash",
  "prep",
  "cleaner",
  "maintenance",
  "delivery driver",
  "office",
  "accounts",
  "hr",
];

const norm = (v?: string | null) => (v ?? "").toLowerCase().trim();

function hasWord(haystack: string, words: string[]): boolean {
  return words.some((w) => haystack.includes(w));
}

/**
 * Best guess at whether someone works front of house, from their job title and
 * department. Only used to pre-select people — a manager can always override.
 */
export function isFrontOfHouse(jobTitle?: string | null, department?: string | null): boolean {
  const text = `${norm(jobTitle)} ${norm(department)}`.trim();
  if (!text) return false;
  if (hasWord(text, BACK_OF_HOUSE_WORDS) && !hasWord(text, ["bar", "front of house", "foh"])) {
    return false;
  }
  return hasWord(text, FOH_WORDS);
}

export type AlcoholAskState =
  | "authorised"
  | "awaiting_approval"
  | "awaiting_signature"
  | "declined"
  | "not_asked";

export interface AlcoholRequestLike {
  employee_id?: string | null;
  status?: string | null;
  is_test_record?: boolean | null;
  expires_at?: string | null;
}

export interface AlcoholAuthorisationLike {
  employee_id?: string | null;
  status?: string | null;
  revoked_at?: string | null;
}

export interface AlcoholStaffLike {
  id: string;
  forename?: string | null;
  surname?: string | null;
  email?: string | null;
  job_title?: string | null;
  department?: string | null;
  branch?: string | null;
  status?: string | null;
  archived_at?: string | null;
  is_test_record?: boolean | null;
}

const LIVE_REQUEST_STATUSES = ["sent", "viewed", "read", "signed"];

/** Where this person stands on the alcohol authorisation right now. */
export function alcoholAskState(
  employeeId: string,
  requests: AlcoholRequestLike[],
  authorisations: AlcoholAuthorisationLike[],
  now = new Date()
): AlcoholAskState {
  const live = authorisations.filter(
    (a) => a.employee_id === employeeId && !a.revoked_at
  );
  if (live.some((a) => a.status === "approved" || a.status === "active")) return "authorised";
  if (live.some((a) => a.status === "signed")) return "awaiting_approval";

  const mine = requests.filter((r) => r.employee_id === employeeId && !r.is_test_record);
  const stillOpen = mine.filter(
    (r) => !r.expires_at || new Date(r.expires_at).getTime() > now.getTime()
  );
  if (stillOpen.some((r) => LIVE_REQUEST_STATUSES.includes(r.status ?? ""))) {
    if (stillOpen.some((r) => r.status === "signed")) return "awaiting_approval";
    return "awaiting_signature";
  }
  if (mine.some((r) => r.status === "declined")) return "declined";
  return "not_asked";
}

export function alcoholAskStateLabel(state: AlcoholAskState): string {
  switch (state) {
    case "authorised": return "Authorised to sell alcohol";
    case "awaiting_approval": return "Signed — waiting for your approval";
    case "awaiting_signature": return "Sent — waiting for them to sign";
    case "declined": return "Said they are not ready to sign";
    default: return "Not asked yet";
  }
}

/** True when it is fair to email this person the authorisation now. */
export function needsAlcoholAsk(
  employee: AlcoholStaffLike,
  requests: AlcoholRequestLike[],
  authorisations: AlcoholAuthorisationLike[],
  now = new Date()
): boolean {
  if (employee.archived_at) return false;
  if (employee.is_test_record) return false;
  if (employee.status === "leaver") return false;
  if (!employee.email) return false;
  const state = alcoholAskState(employee.id, requests, authorisations, now);
  return state === "not_asked" || state === "declined";
}

/**
 * Front-of-house staff at a site who should be asked to sign, name order.
 * `includeAllRoles` sends to everyone with an email instead of guessing roles.
 */
export function staffNeedingAlcoholAsk(
  employees: AlcoholStaffLike[],
  requests: AlcoholRequestLike[],
  authorisations: AlcoholAuthorisationLike[],
  options: { branch?: string; includeAllRoles?: boolean; now?: Date } = {}
): AlcoholStaffLike[] {
  const now = options.now ?? new Date();
  return employees
    .filter((e) => !options.branch || e.branch === options.branch)
    .filter((e) => options.includeAllRoles || isFrontOfHouse(e.job_title, e.department))
    .filter((e) => needsAlcoholAsk(e, requests, authorisations, now))
    .sort((a, b) =>
      `${a.forename ?? ""} ${a.surname ?? ""}`.localeCompare(`${b.forename ?? ""} ${b.surname ?? ""}`)
    );
}

export interface AlcoholPreferences {
  auto_alcohol_authorisation?: boolean;
  auto_alcohol_all_roles?: boolean;
}

export function shouldAutoAskAlcohol(prefs?: AlcoholPreferences | null): boolean {
  return prefs?.auto_alcohol_authorisation === true;
}
