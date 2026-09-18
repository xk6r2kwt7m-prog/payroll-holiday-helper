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
  return classifyRole(jobTitle, department) === "front_of_house";
}

/** What the words in a role say about serving alcohol. */
export type RoleClass = "front_of_house" | "back_of_house" | "unclear";

/**
 * Classifies a role from its wording. A blank or unrecognised role is
 * "unclear" — never quietly treated as back of house, so the manager is asked
 * to decide instead of the person being missing from the alcohol list.
 */
export function classifyRole(jobTitle?: string | null, department?: string | null): RoleClass {
  const text = `${norm(jobTitle)} ${norm(department)}`.trim();
  if (!text) return "unclear";
  if (hasWord(text, BACK_OF_HOUSE_WORDS) && !hasWord(text, ["bar", "front of house", "foh"])) {
    return "back_of_house";
  }
  if (hasWord(text, FOH_WORDS)) return "front_of_house";
  return "unclear";
}

export type AlcoholListDecisionValue = "front_of_house" | "not_front_of_house";

export interface AlcoholListDecision {
  employee_id: string;
  branch?: string | null;
  decision: AlcoholListDecisionValue;
}

/** The manager's recorded decision for this person at this site, if any. */
export function decisionFor(
  employeeId: string,
  branch: string | null | undefined,
  decisions: AlcoholListDecision[] = [],
): AlcoholListDecisionValue | null {
  const wanted = norm(branch);
  const match = decisions.find(
    (d) => d.employee_id === employeeId && (!wanted || norm(d.branch) === wanted),
  );
  return match?.decision ?? null;
}

/**
 * Whether this person belongs on the site alcohol list. A recorded manager
 * decision always wins over the word-list guess.
 */
export function belongsOnAlcoholList(
  employee: { id: string; job_title?: string | null; department?: string | null },
  branch: string | null | undefined,
  decisions: AlcoholListDecision[] = [],
): boolean {
  const decided = decisionFor(employee.id, branch, decisions);
  if (decided) return decided === "front_of_house";
  return classifyRole(employee.job_title, employee.department) === "front_of_house";
}

/**
 * True when nobody has decided and the wording does not settle it — the person
 * appears in the "role not clear" list for the manager to decide.
 */
export function needsRoleDecision(
  employee: { id: string; job_title?: string | null; department?: string | null },
  branch: string | null | undefined,
  decisions: AlcoholListDecision[] = [],
): boolean {
  if (decisionFor(employee.id, branch, decisions)) return false;
  return classifyRole(employee.job_title, employee.department) === "unclear";
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
