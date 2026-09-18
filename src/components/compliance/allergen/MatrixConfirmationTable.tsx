import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AlertTriangle, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import {
  useAllergenDishes, useAllergenSources, useRecordDishDecision,
  type AllergenDish, type DishManagementDecision,
} from "@/hooks/useAllergenLibrary";

const STATUS_LABEL: Record<string, string> = {
  ready_to_confirm: "Ready for confirmation",
  needs_correction: "Correction recommended",
  reference_only: "Keep as reference only",
  needs_evidence: "Needs further evidence",
};

const DECISION_LABEL: Record<DishManagementDecision, string> = {
  confirm: "Confirm",
  correct: "Correct",
  reference_only: "Keep as reference only",
  needs_evidence: "Needs further evidence",
};

const DECISIONS: DishManagementDecision[] = ["confirm", "correct", "reference_only", "needs_evidence"];

const CRITICAL_POINTS = [
  "Peanuts and tree nuts are separate allergens.",
  "A “nut allergy” must always be clarified: tree nuts, peanuts, or both.",
  "Satay Chicken contains peanuts and does NOT contain tree nuts under the approved recipe and matrix.",
  "Tempura Aubergine carries a peanut garnish. It may be left off only when the allergy is declared before preparation and the full allergy procedure is followed. If peanuts have already touched the dish, discard it and remake it.",
  "Nutella contains hazelnut and Ugly Dumpling adds mixed nuts — the matrix records both peanuts and tree nuts for the Nutella dessert.",
  "All sweet dumplings share the same fryer, so every sweet dumpling carries a peanut and tree-nut cross-contact risk.",
  "Garlic, onion, mushrooms and other ingredients outside the regulated 14 can still cause an allergy or intolerance. Always use the full ingredient list, never the 14-allergen matrix alone.",
];

