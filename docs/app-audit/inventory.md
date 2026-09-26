# Source inventory — 26 September 2026

Base: `2407c3a3f925d65adc42eceb290706beca2d4191`. Inventory is not an exhaustive behavioural audit. See the review for targeted findings and untested areas.

## Pages

| Page | Lines |
| --- | ---: |
| `src/pages/AbsenceTracker.tsx` | 340 |
| `src/pages/AllergenTraining.tsx` | 129 |
| `src/pages/Announcements.tsx` | 194 |
| `src/pages/Auth.tsx` | 357 |
| `src/pages/CompanyOnboarding.tsx` | 392 |
| `src/pages/Contracts.tsx` | 119 |
| `src/pages/CookiePolicy.tsx` | 29 |
| `src/pages/Disciplinary.tsx` | 236 |
| `src/pages/DocumentView.tsx` | 72 |
| `src/pages/DocumentsCompliance.tsx` | 217 |
| `src/pages/EmployeeOnboarding.tsx` | 681 |
| `src/pages/Employees.tsx` | 589 |
| `src/pages/Financial.tsx` | 188 |
| `src/pages/FohAllergyTraining.tsx` | 69 |
| `src/pages/FohPrintableTraining.tsx` | 230 |
| `src/pages/FohServiceTraining.tsx` | 44 |
| `src/pages/FohUpsellingTraining.tsx` | 67 |
| `src/pages/HolidayAudit.tsx` | 576 |
| `src/pages/Holidays.tsx` | 1229 |
| `src/pages/Index.tsx` | 44 |
| `src/pages/InductionPortal.tsx` | 695 |
| `src/pages/Integrations.tsx` | 318 |
| `src/pages/JoinTeam.tsx` | 181 |
| `src/pages/LabourCostPreview.tsx` | 563 |
| `src/pages/Landing.tsx` | 254 |
| `src/pages/LocationDashboard.tsx` | 335 |
| `src/pages/Locations.tsx` | 231 |
| `src/pages/NotFound.tsx` | 24 |
| `src/pages/OAuthConsent.tsx` | 140 |
| `src/pages/Onboarding.tsx` | 634 |
| `src/pages/Payroll.tsx` | 1519 |
| `src/pages/PayrollAnalytics.tsx` | 711 |
| `src/pages/PayrollAudit.tsx` | 307 |
| `src/pages/PayrollCalendar.tsx` | 357 |
| `src/pages/PayrollComparison.tsx` | 336 |
| `src/pages/PayrollOverpayments.tsx` | 408 |
| `src/pages/PlatformAdmin.tsx` | 94 |
| `src/pages/PrivacyPolicy.tsx` | 34 |
| `src/pages/ReportIncident.tsx` | 118 |
| `src/pages/Reports.tsx` | 83 |
| `src/pages/ResetPassword.tsx` | 139 |
| `src/pages/Schedule.tsx` | 880 |
| `src/pages/ScheduleAnalytics.tsx` | 502 |
| `src/pages/ScheduleReport.tsx` | 337 |
| `src/pages/SelectWorkspace.tsx` | 75 |
| `src/pages/Settings.tsx` | 625 |
| `src/pages/ShiftMarketplace.tsx` | 491 |
| `src/pages/SignContract.tsx` | 1099 |
| `src/pages/SignLicensingDocument.tsx` | 454 |
| `src/pages/StaffDetailsPortal.tsx` | 997 |
| `src/pages/StaffLeave.tsx` | 216 |
| `src/pages/StaffPortal.tsx` | 136 |
| `src/pages/TalentPool.tsx` | 200 |
| `src/pages/TermsOfUse.tsx` | 39 |
| `src/pages/Timesheets.tsx` | 375 |
| `src/pages/TrainingRecords.tsx` | 334 |
| `src/pages/Vacancies.tsx` | 369 |
| `src/pages/Workforce.tsx` | 139 |

## Server functions

Every function below is mapped; only selected workflows were examined in depth. Live auth, grants, secrets and deployed versions were not inspected.

