/** Missing deployment must never fall back to browser writes. */
export function staffApprovalError(error: { code?: string; message?: string }): string {
  return error.code === "PGRST202" || error.code === "42883"
    ? "Secure staff approval is not available yet. Nothing was changed. Ask your administrator to finish the database update."
    : error.message || "The approval could not be saved. Refresh the record before trying again.";
}