export function MatrixConfirmationTable({ branches }: { branches: { id: string; name: string }[] }) {
  const { data: dishes = [] } = useAllergenDishes();
  const { data: sources = [] } = useAllergenSources();
  const record = useRecordDishDecision();
  const [filter, setFilter] = useState("");
  const [notes, setNotes] = useState<Record<string, string>>({});

  const matrix = sources.find((s) => s.source_rank === "allergen_matrix" && s.is_current);
  const reviewed = dishes.filter((d) => d.recommended_status);

  const counts = useMemo(() => ({
    total: dishes.length,
    reviewed: reviewed.length,
    ready: reviewed.filter((d) => d.recommended_status === "ready_to_confirm").length,
    correction: reviewed.filter((d) => d.recommended_status === "needs_correction").length,
    evidence: reviewed.filter((d) => d.recommended_status === "needs_evidence").length,
    reference: reviewed.filter((d) => d.recommended_status === "reference_only").length,
    decided: reviewed.filter((d) => d.management_decision).length,
  }), [dishes, reviewed]);

  const shown = reviewed.filter((d) => d.dish_name.toLowerCase().includes(filter.toLowerCase()));

  const siteNames = (d: AllergenDish) => {
    const ids = d.active_branch_ids ?? [];
    if (!ids.length) return "Not on a current customer menu";
    return branches.filter((b) => ids.includes(b.id)).map((b) => b.name).join(", ") || "Site record not found";
  };

  const decide = (d: AllergenDish, decision: DishManagementDecision) => {
    record.mutate(
      { id: d.id, dish_name: d.dish_name, decision, note: notes[d.id]?.trim() || undefined },
      {
        onSuccess: () => toast.success(`${d.dish_name}: ${DECISION_LABEL[decision]} recorded.`),
        onError: (e: any) => toast.error(e.message ?? "Could not record the decision"),
      },
    );
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <ShieldCheck className="h-4 w-4" />
            Management confirmation — approved allergen matrix, July 2026
          </CardTitle>
          <CardDescription>
            {matrix
              ? `${matrix.title} — review date 18 Jul 2026, highest authority for current dish allergen declarations. Status: awaiting management confirmation.`
              : "The approved allergen matrix has not been registered as a current source yet."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2 text-xs">
            <Badge variant="outline">{counts.total} flavour records</Badge>
            <Badge variant="outline">{counts.reviewed} compared with the matrix</Badge>
            <Badge variant="outline">{counts.ready} ready for confirmation</Badge>
            <Badge variant={counts.correction ? "default" : "outline"}>{counts.correction} correction recommended</Badge>
            <Badge variant={counts.evidence ? "destructive" : "outline"}>{counts.evidence} need further evidence</Badge>
            <Badge variant="outline">{counts.reference} reference only</Badge>
            <Badge variant="secondary">{counts.decided} decided by you</Badge>
          </div>
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="space-y-1 text-xs">
              {CRITICAL_POINTS.map((p) => <p key={p}>• {p}</p>)}
              <p className="pt-1 font-medium">
                Matrix notes kept exactly as written: none of our dumplings contain molluscs; for
                gluten-free dumplings the soy or hoisin sauce is replaced with the approved
                gluten-free version, and every other ingredient and cross-contact check still applies.
              </p>
            </AlertDescription>
          </Alert>
          <p className="text-xs text-muted-foreground">
            Nothing is confirmed automatically. A flavour only becomes eligible for a scored
            question once you choose Confirm, it is live on that site’s till and customer menu, and
            its recipe and supplier information carry no unresolved disagreement. The July 2026
            customer menus are used for availability only, never as the allergen authority.
          </p>
          <Input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Search flavours"
            className="max-w-xs"
          />
        </CardContent>
      </Card>

      {shown.map((d) => (
        <Card key={d.id}>
          <CardContent className="space-y-2 p-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium">{d.dish_name}</span>
              <Badge variant="outline" className="text-[10px] capitalize">{d.dish_kind}</Badge>
              <Badge
                variant={
                  d.recommended_status === "ready_to_confirm" ? "outline"
                    : d.recommended_status === "needs_evidence" ? "destructive" : "default"
                }
                className="text-[10px]"
              >
                Recommended: {STATUS_LABEL[d.recommended_status!]}
              </Badge>
              {d.management_decision && (
                <Badge variant="secondary" className="text-[10px]">
                  Your decision: {DECISION_LABEL[d.management_decision]}
                </Badge>
              )}
              {d.is_confirmed && (
                <Badge variant="secondary" className="text-[10px]">Confirmed</Badge>
              )}
            </div>

            <div className="grid gap-1.5 text-xs sm:grid-cols-2">
              <p><span className="font-medium">Branch availability: </span>{siteNames(d)}</p>
              <p><span className="font-medium">Matrix declaration: </span>{d.matrix_declaration ?? "not listed in the approved matrix"}</p>
              <p>
                <span className="font-medium">Garnish-only allergens: </span>
                {(d.garnish_only_allergens ?? []).length ? d.garnish_only_allergens.join("; ") : "none"}
              </p>
              <p><span className="font-medium">Removable components: </span>{d.removable_components ?? "none"}</p>
              <p><span className="font-medium">Dough or sauce allergens: </span>{d.dough_sauce_allergens ?? "none recorded"}</p>
              <p><span className="font-medium">Shared equipment or fryer risk: </span>{d.cross_contact_note ?? "none recorded"}</p>
              <p className="sm:col-span-2">
                <span className="font-medium">Current record on file: </span>
                {d.regulated_allergens.length ? d.regulated_allergens.join("; ") : "not recorded"}
                {(d.other_allergens ?? []).length ? ` — outside the regulated 14: ${d.other_allergens.join("; ")}` : ""}
              </p>
              <p className="sm:col-span-2">
                <span className="font-medium">Supporting source: </span>
                {d.matrix_source_id ? "Approved allergen matrix — July 2026" : d.source_note ?? "—"}
              </p>
              <p className="sm:col-span-2">
                <span className="font-medium">Comparison and any disagreement: </span>{d.comparison_note ?? "—"}
              </p>
              {d.availability_note && (
                <p className="sm:col-span-2 text-muted-foreground">{d.availability_note}</p>
              )}
              {d.decision_note && (
                <p className="sm:col-span-2 text-muted-foreground">Your note: {d.decision_note}</p>
              )}
            </div>

            <Textarea
              rows={2}
              placeholder="Note for the audit trail (optional)"
              value={notes[d.id] ?? ""}
              onChange={(e) => setNotes((n) => ({ ...n, [d.id]: e.target.value }))}
              className="text-xs"
            />
            <div className="flex flex-wrap gap-2">
              {DECISIONS.map((dec) => (
                <Button
                  key={dec}
                  size="sm"
                  variant={d.management_decision === dec ? "default" : "outline"}
                  disabled={record.isPending}
                  onClick={() => decide(d, dec)}
                >
                  {DECISION_LABEL[dec]}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}

      {!shown.length && (
        <p className="text-sm text-muted-foreground">No flavours match that search.</p>
      )}
    </div>
  );
}

export default MatrixConfirmationTable;