| Entry point | Lines |
| --- | ---: |
| `supabase/functions/accept-invitation/index.ts` | 313 |
| `supabase/functions/ai-setup-recommendations/index.ts` | 106 |
| `supabase/functions/archive-leavers/index.ts` | 52 |
| `supabase/functions/backfill-holiday-ledger/index.ts` | 202 |
| `supabase/functions/build-document-reader/index.ts` | 252 |
| `supabase/functions/check-compliance-expiry/index.ts` | 216 |
| `supabase/functions/check-contract-email-delivery/index.ts` | 115 |
| `supabase/functions/check-document-expiry/index.ts` | 227 |
| `supabase/functions/check-induction-reminders/index.ts` | 391 |
| `supabase/functions/check-leave-risk/index.ts` | 284 |
| `supabase/functions/check-training-due/index.ts` | 213 |
| `supabase/functions/clock-in-out/index.ts` | 280 |
| `supabase/functions/expire-talent-credits/index.ts` | 36 |
| `supabase/functions/extract-document/index.ts` | 367 |
| `supabase/functions/import-historical-payroll/index.ts` | 430 |
| `supabase/functions/induction-portal/index.ts` | 610 |
| `supabase/functions/licence-signature-portal/index.ts` | 335 |
| `supabase/functions/licensing-document/index.ts` | 96 |
| `supabase/functions/mcp/index.ts` | 188 |
| `supabase/functions/merge-duplicate-employees/index.ts` | 164 |
| `supabase/functions/provision-tenant/index.ts` | 171 |
| `supabase/functions/rebuild-holiday-carryover/index.ts` | 231 |
| `supabase/functions/resolve-orphan-payments/index.ts` | 371 |
| `supabase/functions/send-induction-pack/index.ts` | 242 |
| `supabase/functions/send-info-request/index.ts` | 376 |
| `supabase/functions/send-licence-signature/index.ts` | 403 |
| `supabase/functions/send-licensing-document/index.ts` | 215 |
| `supabase/functions/send-notification/index.ts` | 642 |
| `supabase/functions/send-payroll-email/index.ts` | 371 |
| `supabase/functions/send-signed-contract/index.ts` | 247 |
| `supabase/functions/serve-document/index.ts` | 223 |
| `supabase/functions/sign-contract/index.ts` | 2579 |
| `supabase/functions/staff-details-portal/index.ts` | 531 |
| `supabase/functions/talent-ai-match/index.ts` | 259 |

## Shared hooks

The following hooks are indexed for impact analysis, not all certified. Before changing one, use `rg` to list its imports and test those consumers.

