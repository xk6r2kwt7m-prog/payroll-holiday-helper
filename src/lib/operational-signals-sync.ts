/**
 * Operational Signals Sync Engine
 *
 * Deterministic ingestion from existing source tables into the
 * normalised operational_signals analytics layer.
 *
 * Sources:
 *  1. training_review_insights — maps insight_tag → signal_tag
 *  2. disciplinary_records — maps category → signal_tag
 *
 * Skipped sources (not present in schema):
 *  - QA / audit tables (none found)
 *  - Incident tables (none found beyond disciplinary_records)
 */

import { supabase } from "@/integrations/supabase/client";
import { writeTrainingAudit } from "@/hooks/useTrainingLibrary";

// ─── Tag mapping from review insight_tag to signal_tag ───

const INSIGHT_TAG_TO_SIGNAL: Record<string, string> = {
  recurring_delay_issue: "recurring_delay_issue",
  staff_attitude_issue: "staff_attitude_issue",
  food_temperature_issue: "food_temperature_issue",
  cleanliness_issue: "cleanliness_issue",
  allergen_confidence_issue: "allergen_confidence_issue",
  complaint_recovery_issue: "complaint_recovery_issue",
  ambience_issue: "ambience_issue",
  value_for_money_issue: "value_for_money_issue",
};

// ─── Disciplinary category → signal_tag ───

const DISCIPLINARY_CATEGORY_TO_SIGNAL: Record<string, string> = {
  conduct: "conduct_issue",
  food_safety: "food_safety_issue",
  hygiene: "cleanliness_issue",
  customer_complaint: "customer_complaint",
  health_and_safety: "food_safety_issue",
};

// ─── Sync result type ───

export interface SyncResult {
  startedAt: string;
  completedAt: string;
  sources: {
    name: string;
    processed: number;
    inserted: number;
    skipped: number;
    errors: number;
  }[];
  totalProcessed: number;
  totalInserted: number;
  totalErrors: number;
  status: "completed" | "failed";
  error?: string;
}

// ─── Main sync function ───

export async function syncOperationalSignals(tenantId: string): Promise<SyncResult> {
  const startedAt = new Date().toISOString();
  const sources: SyncResult["sources"] = [];
  let totalProcessed = 0;
  let totalInserted = 0;
  let totalErrors = 0;

  // Audit: sync started
  await writeTrainingAudit({
    tenant_id: tenantId,
    action: "signal_sync_started",
    metadata: { started_at: startedAt },
  });

  try {
    // ── Source 1: training_review_insights ──
    const reviewResult = await syncReviewInsights(tenantId);
    sources.push(reviewResult);
    totalProcessed += reviewResult.processed;
    totalInserted += reviewResult.inserted;
    totalErrors += reviewResult.errors;

    // ── Source 2: disciplinary_records ──
    const discResult = await syncDisciplinaryRecords(tenantId);
    sources.push(discResult);
    totalProcessed += discResult.processed;
    totalInserted += discResult.inserted;
    totalErrors += discResult.errors;

    const completedAt = new Date().toISOString();

    // Audit: sync completed
    await writeTrainingAudit({
      tenant_id: tenantId,
      action: "signal_sync_completed",
      metadata: {
        started_at: startedAt,
        completed_at: completedAt,
        total_processed: totalProcessed,
        total_inserted: totalInserted,
        total_errors: totalErrors,
        sources: sources.map(s => ({ name: s.name, inserted: s.inserted, errors: s.errors })),
      },
    });

    return {
      startedAt,
      completedAt,
      sources,
      totalProcessed,
      totalInserted,
      totalErrors,
      status: "completed",
    };
  } catch (err: any) {
    const completedAt = new Date().toISOString();

    await writeTrainingAudit({
      tenant_id: tenantId,
      action: "signal_sync_failed",
      metadata: {
        started_at: startedAt,
        error: err.message ?? "Unknown error",
      },
    });

    return {
      startedAt,
      completedAt,
      sources,
      totalProcessed,
      totalInserted,
      totalErrors,
      status: "failed",
      error: err.message ?? "Unknown error",
    };
  }
}

// ─── Source: training_review_insights ───

async function syncReviewInsights(tenantId: string) {
  const result = { name: "training_review_insights", processed: 0, inserted: 0, skipped: 0, errors: 0 };

  const { data: insights, error } = await supabase
    .from("training_review_insights")
    .select("id, insight_tag, confidence_level, created_at, tenant_id, is_active")
    .eq("tenant_id", tenantId)
    .eq("is_active", true);

  if (error) {
    console.error("[signal-sync] review insights fetch error:", error.message);
    result.errors++;
    return result;
  }

  if (!insights || insights.length === 0) return result;

  const rows: any[] = [];
  for (const insight of insights) {
    result.processed++;
    const signalTag = INSIGHT_TAG_TO_SIGNAL[insight.insight_tag];
    if (!signalTag) {
      result.skipped++;
      continue;
    }

    rows.push({
      tenant_id: tenantId,
      source_table: "training_review_insights",
      source_record_id: insight.id,
      signal_tag: signalTag,
      signal_date: insight.created_at.split("T")[0],
      confidence: insight.confidence_level ?? null,
      metadata: { insight_tag: insight.insight_tag },
    });
  }

  if (rows.length > 0) {
    // Upsert with on-conflict ignore to prevent duplicates
    const { error: insertError, count } = await supabase
      .from("operational_signals" as any)
      .upsert(rows, {
        onConflict: "tenant_id,source_table,source_record_id,signal_tag",
        ignoreDuplicates: true,
      });

    if (insertError) {
      console.error("[signal-sync] review insights insert error:", insertError.message);
      result.errors += rows.length;
    } else {
      result.inserted = rows.length;
    }
  }

  return result;
}

// ─── Source: disciplinary_records ───

async function syncDisciplinaryRecords(tenantId: string) {
  const result = { name: "disciplinary_records", processed: 0, inserted: 0, skipped: 0, errors: 0 };

  const { data: records, error } = await supabase
    .from("disciplinary_records")
    .select("id, category, incident_date, status, tenant_id")
    .eq("tenant_id", tenantId);

  if (error) {
    console.error("[signal-sync] disciplinary fetch error:", error.message);
    result.errors++;
    return result;
  }

  if (!records || records.length === 0) return result;

  const rows: any[] = [];
  for (const record of records) {
    result.processed++;
    const signalTag = DISCIPLINARY_CATEGORY_TO_SIGNAL[record.category];
    if (!signalTag) {
      result.skipped++;
      continue;
    }

    rows.push({
      tenant_id: tenantId,
      source_table: "disciplinary_records",
      source_record_id: record.id,
      signal_tag: signalTag,
      signal_date: record.incident_date,
      severity: record.status === "escalated" ? "high" : "medium",
      metadata: { category: record.category, status: record.status },
    });
  }

  if (rows.length > 0) {
    const { error: insertError } = await supabase
      .from("operational_signals" as any)
      .upsert(rows, {
        onConflict: "tenant_id,source_table,source_record_id,signal_tag",
        ignoreDuplicates: true,
      });

    if (insertError) {
      console.error("[signal-sync] disciplinary insert error:", insertError.message);
      result.errors += rows.length;
    } else {
      result.inserted = rows.length;
    }
  }

  return result;
}
