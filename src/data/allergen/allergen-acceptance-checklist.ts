/**
 * Hands-on acceptance checklist for the draft Ugly Dumpling Allergen Safety course.
 *
 * These are checks a person completes by hand on a real device. Nothing here is
 * automated, and nothing here may be presented as proof that the course is
 * accessible: an automated check passing is not an accessibility statement.
 */

export type AcceptanceEnvironment =
  | "smartphone"
  | "desktop"
  | "keyboard_only"
  | "screen_reader"
  | "interrupted_connection";

export const ACCEPTANCE_ENVIRONMENTS: {
  key: AcceptanceEnvironment;
  label: string;
  how: string;
}[] = [
  {
    key: "smartphone",
    label: "Smartphone",
    how: "Open the preview on your own phone, holding it as a member of staff would during a break.",
  },
  {
    key: "desktop",
    label: "Desktop or laptop",
    how: "Open the preview in a normal browser window on a computer.",
  },
  {
    key: "keyboard_only",
    label: "Keyboard only",
    how: "Put the mouse aside. Move with Tab, Shift+Tab, Enter and the space bar only.",
  },
  {
    key: "screen_reader",
    label: "Screen reader, where available",
    how: "VoiceOver on iPhone or Mac, TalkBack on Android, Narrator or NVDA on Windows. Record 'Not tested' with a comment if none is available.",
  },
  {
    key: "interrupted_connection",
    label: "Interrupted internet connection",
    how: "Turn flight mode on part-way through a lesson and part-way through the assessment, then turn it off again.",
  },
];

export type AcceptanceResult = "pass" | "pass_with_observation" | "fail" | "not_tested";

export const ACCEPTANCE_RESULT_LABELS: Record<AcceptanceResult, string> = {
  pass: "Pass",
  pass_with_observation: "Pass with observation",
  fail: "Fail",
  not_tested: "Not tested",
};

/** A comment is required for anything that is not a plain or observed pass. */
export function acceptanceCommentRequired(result: AcceptanceResult): boolean {
  return result === "fail" || result === "not_tested";
}

export interface AcceptanceCheck {
  ref: string;
  title: string;
  what_to_do: string;
  environments: AcceptanceEnvironment[];
}

export const ACCEPTANCE_CHECKS: AcceptanceCheck[] = [
  {
    ref: "text-readability",
    title: "Text readability",
    what_to_do:
      "Read two full lesson sections without pinching to zoom. Check that headings, body text and source labels are all comfortable to read.",
    environments: ["smartphone", "desktop"],
  },
  {
    ref: "touch-targets",
    title: "Touch-target and button size",
    what_to_do:
      "Press 'Mark this section completed', the lesson list rows and the answer options with a thumb. Nothing should need a careful aim.",
    environments: ["smartphone"],
  },
  {
    ref: "scrolling",
    title: "Scrolling",
    what_to_do:
      "Scroll through the longest lesson and the assessment. Check nothing is cut off, nothing scrolls sideways and no panel traps the scroll.",
    environments: ["smartphone", "desktop"],
  },
  {
    ref: "progress-visibility",
    title: "Progress visibility",
    what_to_do:
      "Confirm the course shows progress both as wording (lessons complete, sections saved, minutes left) and as a bar, and that both agree.",
    environments: ["smartphone", "desktop", "screen_reader"],
  },
  {
    ref: "lesson-resume",
    title: "Saving and resuming lessons",
    what_to_do:
      "Mark two sections complete, leave the screen entirely, come back and confirm both are still saved and the lesson has not reset.",
    environments: ["smartphone", "desktop", "interrupted_connection"],
  },
  {
    ref: "assessment-resume",
    title: "Saving and resuming assessment answers",
    what_to_do:
      "Answer three questions, leave the screen, return and confirm those three answers and the same answer order come back.",
    environments: ["smartphone", "desktop", "interrupted_connection"],
  },
  {
    ref: "focus-order",
    title: "Keyboard focus order",
    what_to_do:
      "Tab from the top of a lesson to the completion button. The order should follow the reading order with nothing skipped or unreachable.",
    environments: ["keyboard_only"],
  },
  {
    ref: "focus-visible",
    title: "Visible focus indicators",
    what_to_do:
      "While tabbing, confirm you can always see which control is selected, including inside the answer list and the lesson list.",
    environments: ["keyboard_only"],
  },
  {
    ref: "screen-reader-labels",
    title: "Screen-reader labels and instructions",
    what_to_do:
      "Listen through one lesson section and one question. Check the required/optional marking, the 'choose all that apply' instruction and each button's purpose are all spoken.",
    environments: ["screen_reader"],
  },
  {
    ref: "colour-contrast",
    title: "Colour contrast",
    what_to_do:
      "Check the required/critical badges, source labels and muted explanation text in daylight and in a dim room.",
    environments: ["smartphone", "desktop"],
  },
  {
    ref: "error-messages",
    title: "Error-message clarity",
    what_to_do:
      "Try to submit with a question unanswered, and try to sign an unfinished observation. The message should say plainly what to do next.",
    environments: ["smartphone", "desktop", "screen_reader"],
  },
  {
    ref: "small-screen-tables",
    title: "Tables on a small screen",
    what_to_do:
      "Open the branch question list, the tracking list and the certificate list on the phone. Each should scroll rather than squash.",
    environments: ["smartphone"],
  },
  {
    ref: "certificate-display",
    title: "Certificate display",
    what_to_do:
      "Open the certificate preview. Check the reference, course version, score, assessor and dates are all readable, and that it is clearly marked as a preview.",
    environments: ["smartphone", "desktop"],
  },
  {
    ref: "portuguese-content",
    title: "Portuguese-content capability",
    what_to_do:
      "Switch the language to Portuguese and confirm the screen furniture changes and no sentence ends up half in each language.",
    environments: ["smartphone", "desktop"],
  },
  {
    ref: "connection-recovery",
    title: "Recovery after a connection interruption",
    what_to_do:
      "With flight mode on, mark a section complete and answer a question. Check you are told it did not save, and that nothing is lost once the connection returns.",
    environments: ["interrupted_connection"],
  },
];

export function checksForEnvironment(env: AcceptanceEnvironment): AcceptanceCheck[] {
  return ACCEPTANCE_CHECKS.filter((c) => c.environments.includes(env));
}

export const ACCEPTANCE_TOTAL_CHECKS = ACCEPTANCE_ENVIRONMENTS.reduce(
  (sum, e) => sum + checksForEnvironment(e.key).length,
  0,
);

export const ACCESSIBILITY_STATEMENT_CAUTION =
  "Automated checks alone are not evidence of accessibility. This course must not be described as accessible or compliant until a person has completed the keyboard and screen-reader columns below and signed them.";