- `src/hooks/use-mobile.tsx`
- `src/hooks/use-toast.ts`
- `src/hooks/useAbsences.ts`
- `src/hooks/useAccountLinkage.ts`
- `src/hooks/useAdminNotes.ts`
- `src/hooks/useAllergenAcceptance.ts`
- `src/hooks/useAllergenCourse.ts`
- `src/hooks/useAllergenCourseEmail.ts`
- `src/hooks/useAllergenLibrary.ts`
- `src/hooks/useAllergenMaterialApproval.ts`
- `src/hooks/useAllergenPilot.ts`
- `src/hooks/useAllergenProgramme.ts`
- `src/hooks/useAllergenStaffAccess.ts`
- `src/hooks/useAnimatedCounter.ts`
- `src/hooks/useAnnouncements.ts`
- `src/hooks/useAppNotifications.ts`
- `src/hooks/useAuth.tsx`
- `src/hooks/useAvailability.ts`
- `src/hooks/useBranches.ts`
- `src/hooks/useCompanySettings.ts`
- `src/hooks/useCompliance.ts`
- `src/hooks/useComplianceBranches.ts`
- `src/hooks/useContractAmendments.ts`
- `src/hooks/useContractAutoDraft.ts`
- `src/hooks/useContractCorrections.ts`
- `src/hooks/useContractEmailDelivery.ts`
- `src/hooks/useContractSigning.ts`
- `src/hooks/useContractedRates.ts`
- `src/hooks/useCountryRules.ts`
- `src/hooks/useCurrentEmployee.ts`
- `src/hooks/useDepartments.ts`
- `src/hooks/useDisciplinary.ts`
- `src/hooks/useDocumentExtraction.ts`
- `src/hooks/useDocumentReader.ts`
- `src/hooks/useDocumentRequests.ts`
- `src/hooks/useDocumentVerification.ts`
- `src/hooks/useDpsRegister.ts`
- `src/hooks/useEmailPolicy.ts`
- `src/hooks/useEmployeeDocuments.ts`
- `src/hooks/useEmployeeLinkage.ts`
- `src/hooks/useEmployeeOnboarding.ts`
- `src/hooks/useEmployees.ts`
- `src/hooks/useEmploymentTermsComparison.ts`
- `src/hooks/useEvidence.ts`
- `src/hooks/useFinancialData.ts`
- `src/hooks/useFindCover.ts`
- `src/hooks/useGovernanceSummary.ts`
- `src/hooks/useHolidayLedger.ts`
- `src/hooks/useHolidayRequests.ts`
- `src/hooks/useHolidayYearSummary.ts`
- `src/hooks/useHolidays.ts`
- `src/hooks/useI18n.tsx`
- `src/hooks/useImpersonation.tsx`
- `src/hooks/useIncidents.ts`
- `src/hooks/useInductionLessons.ts`
- `src/hooks/useInductionProgress.ts`
- `src/hooks/useInfoCoverage.ts`
- `src/hooks/useInfoRequests.ts`
- `src/hooks/useInvitations.ts`
- `src/hooks/useInviteEmail.ts`
- `src/hooks/useLabourCost.ts`
- `src/hooks/useLabourCostPreview.ts`
- `src/hooks/useLabourCostReport.ts`
- `src/hooks/useLeaveRules.ts`
- `src/hooks/useLeaverSettlementCandidates.ts`
- `src/hooks/useLocationPulse.ts`
- `src/hooks/useLocationSettings.ts`
- `src/hooks/useManagerScope.ts`
- `src/hooks/useMissingInformation.ts`
- `src/hooks/useModuleEvidence.ts`
- `src/hooks/useModuleSignalMappings.ts`
- `src/hooks/useNmwOverride.ts`
- `src/hooks/useNotificationPreferences.ts`
- `src/hooks/useNotifications.ts`
- `src/hooks/useNotifyEvent.ts`
- `src/hooks/useOnboarding.ts`
- `src/hooks/useOnboardingReadiness.ts`
- `src/hooks/useOperationalSignals.ts`
- `src/hooks/useOutboundContact.ts`
- `src/hooks/useOverpayments.ts`
- `src/hooks/usePayroll.ts`
- `src/hooks/usePayrollAdjustments.ts`
- `src/hooks/usePayrollApprovalGuardrails.ts`
- `src/hooks/usePayrollAudit.ts`
- `src/hooks/usePayrollComparison.ts`
- `src/hooks/usePayrollImportAliases.ts`
- `src/hooks/usePayrollImportStatus.ts`
- `src/hooks/usePayrollLocations.ts`
- `src/hooks/usePayrollMinimumWageCheck.ts`
- `src/hooks/usePayrollPeriodDeleteImpact.ts`
- `src/hooks/usePayrollPeriodNotes.ts`
- `src/hooks/usePayrollPeriodRestore.ts`
- `src/hooks/usePendingDetailDecisions.ts`
- `src/hooks/usePeriodTimesheetSource.ts`
- `src/hooks/usePermissionGate.ts`
- `src/hooks/usePremisesLicences.ts`
- `src/hooks/usePrivacyShield.tsx`
- `src/hooks/useReturnToWork.ts`
- `src/hooks/useReviewInsights.ts`
- `src/hooks/useRolePermissions.ts`
- `src/hooks/useRotaTerms.ts`
- `src/hooks/useSandbox.ts`
- `src/hooks/useSchedule.ts`
- `src/hooks/useScheduleActions.ts`
- `src/hooks/useScheduleTemplates.ts`
- `src/hooks/useSendContractEmail.ts`
- `src/hooks/useSensitiveEmployeeFields.ts`
- `src/hooks/useServiceCharge.ts`
- `src/hooks/useServiceChargePreview.ts`
- `src/hooks/useSetupHealth.ts`
- `src/hooks/useShiftAlerts.ts`
- `src/hooks/useShiftMarketplace.ts`
- `src/hooks/useSignalQuality.ts`
- `src/hooks/useSkills.ts`
- `src/hooks/useStaffAssessment.ts`
- `src/hooks/useStaffDetailChanges.ts`
- `src/hooks/useSubscription.ts`
- `src/hooks/useSyncPayrollFromTerms.ts`
- `src/hooks/useTalentBilling.ts`
- `src/hooks/useTalentConversations.ts`
- `src/hooks/useTalentPool.ts`
- `src/hooks/useTenant.tsx`
- `src/hooks/useTenantGuard.ts`
- `src/hooks/useTenantPreferences.ts`
- `src/hooks/useTenantTemplates.ts`
- `src/hooks/useTimeEntries.ts`
- `src/hooks/useTrainingAutomation.ts`
- `src/hooks/useTrainingEffectiveness.ts`
- `src/hooks/useTrainingLibrary.ts`
- `src/hooks/useTrainingModules.ts`
- `src/hooks/useTrainingRecords.ts`
- `src/hooks/useTransfers.ts`
- `src/hooks/useVacancies.ts`
