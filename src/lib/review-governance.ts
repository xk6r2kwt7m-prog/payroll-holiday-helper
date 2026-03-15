/**
 * Shared constants and helpers for standards review governance.
 * Single source of truth for stale thresholds and review state.
 */

import { differenceInDays, parseISO } from "date-fns";

/** Modules not reviewed within this many days are considered stale. */
export const STALE_REVIEW_THRESHOLD_DAYS = 180;

/** Returns whether a review date is stale relative to today. */
export function isReviewStale(lastReviewedAt: string | null): boolean {
  if (!lastReviewedAt) return false; // "never reviewed" is a different state, not stale
  return differenceInDays(new Date(), parseISO(lastReviewedAt)) > STALE_REVIEW_THRESHOLD_DAYS;
}

/** Review state classification for display. */
export type ReviewState = "never" | "current" | "stale";

export function getReviewState(lastReviewedAt: string | null): ReviewState {
  if (!lastReviewedAt) return "never";
  return isReviewStale(lastReviewedAt) ? "stale" : "current";
}

export const REVIEW_STATE_CONFIG: Record<ReviewState, { label: string; color: string }> = {
  never: { label: "Never Reviewed", color: "bg-muted text-muted-foreground" },
  current: { label: "Reviewed", color: "bg-success/10 text-success" },
  stale: { label: "Stale Review", color: "bg-warning/10 text-warning" },
};
