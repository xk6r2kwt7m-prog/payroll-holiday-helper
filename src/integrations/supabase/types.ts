export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      absence_records: {
        Row: {
          absence_type: string
          created_at: string
          employee_id: string
          end_date: string
          hours: number
          id: string
          notes: string | null
          recorded_by: string | null
          start_date: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          absence_type?: string
          created_at?: string
          employee_id: string
          end_date: string
          hours?: number
          id?: string
          notes?: string | null
          recorded_by?: string | null
          start_date: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          absence_type?: string
          created_at?: string
          employee_id?: string
          end_date?: string
          hours?: number
          id?: string
          notes?: string | null
          recorded_by?: string | null
          start_date?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "absence_records_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "absence_records_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "absence_records_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_notes: {
        Row: {
          created_at: string
          created_by: string | null
          employee_id: string
          id: string
          note: string
          payroll_period_id: string | null
          resolved_at: string | null
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          employee_id: string
          id?: string
          note: string
          payroll_period_id?: string | null
          resolved_at?: string | null
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          employee_id?: string
          id?: string
          note?: string
          payroll_period_id?: string | null
          resolved_at?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_notes_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_notes_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_notes_payroll_period_id_fkey"
            columns: ["payroll_period_id"]
            isOneToOne: false
            referencedRelation: "payroll_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_notes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      alcohol_authorisations: {
        Row: {
          authorised_at: string | null
          authoriser_confirmed_at: string | null
          authoriser_employee_id: string | null
          authoriser_licence_number: string | null
          authoriser_name: string | null
          authoriser_role: string | null
          branch: string | null
          created_at: string
          employee_id: string
          employee_signature: string | null
          employee_signed_at: string | null
          id: string
          licence_id: string | null
          notes: string | null
          pack_id: string | null
          request_id: string | null
          revoked_at: string | null
          revoked_reason: string | null
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          authorised_at?: string | null
          authoriser_confirmed_at?: string | null
          authoriser_employee_id?: string | null
          authoriser_licence_number?: string | null
          authoriser_name?: string | null
          authoriser_role?: string | null
          branch?: string | null
          created_at?: string
          employee_id: string
          employee_signature?: string | null
          employee_signed_at?: string | null
          id?: string
          licence_id?: string | null
          notes?: string | null
          pack_id?: string | null
          request_id?: string | null
          revoked_at?: string | null
          revoked_reason?: string | null
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          authorised_at?: string | null
          authoriser_confirmed_at?: string | null
          authoriser_employee_id?: string | null
          authoriser_licence_number?: string | null
          authoriser_name?: string | null
          authoriser_role?: string | null
          branch?: string | null
          created_at?: string
          employee_id?: string
          employee_signature?: string | null
          employee_signed_at?: string | null
          id?: string
          licence_id?: string | null
          notes?: string | null
          pack_id?: string | null
          request_id?: string | null
          revoked_at?: string | null
          revoked_reason?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "alcohol_authorisations_authoriser_employee_id_fkey"
            columns: ["authoriser_employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alcohol_authorisations_authoriser_employee_id_fkey"
            columns: ["authoriser_employee_id"]
            isOneToOne: false
            referencedRelation: "employees_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alcohol_authorisations_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alcohol_authorisations_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alcohol_authorisations_licence_id_fkey"
            columns: ["licence_id"]
            isOneToOne: false
            referencedRelation: "premises_licences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alcohol_authorisations_pack_id_fkey"
            columns: ["pack_id"]
            isOneToOne: false
            referencedRelation: "induction_packs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alcohol_authorisations_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "licence_signature_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      alcohol_list_decisions: {
        Row: {
          branch: string
          created_at: string
          decided_at: string
          decided_by: string | null
          decision: string
          employee_id: string
          id: string
          note: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          branch: string
          created_at?: string
          decided_at?: string
          decided_by?: string | null
          decision: string
          employee_id: string
          id?: string
          note?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          branch?: string
          created_at?: string
          decided_at?: string
          decided_by?: string | null
          decision?: string
          employee_id?: string
          id?: string
          note?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "alcohol_list_decisions_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alcohol_list_decisions_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alcohol_list_decisions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      allergen_assessment_attempts: {
        Row: {
          answers: Json
          attempt_number: number
          branch_id: string | null
          course_version: number | null
          created_at: string
          critical_missed: string[]
          draft_id: string | null
          employee_id: string | null
          id: string
          is_test: boolean
          option_order: Json
          outcome: string | null
          passed: boolean | null
          question_ids: string[]
          score_percent: number | null
          status: string
          submitted_at: string | null
          tenant_id: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          answers?: Json
          attempt_number: number
          branch_id?: string | null
          course_version?: number | null
          created_at?: string
          critical_missed?: string[]
          draft_id?: string | null
          employee_id?: string | null
          id?: string
          is_test?: boolean
          option_order?: Json
          outcome?: string | null
          passed?: boolean | null
          question_ids?: string[]
          score_percent?: number | null
          status?: string
          submitted_at?: string | null
          tenant_id: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          answers?: Json
          attempt_number?: number
          branch_id?: string | null
          course_version?: number | null
          created_at?: string
          critical_missed?: string[]
          draft_id?: string | null
          employee_id?: string | null
          id?: string
          is_test?: boolean
          option_order?: Json
          outcome?: string | null
          passed?: boolean | null
          question_ids?: string[]
          score_percent?: number | null
          status?: string
          submitted_at?: string | null
          tenant_id?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "allergen_assessment_attempts_draft_id_fkey"
            columns: ["draft_id"]
            isOneToOne: false
            referencedRelation: "allergen_course_drafts"
            referencedColumns: ["id"]
          },
        ]
      }
      allergen_assignments: {
        Row: {
          assigned_by: string | null
          assigned_by_name: string | null
          assignment_source: string
          audience: string
          branch_id: string | null
          course_version: number | null
          created_at: string
          draft_id: string | null
          due_date: string | null
          employee_id: string | null
          id: string
          is_test: boolean
          note: string | null
          notification_state: string
          status: string
          tenant_id: string
          updated_at: string
          user_id: string | null
          withdrawn_at: string | null
        }
        Insert: {
          assigned_by?: string | null
          assigned_by_name?: string | null
          assignment_source?: string
          audience?: string
          branch_id?: string | null
          course_version?: number | null
          created_at?: string
          draft_id?: string | null
          due_date?: string | null
          employee_id?: string | null
          id?: string
          is_test?: boolean
          note?: string | null
          notification_state?: string
          status?: string
          tenant_id: string
          updated_at?: string
          user_id?: string | null
          withdrawn_at?: string | null
        }
        Update: {
          assigned_by?: string | null
          assigned_by_name?: string | null
          assignment_source?: string
          audience?: string
          branch_id?: string | null
          course_version?: number | null
          created_at?: string
          draft_id?: string | null
          due_date?: string | null
          employee_id?: string | null
          id?: string
          is_test?: boolean
          note?: string | null
          notification_state?: string
          status?: string
          tenant_id?: string
          updated_at?: string
          user_id?: string | null
          withdrawn_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "allergen_assignments_draft_id_fkey"
            columns: ["draft_id"]
            isOneToOne: false
            referencedRelation: "allergen_course_drafts"
            referencedColumns: ["id"]
          },
        ]
      }
      allergen_certificates: {
        Row: {
          assignment_id: string | null
          attempt_id: string | null
          branch_id: string | null
          certificate_number: string
          course_title: string
          course_version: number | null
          created_at: string
          delivery_state: string
          draft_id: string | null
          employee_id: string | null
          employee_name: string | null
          evidence: Json
          expires_on: string | null
          id: string
          is_test: boolean
          issued_at: string
          issued_by: string | null
          issued_by_name: string | null
          lessons_completed: number | null
          lessons_required: number | null
          observation_id: string | null
          practical_signed_at: string | null
          practical_signed_by_name: string | null
          score_percent: number | null
          status: string
          superseded_reason: string | null
          tenant_id: string
          updated_at: string
          user_id: string | null
          valid_from: string
        }
        Insert: {
          assignment_id?: string | null
          attempt_id?: string | null
          branch_id?: string | null
          certificate_number: string
          course_title: string
          course_version?: number | null
          created_at?: string
          delivery_state?: string
          draft_id?: string | null
          employee_id?: string | null
          employee_name?: string | null
          evidence?: Json
          expires_on?: string | null
          id?: string
          is_test?: boolean
          issued_at?: string
          issued_by?: string | null
          issued_by_name?: string | null
          lessons_completed?: number | null
          lessons_required?: number | null
          observation_id?: string | null
          practical_signed_at?: string | null
          practical_signed_by_name?: string | null
          score_percent?: number | null
          status?: string
          superseded_reason?: string | null
          tenant_id: string
          updated_at?: string
          user_id?: string | null
          valid_from?: string
        }
        Update: {
          assignment_id?: string | null
          attempt_id?: string | null
          branch_id?: string | null
          certificate_number?: string
          course_title?: string
          course_version?: number | null
          created_at?: string
          delivery_state?: string
          draft_id?: string | null
          employee_id?: string | null
          employee_name?: string | null
          evidence?: Json
          expires_on?: string | null
          id?: string
          is_test?: boolean
          issued_at?: string
          issued_by?: string | null
          issued_by_name?: string | null
          lessons_completed?: number | null
          lessons_required?: number | null
          observation_id?: string | null
          practical_signed_at?: string | null
          practical_signed_by_name?: string | null
          score_percent?: number | null
          status?: string
          superseded_reason?: string | null
          tenant_id?: string
          updated_at?: string
          user_id?: string | null
          valid_from?: string
        }
        Relationships: [
          {
            foreignKeyName: "allergen_certificates_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "allergen_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "allergen_certificates_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "allergen_assessment_attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "allergen_certificates_draft_id_fkey"
            columns: ["draft_id"]
            isOneToOne: false
            referencedRelation: "allergen_course_drafts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "allergen_certificates_observation_id_fkey"
            columns: ["observation_id"]
            isOneToOne: false
            referencedRelation: "allergen_practical_observations"
            referencedColumns: ["id"]
          },
        ]
      }
      allergen_change_proposals: {
        Row: {
          change_type: string
          conflict_id: string | null
          created_at: string
          current_text: string | null
          decided_at: string | null
          decided_by: string | null
          decision_note: string | null
          id: string
          proposed_text: string
          published_version: number | null
          rationale: string | null
          source_ids: string[]
          status: string
          target_kind: string
          target_label: string
          target_ref: string | null
          tenant_id: string
        }
        Insert: {
          change_type?: string
          conflict_id?: string | null
          created_at?: string
          current_text?: string | null
          decided_at?: string | null
          decided_by?: string | null
          decision_note?: string | null
          id?: string
          proposed_text: string
          published_version?: number | null
          rationale?: string | null
          source_ids?: string[]
          status?: string
          target_kind?: string
          target_label: string
          target_ref?: string | null
          tenant_id: string
        }
        Update: {
          change_type?: string
          conflict_id?: string | null
          created_at?: string
          current_text?: string | null
          decided_at?: string | null
          decided_by?: string | null
          decision_note?: string | null
          id?: string
          proposed_text?: string
          published_version?: number | null
          rationale?: string | null
          source_ids?: string[]
          status?: string
          target_kind?: string
          target_label?: string
          target_ref?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "allergen_change_proposals_conflict_id_fkey"
            columns: ["conflict_id"]
            isOneToOne: false
            referencedRelation: "allergen_conflicts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "allergen_change_proposals_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      allergen_coaching_records: {
        Row: {
          after_attempt_id: string | null
          coached_by: string | null
          coached_by_name: string | null
          coaching_note: string
          created_at: string
          employee_id: string | null
          id: string
          is_test: boolean
          tenant_id: string
          topics_covered: string[]
          unlocks_attempt: number
          user_id: string | null
        }
        Insert: {
          after_attempt_id?: string | null
          coached_by?: string | null
          coached_by_name?: string | null
          coaching_note: string
          created_at?: string
          employee_id?: string | null
          id?: string
          is_test?: boolean
          tenant_id: string
          topics_covered?: string[]
          unlocks_attempt?: number
          user_id?: string | null
        }
        Update: {
          after_attempt_id?: string | null
          coached_by?: string | null
          coached_by_name?: string | null
          coaching_note?: string
          created_at?: string
          employee_id?: string | null
          id?: string
          is_test?: boolean
          tenant_id?: string
          topics_covered?: string[]
          unlocks_attempt?: number
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "allergen_coaching_records_after_attempt_id_fkey"
            columns: ["after_attempt_id"]
            isOneToOne: false
            referencedRelation: "allergen_assessment_attempts"
            referencedColumns: ["id"]
          },
        ]
      }
      allergen_conflicts: {
        Row: {
          affected_lessons: string[]
          affected_questions: string[]
          created_at: string
          id: string
          needs_admin_decision: boolean
          recommended_wording: string | null
          resolution_note: string | null
          resolved_at: string | null
          resolved_by: string | null
          statements: Json
          status: string
          subject: string
          subject_kind: string
          tenant_id: string
        }
        Insert: {
          affected_lessons?: string[]
          affected_questions?: string[]
          created_at?: string
          id?: string
          needs_admin_decision?: boolean
          recommended_wording?: string | null
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          statements?: Json
          status?: string
          subject: string
          subject_kind?: string
          tenant_id: string
        }
        Update: {
          affected_lessons?: string[]
          affected_questions?: string[]
          created_at?: string
          id?: string
          needs_admin_decision?: boolean
          recommended_wording?: string | null
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          statements?: Json
          status?: string
          subject?: string
          subject_kind?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "allergen_conflicts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      allergen_course_drafts: {
        Row: {
          based_on_version: number | null
          comparison: Json
          confirmed_dish_ids: string[]
          content: Json
          created_at: string
          created_by: string | null
          excluded_from_scoring: string[]
          id: string
          note: string | null
          proposed_version: number
          source_map: Json
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          based_on_version?: number | null
          comparison?: Json
          confirmed_dish_ids?: string[]
          content: Json
          created_at?: string
          created_by?: string | null
          excluded_from_scoring?: string[]
          id?: string
          note?: string | null
          proposed_version: number
          source_map?: Json
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          based_on_version?: number | null
          comparison?: Json
          confirmed_dish_ids?: string[]
          content?: Json
          created_at?: string
          created_by?: string | null
          excluded_from_scoring?: string[]
          id?: string
          note?: string | null
          proposed_version?: number
          source_map?: Json
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      allergen_course_versions: {
        Row: {
          approved_proposal_ids: string[]
          content: Json
          id: string
          note: string | null
          published_at: string
          published_by: string | null
          review_date: string | null
          source_map: Json
          tenant_id: string
          version: number
        }
        Insert: {
          approved_proposal_ids?: string[]
          content: Json
          id?: string
          note?: string | null
          published_at?: string
          published_by?: string | null
          review_date?: string | null
          source_map?: Json
          tenant_id: string
          version: number
        }
        Update: {
          approved_proposal_ids?: string[]
          content?: Json
          id?: string
          note?: string | null
          published_at?: string
          published_by?: string | null
          review_date?: string | null
          source_map?: Json
          tenant_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "allergen_course_versions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      allergen_dish_reference: {
        Row: {
          active_branch_ids: string[]
          availability_note: string | null
          comparison_note: string | null
          created_at: string
          cross_contact_note: string | null
          decided_at: string | null
          decided_by: string | null
          decision_note: string | null
          dish_kind: string
          dish_name: string
          dough_sauce_allergens: string | null
          garnish_only_allergens: string[]
          id: string
          is_confirmed: boolean
          management_decision: string | null
          matrix_declaration: string | null
          matrix_source_id: string | null
          other_allergens: string[]
          recommended_status: string | null
          regulated_allergens: string[]
          removable_components: string | null
          source_id: string | null
          source_note: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          active_branch_ids?: string[]
          availability_note?: string | null
          comparison_note?: string | null
          created_at?: string
          cross_contact_note?: string | null
          decided_at?: string | null
          decided_by?: string | null
          decision_note?: string | null
          dish_kind?: string
          dish_name: string
          dough_sauce_allergens?: string | null
          garnish_only_allergens?: string[]
          id?: string
          is_confirmed?: boolean
          management_decision?: string | null
          matrix_declaration?: string | null
          matrix_source_id?: string | null
          other_allergens?: string[]
          recommended_status?: string | null
          regulated_allergens?: string[]
          removable_components?: string | null
          source_id?: string | null
          source_note?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          active_branch_ids?: string[]
          availability_note?: string | null
          comparison_note?: string | null
          created_at?: string
          cross_contact_note?: string | null
          decided_at?: string | null
          decided_by?: string | null
          decision_note?: string | null
          dish_kind?: string
          dish_name?: string
          dough_sauce_allergens?: string | null
          garnish_only_allergens?: string[]
          id?: string
          is_confirmed?: boolean
          management_decision?: string | null
          matrix_declaration?: string | null
          matrix_source_id?: string | null
          other_allergens?: string[]
          recommended_status?: string | null
          regulated_allergens?: string[]
          removable_components?: string | null
          source_id?: string | null
          source_note?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "allergen_dish_reference_matrix_source_id_fkey"
            columns: ["matrix_source_id"]
            isOneToOne: false
            referencedRelation: "allergen_sources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "allergen_dish_reference_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "allergen_sources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "allergen_dish_reference_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      allergen_lesson_progress: {
        Row: {
          completed_at: string | null
          completed_sections: string[]
          course_version: number | null
          created_at: string
          draft_id: string | null
          employee_id: string | null
          id: string
          is_complete: boolean
          is_test: boolean
          last_seen_at: string
          lesson_ref: string
          tenant_id: string
          total_sections: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          completed_at?: string | null
          completed_sections?: string[]
          course_version?: number | null
          created_at?: string
          draft_id?: string | null
          employee_id?: string | null
          id?: string
          is_complete?: boolean
          is_test?: boolean
          last_seen_at?: string
          lesson_ref: string
          tenant_id: string
          total_sections?: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          completed_at?: string | null
          completed_sections?: string[]
          course_version?: number | null
          created_at?: string
          draft_id?: string | null
          employee_id?: string | null
          id?: string
          is_complete?: boolean
          is_test?: boolean
          last_seen_at?: string
          lesson_ref?: string
          tenant_id?: string
          total_sections?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "allergen_lesson_progress_draft_id_fkey"
            columns: ["draft_id"]
            isOneToOne: false
            referencedRelation: "allergen_course_drafts"
            referencedColumns: ["id"]
          },
        ]
      }
      allergen_practical_observations: {
        Row: {
          assignment_id: string | null
          audience: string
          branch_id: string | null
          course_version: number | null
          created_at: string
          critical_missed: string[]
          employee_id: string | null
          id: string
          is_test: boolean
          item_results: Json
          items_seen: number
          items_total: number
          manager_note: string | null
          observed_on: string | null
          outcome: string
          signed_at: string | null
          signed_by: string | null
          signed_by_name: string | null
          signed_role: string | null
          template_version: string
          tenant_id: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          assignment_id?: string | null
          audience?: string
          branch_id?: string | null
          course_version?: number | null
          created_at?: string
          critical_missed?: string[]
          employee_id?: string | null
          id?: string
          is_test?: boolean
          item_results?: Json
          items_seen?: number
          items_total?: number
          manager_note?: string | null
          observed_on?: string | null
          outcome?: string
          signed_at?: string | null
          signed_by?: string | null
          signed_by_name?: string | null
          signed_role?: string | null
          template_version?: string
          tenant_id: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          assignment_id?: string | null
          audience?: string
          branch_id?: string | null
          course_version?: number | null
          created_at?: string
          critical_missed?: string[]
          employee_id?: string | null
          id?: string
          is_test?: boolean
          item_results?: Json
          items_seen?: number
          items_total?: number
          manager_note?: string | null
          observed_on?: string | null
          outcome?: string
          signed_at?: string | null
          signed_by?: string | null
          signed_by_name?: string | null
          signed_role?: string | null
          template_version?: string
          tenant_id?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "allergen_practical_observations_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "allergen_assignments"
            referencedColumns: ["id"]
          },
        ]
      }
      allergen_renewal_settings: {
        Row: {
          automatic_sending_enabled: boolean
          created_at: string
          id: string
          new_version_action: string
          overdue_reminder_days: number[]
          reminder_days_before: number[]
          tenant_id: string
          updated_at: string
          updated_by: string | null
          validity_months: number
        }
        Insert: {
          automatic_sending_enabled?: boolean
          created_at?: string
          id?: string
          new_version_action?: string
          overdue_reminder_days?: number[]
          reminder_days_before?: number[]
          tenant_id: string
          updated_at?: string
          updated_by?: string | null
          validity_months?: number
        }
        Update: {
          automatic_sending_enabled?: boolean
          created_at?: string
          id?: string
          new_version_action?: string
          overdue_reminder_days?: number[]
          reminder_days_before?: number[]
          tenant_id?: string
          updated_at?: string
          updated_by?: string | null
          validity_months?: number
        }
        Relationships: []
      }
      allergen_sources: {
        Row: {
          compliance_document_id: string | null
          created_at: string
          created_by: string | null
          id: string
          is_current: boolean
          note: string | null
          source_date: string | null
          source_rank: string
          source_version: string | null
          tenant_id: string
          title: string
          updated_at: string
        }
        Insert: {
          compliance_document_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_current?: boolean
          note?: string | null
          source_date?: string | null
          source_rank?: string
          source_version?: string | null
          tenant_id: string
          title: string
          updated_at?: string
        }
        Update: {
          compliance_document_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_current?: boolean
          note?: string | null
          source_date?: string | null
          source_rank?: string
          source_version?: string | null
          tenant_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "allergen_sources_compliance_document_id_fkey"
            columns: ["compliance_document_id"]
            isOneToOne: false
            referencedRelation: "compliance_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "allergen_sources_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      announcement_read_receipts: {
        Row: {
          announcement_id: string
          employee_id: string
          id: string
          read_at: string
          tenant_id: string
        }
        Insert: {
          announcement_id: string
          employee_id: string
          id?: string
          read_at?: string
          tenant_id: string
        }
        Update: {
          announcement_id?: string
          employee_id?: string
          id?: string
          read_at?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcement_read_receipts_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "staff_announcements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcement_read_receipts_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcement_read_receipts_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcement_read_receipts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: Database["public"]["Enums"]["audit_action"]
          created_at: string
          id: string
          ip_address: string | null
          new_data: Json | null
          old_data: Json | null
          record_id: string | null
          table_name: string
          tenant_id: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: Database["public"]["Enums"]["audit_action"]
          created_at?: string
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name: string
          tenant_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: Database["public"]["Enums"]["audit_action"]
          created_at?: string
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name?: string
          tenant_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_events: {
        Row: {
          amount: number | null
          created_at: string
          currency: string | null
          description: string | null
          event_type: string
          id: string
          metadata: Json | null
          stripe_event_id: string | null
          subscription_id: string | null
          tenant_id: string
        }
        Insert: {
          amount?: number | null
          created_at?: string
          currency?: string | null
          description?: string | null
          event_type: string
          id?: string
          metadata?: Json | null
          stripe_event_id?: string | null
          subscription_id?: string | null
          tenant_id: string
        }
        Update: {
          amount?: number | null
          created_at?: string
          currency?: string | null
          description?: string | null
          event_type?: string
          id?: string
          metadata?: Json | null
          stripe_event_id?: string | null
          subscription_id?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "billing_events_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "tenant_subscriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      branch_compliance_items: {
        Row: {
          branch: string
          branch_location_id: string | null
          category: string
          created_at: string
          created_by: string | null
          document_id: string | null
          expiry_date: string | null
          file_path: string | null
          id: string
          inspection_required: boolean
          is_displayed: boolean
          last_reviewed_at: string | null
          name: string
          notes: string | null
          physical_copy_held: boolean
          sort_order: number
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          branch: string
          branch_location_id?: string | null
          category: string
          created_at?: string
          created_by?: string | null
          document_id?: string | null
          expiry_date?: string | null
          file_path?: string | null
          id?: string
          inspection_required?: boolean
          is_displayed?: boolean
          last_reviewed_at?: string | null
          name: string
          notes?: string | null
          physical_copy_held?: boolean
          sort_order?: number
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          branch?: string
          branch_location_id?: string | null
          category?: string
          created_at?: string
          created_by?: string | null
          document_id?: string | null
          expiry_date?: string | null
          file_path?: string | null
          id?: string
          inspection_required?: boolean
          is_displayed?: boolean
          last_reviewed_at?: string | null
          name?: string
          notes?: string | null
          physical_copy_held?: boolean
          sort_order?: number
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "branch_compliance_items_branch_location_id_fkey"
            columns: ["branch_location_id"]
            isOneToOne: false
            referencedRelation: "branch_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "branch_compliance_items_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "compliance_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      branch_locations: {
        Row: {
          address: string | null
          branch: string
          created_at: string
          display_name: string
          geofence_radius_meters: number
          id: string
          latitude: number
          longitude: number
          needs_review: boolean
          review_note: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          branch: string
          created_at?: string
          display_name: string
          geofence_radius_meters?: number
          id?: string
          latitude: number
          longitude: number
          needs_review?: boolean
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          branch?: string
          created_at?: string
          display_name?: string
          geofence_radius_meters?: number
          id?: string
          latitude?: number
          longitude?: number
          needs_review?: boolean
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "branch_locations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      company_settings: {
        Row: {
          address: string | null
          auto_calculate_overtime: boolean | null
          company_email: string | null
          company_logo_url: string | null
          company_name: string
          contract_send_mode: string
          created_at: string
          default_pay_day: string | null
          default_signatory_email: string | null
          default_signatory_name: string | null
          default_signatory_title: string | null
          default_signature_data: string | null
          default_signature_updated_at: string | null
          email_notifications: boolean | null
          holiday_request_alerts: boolean | null
          id: string
          pay_period: string | null
          payroll_reminders: boolean | null
          session_timeout: boolean | null
          tenant_id: string
          two_factor_auth: boolean | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          auto_calculate_overtime?: boolean | null
          company_email?: string | null
          company_logo_url?: string | null
          company_name?: string
          contract_send_mode?: string
          created_at?: string
          default_pay_day?: string | null
          default_signatory_email?: string | null
          default_signatory_name?: string | null
          default_signatory_title?: string | null
          default_signature_data?: string | null
          default_signature_updated_at?: string | null
          email_notifications?: boolean | null
          holiday_request_alerts?: boolean | null
          id?: string
          pay_period?: string | null
          payroll_reminders?: boolean | null
          session_timeout?: boolean | null
          tenant_id: string
          two_factor_auth?: boolean | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          auto_calculate_overtime?: boolean | null
          company_email?: string | null
          company_logo_url?: string | null
          company_name?: string
          contract_send_mode?: string
          created_at?: string
          default_pay_day?: string | null
          default_signatory_email?: string | null
          default_signatory_name?: string | null
          default_signatory_title?: string | null
          default_signature_data?: string | null
          default_signature_updated_at?: string | null
          email_notifications?: boolean | null
          holiday_request_alerts?: boolean | null
          id?: string
          pay_period?: string | null
          payroll_reminders?: boolean | null
          session_timeout?: boolean | null
          tenant_id?: string
          two_factor_auth?: boolean | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      compliance_actions: {
        Row: {
          branch: string
          branch_location_id: string | null
          completed_at: string | null
          completed_by: string | null
          created_at: string
          created_by: string | null
          detail: string | null
          due_date: string | null
          evidence_file_path: string | null
          id: string
          incident_id: string | null
          notes: string | null
          source: string
          status: string
          tenant_id: string
          title: string
          updated_at: string
        }
        Insert: {
          branch: string
          branch_location_id?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          created_by?: string | null
          detail?: string | null
          due_date?: string | null
          evidence_file_path?: string | null
          id?: string
          incident_id?: string | null
          notes?: string | null
          source?: string
          status?: string
          tenant_id: string
          title: string
          updated_at?: string
        }
        Update: {
          branch?: string
          branch_location_id?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          created_by?: string | null
          detail?: string | null
          due_date?: string | null
          evidence_file_path?: string | null
          id?: string
          incident_id?: string | null
          notes?: string | null
          source?: string
          status?: string
          tenant_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "compliance_actions_branch_location_id_fkey"
            columns: ["branch_location_id"]
            isOneToOne: false
            referencedRelation: "branch_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compliance_actions_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "incident_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      compliance_certificates: {
        Row: {
          applies_to_all_branches: boolean
          branch: string
          branch_location_id: string | null
          certificate_number: string | null
          certificate_type: string
          created_at: string
          created_by: string | null
          employee_id: string | null
          expiry_date: string | null
          file_path: string | null
          holder_job_title: string | null
          holder_name: string | null
          id: string
          issue_date: string | null
          notes: string | null
          receipt_path: string | null
          renewal_status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          applies_to_all_branches?: boolean
          branch: string
          branch_location_id?: string | null
          certificate_number?: string | null
          certificate_type: string
          created_at?: string
          created_by?: string | null
          employee_id?: string | null
          expiry_date?: string | null
          file_path?: string | null
          holder_job_title?: string | null
          holder_name?: string | null
          id?: string
          issue_date?: string | null
          notes?: string | null
          receipt_path?: string | null
          renewal_status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          applies_to_all_branches?: boolean
          branch?: string
          branch_location_id?: string | null
          certificate_number?: string | null
          certificate_type?: string
          created_at?: string
          created_by?: string | null
          employee_id?: string | null
          expiry_date?: string | null
          file_path?: string | null
          holder_job_title?: string | null
          holder_name?: string | null
          id?: string
          issue_date?: string | null
          notes?: string | null
          receipt_path?: string | null
          renewal_status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "compliance_certificates_branch_location_id_fkey"
            columns: ["branch_location_id"]
            isOneToOne: false
            referencedRelation: "branch_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compliance_certificates_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compliance_certificates_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      compliance_documents: {
        Row: {
          alcohol_related: boolean
          applies_to_all_branches: boolean
          applies_to_all_roles: boolean
          approval_note: string | null
          approval_status: string
          approved_at: string | null
          approved_by: string | null
          archived_at: string | null
          branch_ids: string[]
          branches: string[]
          category: string
          created_at: string
          created_by: string | null
          description: string | null
          expires_at: string | null
          file_path: string | null
          id: string
          include_in_induction: boolean
          inspection_required: boolean
          issue_date: string | null
          issuing_authority: string | null
          must_display: boolean
          name: string
          owner_job_title: string | null
          owner_name: string | null
          reader_built_at: string | null
          reader_built_version: number | null
          reader_enabled: boolean | null
          reader_error: string | null
          reader_status: string | null
          reference_number: string | null
          requirement_classification: string | null
          requires_signature: boolean
          review_date: string | null
          roles: string[]
          status: string
          supersedes_document_id: string | null
          tenant_id: string
          updated_at: string
          version: number
        }
        Insert: {
          alcohol_related?: boolean
          applies_to_all_branches?: boolean
          applies_to_all_roles?: boolean
          approval_note?: string | null
          approval_status?: string
          approved_at?: string | null
          approved_by?: string | null
          archived_at?: string | null
          branch_ids?: string[]
          branches?: string[]
          category: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          expires_at?: string | null
          file_path?: string | null
          id?: string
          include_in_induction?: boolean
          inspection_required?: boolean
          issue_date?: string | null
          issuing_authority?: string | null
          must_display?: boolean
          name: string
          owner_job_title?: string | null
          owner_name?: string | null
          reader_built_at?: string | null
          reader_built_version?: number | null
          reader_enabled?: boolean | null
          reader_error?: string | null
          reader_status?: string | null
          reference_number?: string | null
          requirement_classification?: string | null
          requires_signature?: boolean
          review_date?: string | null
          roles?: string[]
          status?: string
          supersedes_document_id?: string | null
          tenant_id: string
          updated_at?: string
          version?: number
        }
        Update: {
          alcohol_related?: boolean
          applies_to_all_branches?: boolean
          applies_to_all_roles?: boolean
          approval_note?: string | null
          approval_status?: string
          approved_at?: string | null
          approved_by?: string | null
          archived_at?: string | null
          branch_ids?: string[]
          branches?: string[]
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          expires_at?: string | null
          file_path?: string | null
          id?: string
          include_in_induction?: boolean
          inspection_required?: boolean
          issue_date?: string | null
          issuing_authority?: string | null
          must_display?: boolean
          name?: string
          owner_job_title?: string | null
          owner_name?: string | null
          reader_built_at?: string | null
          reader_built_version?: number | null
          reader_enabled?: boolean | null
          reader_error?: string | null
          reader_status?: string | null
          reference_number?: string | null
          requirement_classification?: string | null
          requires_signature?: boolean
          review_date?: string | null
          roles?: string[]
          status?: string
          supersedes_document_id?: string | null
          tenant_id?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "compliance_documents_supersedes_document_id_fkey"
            columns: ["supersedes_document_id"]
            isOneToOne: false
            referencedRelation: "compliance_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_amendments: {
        Row: {
          activated_at: string | null
          amendment_type: string
          created_at: string
          created_by: string
          effective_date: string
          employee_id: string
          employee_resigned_at: string | null
          employer_resigned_at: string | null
          field_changes: Json
          id: string
          new_contract_id: string
          previous_contract_id: string
          reason: string | null
          requires_resignature: boolean
          tenant_id: string
        }
        Insert: {
          activated_at?: string | null
          amendment_type: string
          created_at?: string
          created_by: string
          effective_date: string
          employee_id: string
          employee_resigned_at?: string | null
          employer_resigned_at?: string | null
          field_changes?: Json
          id?: string
          new_contract_id: string
          previous_contract_id: string
          reason?: string | null
          requires_resignature?: boolean
          tenant_id: string
        }
        Update: {
          activated_at?: string | null
          amendment_type?: string
          created_at?: string
          created_by?: string
          effective_date?: string
          employee_id?: string
          employee_resigned_at?: string | null
          employer_resigned_at?: string | null
          field_changes?: Json
          id?: string
          new_contract_id?: string
          previous_contract_id?: string
          reason?: string | null
          requires_resignature?: boolean
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contract_amendments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_amendments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_amendments_new_contract_id_fkey"
            columns: ["new_contract_id"]
            isOneToOne: false
            referencedRelation: "employee_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_amendments_previous_contract_id_fkey"
            columns: ["previous_contract_id"]
            isOneToOne: false
            referencedRelation: "employee_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_amendments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_delivery_attempts: {
        Row: {
          attempted_by: string | null
          created_at: string
          delivery_method: string
          email_verified: boolean
          employee_document_id: string
          error_message: string | null
          id: string
          recipient_email: string
          recipient_role: string
          resolved_at: string | null
          resolved_by: string | null
          status: string
          tenant_id: string
          trigger_source: string
        }
        Insert: {
          attempted_by?: string | null
          created_at?: string
          delivery_method?: string
          email_verified?: boolean
          employee_document_id: string
          error_message?: string | null
          id?: string
          recipient_email: string
          recipient_role: string
          resolved_at?: string | null
          resolved_by?: string | null
          status: string
          tenant_id: string
          trigger_source?: string
        }
        Update: {
          attempted_by?: string | null
          created_at?: string
          delivery_method?: string
          email_verified?: boolean
          employee_document_id?: string
          error_message?: string | null
          id?: string
          recipient_email?: string
          recipient_role?: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          tenant_id?: string
          trigger_source?: string
        }
        Relationships: [
          {
            foreignKeyName: "contract_delivery_attempts_employee_document_id_fkey"
            columns: ["employee_document_id"]
            isOneToOne: false
            referencedRelation: "employee_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_email_verifications: {
        Row: {
          attempts: number
          code_hash: string
          created_at: string
          email: string
          employee_document_id: string
          expires_at: string
          id: string
          last_sent_at: string
          signer_type: string
          signing_token_id: string | null
          tenant_id: string
          verified_at: string | null
        }
        Insert: {
          attempts?: number
          code_hash: string
          created_at?: string
          email: string
          employee_document_id: string
          expires_at: string
          id?: string
          last_sent_at?: string
          signer_type: string
          signing_token_id?: string | null
          tenant_id: string
          verified_at?: string | null
        }
        Update: {
          attempts?: number
          code_hash?: string
          created_at?: string
          email?: string
          employee_document_id?: string
          expires_at?: string
          id?: string
          last_sent_at?: string
          signer_type?: string
          signing_token_id?: string | null
          tenant_id?: string
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contract_email_verifications_employee_document_id_fkey"
            columns: ["employee_document_id"]
            isOneToOne: false
            referencedRelation: "employee_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_email_verifications_signing_token_id_fkey"
            columns: ["signing_token_id"]
            isOneToOne: false
            referencedRelation: "signing_tokens"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_file_recoveries: {
        Row: {
          created_at: string
          created_by: string | null
          created_by_name: string | null
          employee_document_id: string
          id: string
          original_file_hash: string | null
          original_file_path: string | null
          reason: string
          recovery_file_hash: string
          recovery_file_path: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          created_by_name?: string | null
          employee_document_id: string
          id?: string
          original_file_hash?: string | null
          original_file_path?: string | null
          reason: string
          recovery_file_hash: string
          recovery_file_path: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          created_by_name?: string | null
          employee_document_id?: string
          id?: string
          original_file_hash?: string | null
          original_file_path?: string | null
          reason?: string
          recovery_file_hash?: string
          recovery_file_path?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contract_file_recoveries_employee_document_id_fkey"
            columns: ["employee_document_id"]
            isOneToOne: false
            referencedRelation: "employee_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_file_recoveries_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_integrity_checks: {
        Row: {
          checked_at: string
          checked_by: string | null
          detail: string | null
          employee_document_id: string
          file_kind: string
          file_path: string | null
          id: string
          recalculated_hash: string | null
          result: string
          stored_hash: string | null
          tenant_id: string
        }
        Insert: {
          checked_at?: string
          checked_by?: string | null
          detail?: string | null
          employee_document_id: string
          file_kind: string
          file_path?: string | null
          id?: string
          recalculated_hash?: string | null
          result: string
          stored_hash?: string | null
          tenant_id: string
        }
        Update: {
          checked_at?: string
          checked_by?: string | null
          detail?: string | null
          employee_document_id?: string
          file_kind?: string
          file_path?: string | null
          id?: string
          recalculated_hash?: string | null
          result?: string
          stored_hash?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contract_integrity_checks_employee_document_id_fkey"
            columns: ["employee_document_id"]
            isOneToOne: false
            referencedRelation: "employee_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_integrity_checks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_minimum_wage_overrides: {
        Row: {
          age_band: string | null
          base_hourly_rate: number
          contract_id: string | null
          created_at: string
          created_by: string | null
          employee_id: string
          id: string
          override_reason: string
          required_minimum_rate: number
          tenant_id: string
        }
        Insert: {
          age_band?: string | null
          base_hourly_rate: number
          contract_id?: string | null
          created_at?: string
          created_by?: string | null
          employee_id: string
          id?: string
          override_reason: string
          required_minimum_rate: number
          tenant_id: string
        }
        Update: {
          age_band?: string | null
          base_hourly_rate?: number
          contract_id?: string | null
          created_at?: string
          created_by?: string | null
          employee_id?: string
          id?: string
          override_reason?: string
          required_minimum_rate?: number
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contract_minimum_wage_overrides_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "employee_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_minimum_wage_overrides_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_minimum_wage_overrides_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_reference_counters: {
        Row: {
          last_number: number
          tenant_id: string
          year: number
        }
        Insert: {
          last_number?: number
          tenant_id: string
          year: number
        }
        Update: {
          last_number?: number
          tenant_id?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "contract_reference_counters_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_signatures: {
        Row: {
          consent_given: boolean | null
          consent_items: Json | null
          consent_text: string
          created_at: string
          document_hash: string | null
          email_ownership_verified: boolean
          email_verified_at: string | null
          employee_document_id: string
          employee_id: string
          id: string
          invalidated_at: string | null
          invalidated_reason: string | null
          ip_address: string | null
          signatory_title: string | null
          signature_data: string | null
          signature_type: string | null
          signed_at: string
          signed_by_email: string | null
          signer_name: string
          signer_type: string
          signing_token_id: string | null
          tenant_id: string
          typed_name: string | null
          user_agent: string | null
        }
        Insert: {
          consent_given?: boolean | null
          consent_items?: Json | null
          consent_text: string
          created_at?: string
          document_hash?: string | null
          email_ownership_verified?: boolean
          email_verified_at?: string | null
          employee_document_id: string
          employee_id: string
          id?: string
          invalidated_at?: string | null
          invalidated_reason?: string | null
          ip_address?: string | null
          signatory_title?: string | null
          signature_data?: string | null
          signature_type?: string | null
          signed_at?: string
          signed_by_email?: string | null
          signer_name: string
          signer_type: string
          signing_token_id?: string | null
          tenant_id: string
          typed_name?: string | null
          user_agent?: string | null
        }
        Update: {
          consent_given?: boolean | null
          consent_items?: Json | null
          consent_text?: string
          created_at?: string
          document_hash?: string | null
          email_ownership_verified?: boolean
          email_verified_at?: string | null
          employee_document_id?: string
          employee_id?: string
          id?: string
          invalidated_at?: string | null
          invalidated_reason?: string | null
          ip_address?: string | null
          signatory_title?: string | null
          signature_data?: string | null
          signature_type?: string | null
          signed_at?: string
          signed_by_email?: string | null
          signer_name?: string
          signer_type?: string
          signing_token_id?: string | null
          tenant_id?: string
          typed_name?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contract_signatures_employee_document_id_fkey"
            columns: ["employee_document_id"]
            isOneToOne: false
            referencedRelation: "employee_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_signatures_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_signatures_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_signatures_signing_token_id_fkey"
            columns: ["signing_token_id"]
            isOneToOne: false
            referencedRelation: "signing_tokens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_signatures_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_template_versions: {
        Row: {
          checksum: string
          clause_text: Json
          created_at: string
          effective_date: string
          id: string
          notes: string | null
          published_by: string | null
          published_by_name: string | null
          tenant_id: string
          version: string
        }
        Insert: {
          checksum: string
          clause_text: Json
          created_at?: string
          effective_date?: string
          id?: string
          notes?: string | null
          published_by?: string | null
          published_by_name?: string | null
          tenant_id: string
          version: string
        }
        Update: {
          checksum?: string
          clause_text?: Json
          created_at?: string
          effective_date?: string
          id?: string
          notes?: string | null
          published_by?: string | null
          published_by_name?: string | null
          tenant_id?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "contract_template_versions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      country_leave_rules: {
        Row: {
          accrual_rate: number
          country_code: string
          country_name: string
          created_at: string
          default_leave_year_start_day: number
          default_leave_year_start_month: number
          id: string
          max_carryover_days: number
          max_carryover_family_leave_days: number
          max_carryover_sickness_days: number
          max_statutory_days: number
          notes: string | null
          public_holiday_count: number
          public_holidays_included: boolean
          standard_day_hours: number
          standard_week_hours: number
          statutory_weeks: number
          updated_at: string
          workdays_per_week: number
        }
        Insert: {
          accrual_rate?: number
          country_code: string
          country_name: string
          created_at?: string
          default_leave_year_start_day?: number
          default_leave_year_start_month?: number
          id?: string
          max_carryover_days?: number
          max_carryover_family_leave_days?: number
          max_carryover_sickness_days?: number
          max_statutory_days?: number
          notes?: string | null
          public_holiday_count?: number
          public_holidays_included?: boolean
          standard_day_hours?: number
          standard_week_hours?: number
          statutory_weeks?: number
          updated_at?: string
          workdays_per_week?: number
        }
        Update: {
          accrual_rate?: number
          country_code?: string
          country_name?: string
          created_at?: string
          default_leave_year_start_day?: number
          default_leave_year_start_month?: number
          id?: string
          max_carryover_days?: number
          max_carryover_family_leave_days?: number
          max_carryover_sickness_days?: number
          max_statutory_days?: number
          notes?: string | null
          public_holiday_count?: number
          public_holidays_included?: boolean
          standard_day_hours?: number
          standard_week_hours?: number
          statutory_weeks?: number
          updated_at?: string
          workdays_per_week?: number
        }
        Relationships: []
      }
      daily_revenue: {
        Row: {
          created_at: string
          created_by: string | null
          date: string
          id: string
          notes: string | null
          revenue_amount: number
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          date: string
          id?: string
          notes?: string | null
          revenue_amount?: number
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          date?: string
          id?: string
          notes?: string | null
          revenue_amount?: number
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_revenue_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      departments: {
        Row: {
          created_at: string
          description: string | null
          emoji: string
          id: string
          is_active: boolean
          is_system: boolean
          key: string
          label: string
          sort_order: number
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          emoji?: string
          id?: string
          is_active?: boolean
          is_system?: boolean
          key: string
          label: string
          sort_order?: number
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          emoji?: string
          id?: string
          is_active?: boolean
          is_system?: boolean
          key?: string
          label?: string
          sort_order?: number
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "departments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      disciplinary_records: {
        Row: {
          appeal_deadline: string | null
          appeal_outcome: string | null
          appeal_received: boolean | null
          category: string
          created_at: string
          description: string
          employee_id: string
          expiry_date: string | null
          id: string
          incident_date: string
          issued_by: string | null
          meeting_date: string | null
          meeting_notes: string | null
          outcome: string | null
          record_type: string
          status: string
          tenant_id: string
          updated_at: string
          witnesses: string | null
        }
        Insert: {
          appeal_deadline?: string | null
          appeal_outcome?: string | null
          appeal_received?: boolean | null
          category?: string
          created_at?: string
          description: string
          employee_id: string
          expiry_date?: string | null
          id?: string
          incident_date: string
          issued_by?: string | null
          meeting_date?: string | null
          meeting_notes?: string | null
          outcome?: string | null
          record_type?: string
          status?: string
          tenant_id: string
          updated_at?: string
          witnesses?: string | null
        }
        Update: {
          appeal_deadline?: string | null
          appeal_outcome?: string | null
          appeal_received?: boolean | null
          category?: string
          created_at?: string
          description?: string
          employee_id?: string
          expiry_date?: string | null
          id?: string
          incident_date?: string
          issued_by?: string | null
          meeting_date?: string | null
          meeting_notes?: string | null
          outcome?: string | null
          record_type?: string
          status?: string
          tenant_id?: string
          updated_at?: string
          witnesses?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "disciplinary_records_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disciplinary_records_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disciplinary_records_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      document_audit_log: {
        Row: {
          action: string
          created_at: string
          document_id: string
          employee_id: string
          id: string
          metadata: Json | null
          performed_by: string | null
          tenant_id: string
        }
        Insert: {
          action: string
          created_at?: string
          document_id: string
          employee_id: string
          id?: string
          metadata?: Json | null
          performed_by?: string | null
          tenant_id: string
        }
        Update: {
          action?: string
          created_at?: string
          document_id?: string
          employee_id?: string
          id?: string
          metadata?: Json | null
          performed_by?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_audit_log_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "employee_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_audit_log_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_audit_log_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_audit_log_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      document_reader_progress: {
        Row: {
          answer_index: number | null
          answered_at: string | null
          answered_correctly: boolean | null
          attempts: number
          created_at: string
          document_id: string
          employee_id: string | null
          id: string
          pack_id: string | null
          pack_item_id: string | null
          question_id: string | null
          read_at: string | null
          section_id: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          answer_index?: number | null
          answered_at?: string | null
          answered_correctly?: boolean | null
          attempts?: number
          created_at?: string
          document_id: string
          employee_id?: string | null
          id?: string
          pack_id?: string | null
          pack_item_id?: string | null
          question_id?: string | null
          read_at?: string | null
          section_id: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          answer_index?: number | null
          answered_at?: string | null
          answered_correctly?: boolean | null
          attempts?: number
          created_at?: string
          document_id?: string
          employee_id?: string | null
          id?: string
          pack_id?: string | null
          pack_item_id?: string | null
          question_id?: string | null
          read_at?: string | null
          section_id?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_reader_progress_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "compliance_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_reader_progress_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "document_reader_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      document_reader_questions: {
        Row: {
          approval_status: string
          approved_at: string | null
          approved_by: string | null
          correct_index: number
          created_at: string
          document_id: string
          explanation: string | null
          id: string
          options: Json
          origin: string
          question: string
          section_id: string | null
          sort_order: number
          tenant_id: string
          updated_at: string
        }
        Insert: {
          approval_status?: string
          approved_at?: string | null
          approved_by?: string | null
          correct_index?: number
          created_at?: string
          document_id: string
          explanation?: string | null
          id?: string
          options?: Json
          origin?: string
          question: string
          section_id?: string | null
          sort_order?: number
          tenant_id: string
          updated_at?: string
        }
        Update: {
          approval_status?: string
          approved_at?: string | null
          approved_by?: string | null
          correct_index?: number
          created_at?: string
          document_id?: string
          explanation?: string | null
          id?: string
          options?: Json
          origin?: string
          question?: string
          section_id?: string | null
          sort_order?: number
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_reader_questions_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "compliance_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_reader_questions_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "document_reader_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      document_reader_sections: {
        Row: {
          body: string
          created_at: string
          document_id: string
          document_version: number | null
          heading: string
          id: string
          sort_order: number
          source_page: number | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          body?: string
          created_at?: string
          document_id: string
          document_version?: number | null
          heading: string
          id?: string
          sort_order?: number
          source_page?: number | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          body?: string
          created_at?: string
          document_id?: string
          document_version?: number | null
          heading?: string
          id?: string
          sort_order?: number
          source_page?: number | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_reader_sections_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "compliance_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      document_request_audit: {
        Row: {
          action: string
          created_at: string
          employee_id: string
          id: string
          metadata: Json | null
          performed_by: string | null
          request_id: string
          tenant_id: string
        }
        Insert: {
          action: string
          created_at?: string
          employee_id: string
          id?: string
          metadata?: Json | null
          performed_by?: string | null
          request_id: string
          tenant_id: string
        }
        Update: {
          action?: string
          created_at?: string
          employee_id?: string
          id?: string
          metadata?: Json | null
          performed_by?: string | null
          request_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_request_audit_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_request_audit_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_request_audit_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "document_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_request_audit_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      document_request_templates: {
        Row: {
          applies_to_countries: string[] | null
          applies_to_departments: string[] | null
          applies_to_locations: string[] | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          request_items: Json
          template_name: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          applies_to_countries?: string[] | null
          applies_to_departments?: string[] | null
          applies_to_locations?: string[] | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          request_items?: Json
          template_name: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          applies_to_countries?: string[] | null
          applies_to_departments?: string[] | null
          applies_to_locations?: string[] | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          request_items?: Json
          template_name?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_request_templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      document_requests: {
        Row: {
          cancelled_at: string | null
          completed_at: string | null
          created_at: string
          document_type: string
          due_date: string | null
          employee_id: string
          fulfilled_document_id: string | null
          id: string
          notes: string | null
          priority: string
          rejection_reason: string | null
          request_description: string | null
          request_title: string
          requested_by: string | null
          requires_verification: boolean
          status: string
          tenant_id: string
          updated_at: string
          verified_at: string | null
          viewed_at: string | null
        }
        Insert: {
          cancelled_at?: string | null
          completed_at?: string | null
          created_at?: string
          document_type?: string
          due_date?: string | null
          employee_id: string
          fulfilled_document_id?: string | null
          id?: string
          notes?: string | null
          priority?: string
          rejection_reason?: string | null
          request_description?: string | null
          request_title: string
          requested_by?: string | null
          requires_verification?: boolean
          status?: string
          tenant_id: string
          updated_at?: string
          verified_at?: string | null
          viewed_at?: string | null
        }
        Update: {
          cancelled_at?: string | null
          completed_at?: string | null
          created_at?: string
          document_type?: string
          due_date?: string | null
          employee_id?: string
          fulfilled_document_id?: string | null
          id?: string
          notes?: string | null
          priority?: string
          rejection_reason?: string | null
          request_description?: string | null
          request_title?: string
          requested_by?: string | null
          requires_verification?: boolean
          status?: string
          tenant_id?: string
          updated_at?: string
          verified_at?: string | null
          viewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "document_requests_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_requests_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_requests_fulfilled_document_id_fkey"
            columns: ["fulfilled_document_id"]
            isOneToOne: false
            referencedRelation: "employee_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_requests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      document_version_reissues: {
        Row: {
          actioned_employee_ids: string[]
          affected_count: number
          affected_employee_ids: string[]
          change_significance: string
          created_at: string
          created_by: string | null
          decided_at: string | null
          decided_by: string | null
          decided_by_name: string | null
          decision: string
          decision_note: string | null
          document_id: string
          document_name: string
          from_version: number | null
          id: string
          previous_document_id: string | null
          tenant_id: string
          to_version: number | null
          updated_at: string
        }
        Insert: {
          actioned_employee_ids?: string[]
          affected_count?: number
          affected_employee_ids?: string[]
          change_significance?: string
          created_at?: string
          created_by?: string | null
          decided_at?: string | null
          decided_by?: string | null
          decided_by_name?: string | null
          decision?: string
          decision_note?: string | null
          document_id: string
          document_name: string
          from_version?: number | null
          id?: string
          previous_document_id?: string | null
          tenant_id: string
          to_version?: number | null
          updated_at?: string
        }
        Update: {
          actioned_employee_ids?: string[]
          affected_count?: number
          affected_employee_ids?: string[]
          change_significance?: string
          created_at?: string
          created_by?: string | null
          decided_at?: string | null
          decided_by?: string | null
          decided_by_name?: string | null
          decision?: string
          decision_note?: string | null
          document_id?: string
          document_name?: string
          from_version?: number | null
          id?: string
          previous_document_id?: string | null
          tenant_id?: string
          to_version?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_version_reissues_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "compliance_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_version_reissues_previous_document_id_fkey"
            columns: ["previous_document_id"]
            isOneToOne: false
            referencedRelation: "compliance_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_availability: {
        Row: {
          available_from: string | null
          available_to: string | null
          created_at: string
          day_of_week: number
          employee_id: string
          id: string
          is_available: boolean
          notes: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          available_from?: string | null
          available_to?: string | null
          created_at?: string
          day_of_week: number
          employee_id: string
          id?: string
          is_available?: boolean
          notes?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          available_from?: string | null
          available_to?: string | null
          created_at?: string
          day_of_week?: number
          employee_id?: string
          id?: string
          is_available?: boolean
          notes?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_availability_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_availability_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_availability_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_branches: {
        Row: {
          branch: string
          created_at: string
          employee_id: string
          id: string
          is_primary: boolean | null
          tenant_id: string
        }
        Insert: {
          branch: string
          created_at?: string
          employee_id: string
          id?: string
          is_primary?: boolean | null
          tenant_id: string
        }
        Update: {
          branch?: string
          created_at?: string
          employee_id?: string
          id?: string
          is_primary?: boolean | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_branches_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_branches_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_branches_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_changes: {
        Row: {
          change_type: string
          changed_by: string | null
          created_at: string
          employee_id: string
          field_name: string | null
          id: string
          new_value: string | null
          notes: string | null
          old_value: string | null
          tenant_id: string
        }
        Insert: {
          change_type: string
          changed_by?: string | null
          created_at?: string
          employee_id: string
          field_name?: string | null
          id?: string
          new_value?: string | null
          notes?: string | null
          old_value?: string | null
          tenant_id: string
        }
        Update: {
          change_type?: string
          changed_by?: string | null
          created_at?: string
          employee_id?: string
          field_name?: string | null
          id?: string
          new_value?: string | null
          notes?: string | null
          old_value?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_changes_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_changes_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_changes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_contract_terms: {
        Row: {
          actual_service_charge_paid: number | null
          annual_salary: number | null
          base_hourly_rate: number | null
          contract_id: string | null
          contracted_hours: number | null
          contracted_hours_basis: string | null
          created_at: string
          created_by: string | null
          department: string | null
          effective_from: string
          effective_to: string | null
          employee_id: string
          employment_type: string | null
          estimated_service_charge_rate: number | null
          guaranteed_service_charge_rate: number | null
          holiday_entitlement_method: string | null
          hourly_rate: number | null
          id: string
          is_apprentice: boolean | null
          notice_period_weeks: number | null
          overtime_model: string | null
          pay_type: string | null
          probation_end_date: string | null
          role_title: string | null
          root_contract_id: string | null
          service_charge_eligible: boolean | null
          service_charge_policy_note: string | null
          source_amendment_id: string | null
          source_type: string
          status: string
          tenant_id: string
          tronc_scheme_name: string | null
          updated_at: string
          version_number: number
          work_location: string | null
        }
        Insert: {
          actual_service_charge_paid?: number | null
          annual_salary?: number | null
          base_hourly_rate?: number | null
          contract_id?: string | null
          contracted_hours?: number | null
          contracted_hours_basis?: string | null
          created_at?: string
          created_by?: string | null
          department?: string | null
          effective_from: string
          effective_to?: string | null
          employee_id: string
          employment_type?: string | null
          estimated_service_charge_rate?: number | null
          guaranteed_service_charge_rate?: number | null
          holiday_entitlement_method?: string | null
          hourly_rate?: number | null
          id?: string
          is_apprentice?: boolean | null
          notice_period_weeks?: number | null
          overtime_model?: string | null
          pay_type?: string | null
          probation_end_date?: string | null
          role_title?: string | null
          root_contract_id?: string | null
          service_charge_eligible?: boolean | null
          service_charge_policy_note?: string | null
          source_amendment_id?: string | null
          source_type: string
          status?: string
          tenant_id: string
          tronc_scheme_name?: string | null
          updated_at?: string
          version_number?: number
          work_location?: string | null
        }
        Update: {
          actual_service_charge_paid?: number | null
          annual_salary?: number | null
          base_hourly_rate?: number | null
          contract_id?: string | null
          contracted_hours?: number | null
          contracted_hours_basis?: string | null
          created_at?: string
          created_by?: string | null
          department?: string | null
          effective_from?: string
          effective_to?: string | null
          employee_id?: string
          employment_type?: string | null
          estimated_service_charge_rate?: number | null
          guaranteed_service_charge_rate?: number | null
          holiday_entitlement_method?: string | null
          hourly_rate?: number | null
          id?: string
          is_apprentice?: boolean | null
          notice_period_weeks?: number | null
          overtime_model?: string | null
          pay_type?: string | null
          probation_end_date?: string | null
          role_title?: string | null
          root_contract_id?: string | null
          service_charge_eligible?: boolean | null
          service_charge_policy_note?: string | null
          source_amendment_id?: string | null
          source_type?: string
          status?: string
          tenant_id?: string
          tronc_scheme_name?: string | null
          updated_at?: string
          version_number?: number
          work_location?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_contract_terms_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "employee_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_contract_terms_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_contract_terms_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_contract_terms_root_contract_id_fkey"
            columns: ["root_contract_id"]
            isOneToOne: false
            referencedRelation: "employee_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_contract_terms_source_amendment_id_fkey"
            columns: ["source_amendment_id"]
            isOneToOne: false
            referencedRelation: "contract_amendments"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_documents: {
        Row: {
          amendment_reason: string | null
          amendment_summary: string | null
          amendment_type: string | null
          contract_last_token_id: string | null
          contract_reference: string | null
          contract_scheduled_send_at: string | null
          contract_send_error: string | null
          contract_send_status: string | null
          contract_sent_at: string | null
          contract_sent_to: string | null
          contract_state: string | null
          created_at: string
          details_submitted_at: string | null
          document_name: string
          document_status: string
          document_type: Database["public"]["Enums"]["document_type"]
          effective_date: string | null
          employee_id: string
          employer_signatory_email: string | null
          employer_signatory_name: string | null
          employer_signatory_source: string | null
          expires_at: string | null
          extracted_data: Json | null
          extraction_confidence: number | null
          extraction_source: string | null
          extraction_warnings: Json | null
          file_path: string
          file_size: number | null
          final_document_hash: string | null
          final_signed_pdf_url: string | null
          id: string
          issue_date: string | null
          legacy_origin_note: string | null
          mime_type: string | null
          notes: string | null
          parent_contract_id: string | null
          rejected_reason: string | null
          requires_details_first: boolean
          review_accepted_at: string | null
          review_accepted_by: string | null
          root_contract_id: string | null
          signed_scan_file_path: string | null
          signed_scan_uploaded_at: string | null
          signed_scan_uploaded_by_signer: string | null
          superseded_at: string | null
          superseded_by: string | null
          template_version: string | null
          tenant_id: string
          terminated_at: string | null
          terminated_reason: string | null
          terms_snapshot: Json | null
          updated_at: string
          uploaded_by: string | null
          verification_date: string | null
          verification_method: string | null
          verification_notes: string | null
          verified_by: string | null
          version_number: number
          wording_provenance: string | null
        }
        Insert: {
          amendment_reason?: string | null
          amendment_summary?: string | null
          amendment_type?: string | null
          contract_last_token_id?: string | null
          contract_reference?: string | null
          contract_scheduled_send_at?: string | null
          contract_send_error?: string | null
          contract_send_status?: string | null
          contract_sent_at?: string | null
          contract_sent_to?: string | null
          contract_state?: string | null
          created_at?: string
          details_submitted_at?: string | null
          document_name: string
          document_status?: string
          document_type: Database["public"]["Enums"]["document_type"]
          effective_date?: string | null
          employee_id: string
          employer_signatory_email?: string | null
          employer_signatory_name?: string | null
          employer_signatory_source?: string | null
          expires_at?: string | null
          extracted_data?: Json | null
          extraction_confidence?: number | null
          extraction_source?: string | null
          extraction_warnings?: Json | null
          file_path: string
          file_size?: number | null
          final_document_hash?: string | null
          final_signed_pdf_url?: string | null
          id?: string
          issue_date?: string | null
          legacy_origin_note?: string | null
          mime_type?: string | null
          notes?: string | null
          parent_contract_id?: string | null
          rejected_reason?: string | null
          requires_details_first?: boolean
          review_accepted_at?: string | null
          review_accepted_by?: string | null
          root_contract_id?: string | null
          signed_scan_file_path?: string | null
          signed_scan_uploaded_at?: string | null
          signed_scan_uploaded_by_signer?: string | null
          superseded_at?: string | null
          superseded_by?: string | null
          template_version?: string | null
          tenant_id: string
          terminated_at?: string | null
          terminated_reason?: string | null
          terms_snapshot?: Json | null
          updated_at?: string
          uploaded_by?: string | null
          verification_date?: string | null
          verification_method?: string | null
          verification_notes?: string | null
          verified_by?: string | null
          version_number?: number
          wording_provenance?: string | null
        }
        Update: {
          amendment_reason?: string | null
          amendment_summary?: string | null
          amendment_type?: string | null
          contract_last_token_id?: string | null
          contract_reference?: string | null
          contract_scheduled_send_at?: string | null
          contract_send_error?: string | null
          contract_send_status?: string | null
          contract_sent_at?: string | null
          contract_sent_to?: string | null
          contract_state?: string | null
          created_at?: string
          details_submitted_at?: string | null
          document_name?: string
          document_status?: string
          document_type?: Database["public"]["Enums"]["document_type"]
          effective_date?: string | null
          employee_id?: string
          employer_signatory_email?: string | null
          employer_signatory_name?: string | null
          employer_signatory_source?: string | null
          expires_at?: string | null
          extracted_data?: Json | null
          extraction_confidence?: number | null
          extraction_source?: string | null
          extraction_warnings?: Json | null
          file_path?: string
          file_size?: number | null
          final_document_hash?: string | null
          final_signed_pdf_url?: string | null
          id?: string
          issue_date?: string | null
          legacy_origin_note?: string | null
          mime_type?: string | null
          notes?: string | null
          parent_contract_id?: string | null
          rejected_reason?: string | null
          requires_details_first?: boolean
          review_accepted_at?: string | null
          review_accepted_by?: string | null
          root_contract_id?: string | null
          signed_scan_file_path?: string | null
          signed_scan_uploaded_at?: string | null
          signed_scan_uploaded_by_signer?: string | null
          superseded_at?: string | null
          superseded_by?: string | null
          template_version?: string | null
          tenant_id?: string
          terminated_at?: string | null
          terminated_reason?: string | null
          terms_snapshot?: Json | null
          updated_at?: string
          uploaded_by?: string | null
          verification_date?: string | null
          verification_method?: string | null
          verification_notes?: string | null
          verified_by?: string | null
          version_number?: number
          wording_provenance?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_documents_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_documents_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_documents_parent_contract_id_fkey"
            columns: ["parent_contract_id"]
            isOneToOne: false
            referencedRelation: "employee_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_documents_root_contract_id_fkey"
            columns: ["root_contract_id"]
            isOneToOne: false
            referencedRelation: "employee_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_documents_superseded_by_fkey"
            columns: ["superseded_by"]
            isOneToOne: false
            referencedRelation: "employee_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_documents_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_info_requests: {
        Row: {
          cancelled_at: string | null
          created_at: string
          employee_id: string
          id: string
          last_reminder_at: string | null
          opened_at: string | null
          preset: string | null
          recipient_email: string | null
          reminder_count: number
          reminder_sent_at: string | null
          replaced_by: string | null
          request_kind: string
          requested_by: string | null
          requested_by_name: string | null
          requested_fields: string[]
          rtw_uploaded_count: number
          sent_at: string
          status: string
          submitted_at: string | null
          submitted_data: Json
          tenant_id: string
          token: string
          token_expires_at: string
          updated_at: string
        }
        Insert: {
          cancelled_at?: string | null
          created_at?: string
          employee_id: string
          id?: string
          last_reminder_at?: string | null
          opened_at?: string | null
          preset?: string | null
          recipient_email?: string | null
          reminder_count?: number
          reminder_sent_at?: string | null
          replaced_by?: string | null
          request_kind?: string
          requested_by?: string | null
          requested_by_name?: string | null
          requested_fields?: string[]
          rtw_uploaded_count?: number
          sent_at?: string
          status?: string
          submitted_at?: string | null
          submitted_data?: Json
          tenant_id: string
          token: string
          token_expires_at?: string
          updated_at?: string
        }
        Update: {
          cancelled_at?: string | null
          created_at?: string
          employee_id?: string
          id?: string
          last_reminder_at?: string | null
          opened_at?: string | null
          preset?: string | null
          recipient_email?: string | null
          reminder_count?: number
          reminder_sent_at?: string | null
          replaced_by?: string | null
          request_kind?: string
          requested_by?: string | null
          requested_by_name?: string | null
          requested_fields?: string[]
          rtw_uploaded_count?: number
          sent_at?: string
          status?: string
          submitted_at?: string | null
          submitted_data?: Json
          tenant_id?: string
          token?: string
          token_expires_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_info_requests_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_info_requests_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_info_requests_replaced_by_fkey"
            columns: ["replaced_by"]
            isOneToOne: false
            referencedRelation: "employee_info_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_onboarding_data: {
        Row: {
          bank_details: Json | null
          created_at: string
          emergency_contact: Json | null
          employee_id: string
          id: string
          onboarding_approved_at: string | null
          onboarding_approved_by: string | null
          onboarding_completed_at: string | null
          personal_info: Json | null
          rtw_review_notes: string | null
          rtw_reviewed_at: string | null
          rtw_reviewed_by: string | null
          rtw_status: string
          step_completed: number
          submitted_at: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          bank_details?: Json | null
          created_at?: string
          emergency_contact?: Json | null
          employee_id: string
          id?: string
          onboarding_approved_at?: string | null
          onboarding_approved_by?: string | null
          onboarding_completed_at?: string | null
          personal_info?: Json | null
          rtw_review_notes?: string | null
          rtw_reviewed_at?: string | null
          rtw_reviewed_by?: string | null
          rtw_status?: string
          step_completed?: number
          submitted_at?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          bank_details?: Json | null
          created_at?: string
          emergency_contact?: Json | null
          employee_id?: string
          id?: string
          onboarding_approved_at?: string | null
          onboarding_approved_by?: string | null
          onboarding_completed_at?: string | null
          personal_info?: Json | null
          rtw_review_notes?: string | null
          rtw_reviewed_at?: string | null
          rtw_reviewed_by?: string | null
          rtw_status?: string
          step_completed?: number
          submitted_at?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_onboarding_data_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: true
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_onboarding_data_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: true
            referencedRelation: "employees_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_onboarding_data_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_skills: {
        Row: {
          created_at: string
          employee_id: string
          id: string
          proficiency_level: number | null
          skill_type: string
          skill_value: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          employee_id: string
          id?: string
          proficiency_level?: number | null
          skill_type?: string
          skill_value: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          employee_id?: string
          id?: string
          proficiency_level?: number | null
          skill_type?: string
          skill_value?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_skills_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_skills_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_skills_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_usage: {
        Row: {
          active_employee_count: number
          billing_period_end: string
          billing_period_start: string
          created_at: string
          currency: string
          employees_added: number
          employees_removed: number
          id: string
          plan_id: string | null
          price_per_employee: number
          snapshot_at: string
          tenant_id: string
          total_amount: number
        }
        Insert: {
          active_employee_count?: number
          billing_period_end: string
          billing_period_start: string
          created_at?: string
          currency?: string
          employees_added?: number
          employees_removed?: number
          id?: string
          plan_id?: string | null
          price_per_employee?: number
          snapshot_at?: string
          tenant_id: string
          total_amount?: number
        }
        Update: {
          active_employee_count?: number
          billing_period_end?: string
          billing_period_start?: string
          created_at?: string
          currency?: string
          employees_added?: number
          employees_removed?: number
          id?: string
          plan_id?: string | null
          price_per_employee?: number
          snapshot_at?: string
          tenant_id?: string
          total_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "employee_usage_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_usage_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          archived_at: string | null
          bank_account_no: string | null
          contract_country: string | null
          created_at: string
          date_of_birth: string | null
          department: string
          email: string | null
          employee_ref: string | null
          employing_entity: string | null
          end_date: string | null
          forename: string
          holiday_entitlement_method: string | null
          hourly_rate: number
          id: string
          import_aliases: string[] | null
          is_test_record: boolean
          nationality: string | null
          ni_number: string | null
          notes: string | null
          onboarding_token: string | null
          onboarding_token_expires_at: string | null
          overtime_model: string | null
          passport_no: string | null
          pay_amount: number | null
          pay_type: string | null
          preferred_name: string | null
          public_holiday_calendar: string | null
          residence_permit: string | null
          service_charge: number | null
          service_charge_eligible: boolean | null
          settlement_status: string | null
          sharing_code: string | null
          sort_code: string | null
          start_date: string | null
          status: Database["public"]["Enums"]["employee_status"]
          surname: string
          tenant_id: string
          updated_at: string
          user_id: string | null
          work_country: string | null
          work_region: string | null
        }
        Insert: {
          archived_at?: string | null
          bank_account_no?: string | null
          contract_country?: string | null
          created_at?: string
          date_of_birth?: string | null
          department: string
          email?: string | null
          employee_ref?: string | null
          employing_entity?: string | null
          end_date?: string | null
          forename: string
          holiday_entitlement_method?: string | null
          hourly_rate: number
          id?: string
          import_aliases?: string[] | null
          is_test_record?: boolean
          nationality?: string | null
          ni_number?: string | null
          notes?: string | null
          onboarding_token?: string | null
          onboarding_token_expires_at?: string | null
          overtime_model?: string | null
          passport_no?: string | null
          pay_amount?: number | null
          pay_type?: string | null
          preferred_name?: string | null
          public_holiday_calendar?: string | null
          residence_permit?: string | null
          service_charge?: number | null
          service_charge_eligible?: boolean | null
          settlement_status?: string | null
          sharing_code?: string | null
          sort_code?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["employee_status"]
          surname: string
          tenant_id: string
          updated_at?: string
          user_id?: string | null
          work_country?: string | null
          work_region?: string | null
        }
        Update: {
          archived_at?: string | null
          bank_account_no?: string | null
          contract_country?: string | null
          created_at?: string
          date_of_birth?: string | null
          department?: string
          email?: string | null
          employee_ref?: string | null
          employing_entity?: string | null
          end_date?: string | null
          forename?: string
          holiday_entitlement_method?: string | null
          hourly_rate?: number
          id?: string
          import_aliases?: string[] | null
          is_test_record?: boolean
          nationality?: string | null
          ni_number?: string | null
          notes?: string | null
          onboarding_token?: string | null
          onboarding_token_expires_at?: string | null
          overtime_model?: string | null
          passport_no?: string | null
          pay_amount?: number | null
          pay_type?: string | null
          preferred_name?: string | null
          public_holiday_calendar?: string | null
          residence_permit?: string | null
          service_charge?: number | null
          service_charge_eligible?: boolean | null
          settlement_status?: string | null
          sharing_code?: string | null
          sort_code?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["employee_status"]
          surname?: string
          tenant_id?: string
          updated_at?: string
          user_id?: string | null
          work_country?: string | null
          work_region?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employees_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      evidence_files: {
        Row: {
          created_at: string
          employee_id: string
          file_path: string
          file_size: number | null
          file_type: string
          id: string
          mime_type: string | null
          notes: string | null
          original_filename: string
          related_date: string | null
          request_id: string | null
          review_notes: string | null
          review_status: string
          reviewed_at: string | null
          reviewed_by: string | null
          tenant_id: string
          uploaded_at: string
        }
        Insert: {
          created_at?: string
          employee_id: string
          file_path: string
          file_size?: number | null
          file_type?: string
          id?: string
          mime_type?: string | null
          notes?: string | null
          original_filename: string
          related_date?: string | null
          request_id?: string | null
          review_notes?: string | null
          review_status?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          tenant_id: string
          uploaded_at?: string
        }
        Update: {
          created_at?: string
          employee_id?: string
          file_path?: string
          file_size?: number | null
          file_type?: string
          id?: string
          mime_type?: string | null
          notes?: string | null
          original_filename?: string
          related_date?: string | null
          request_id?: string | null
          review_notes?: string | null
          review_status?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          tenant_id?: string
          uploaded_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "evidence_files_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evidence_files_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evidence_files_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "evidence_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evidence_files_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      evidence_requests: {
        Row: {
          created_at: string
          description: string | null
          due_date: string | null
          employee_id: string
          id: string
          related_absence_id: string | null
          related_date: string | null
          related_time_entry_id: string | null
          request_type: string
          requested_by: string | null
          status: string
          tenant_id: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          due_date?: string | null
          employee_id: string
          id?: string
          related_absence_id?: string | null
          related_date?: string | null
          related_time_entry_id?: string | null
          request_type?: string
          requested_by?: string | null
          status?: string
          tenant_id: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          due_date?: string | null
          employee_id?: string
          id?: string
          related_absence_id?: string | null
          related_date?: string | null
          related_time_entry_id?: string | null
          request_type?: string
          requested_by?: string | null
          status?: string
          tenant_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "evidence_requests_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evidence_requests_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evidence_requests_related_absence_id_fkey"
            columns: ["related_absence_id"]
            isOneToOne: false
            referencedRelation: "absence_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evidence_requests_related_time_entry_id_fkey"
            columns: ["related_time_entry_id"]
            isOneToOne: false
            referencedRelation: "time_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evidence_requests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      holiday_adjustments: {
        Row: {
          adjusted_by: string | null
          adjustment_type: string
          created_at: string
          employee_id: string
          hours: number
          id: string
          leave_year_end: string
          leave_year_start: string
          notes: string | null
          reason: string
          tenant_id: string
        }
        Insert: {
          adjusted_by?: string | null
          adjustment_type: string
          created_at?: string
          employee_id: string
          hours: number
          id?: string
          leave_year_end: string
          leave_year_start: string
          notes?: string | null
          reason: string
          tenant_id: string
        }
        Update: {
          adjusted_by?: string | null
          adjustment_type?: string
          created_at?: string
          employee_id?: string
          hours?: number
          id?: string
          leave_year_end?: string
          leave_year_start?: string
          notes?: string | null
          reason?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "holiday_adjustments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "holiday_adjustments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "holiday_adjustments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      holiday_balance_audit_log: {
        Row: {
          accrued_delta: number | null
          carried_over_delta: number | null
          created_at: string
          employee_id: string
          id: string
          leave_year_end: string
          leave_year_start: string
          new_hours_accrued: number | null
          new_hours_carried_over: number | null
          new_hours_taken: number | null
          old_hours_accrued: number | null
          old_hours_carried_over: number | null
          old_hours_taken: number | null
          old_updated_at: string | null
          reason: string
          source_table: string
          taken_delta: number | null
          tenant_id: string
        }
        Insert: {
          accrued_delta?: number | null
          carried_over_delta?: number | null
          created_at?: string
          employee_id: string
          id?: string
          leave_year_end: string
          leave_year_start: string
          new_hours_accrued?: number | null
          new_hours_carried_over?: number | null
          new_hours_taken?: number | null
          old_hours_accrued?: number | null
          old_hours_carried_over?: number | null
          old_hours_taken?: number | null
          old_updated_at?: string | null
          reason: string
          source_table?: string
          taken_delta?: number | null
          tenant_id: string
        }
        Update: {
          accrued_delta?: number | null
          carried_over_delta?: number | null
          created_at?: string
          employee_id?: string
          id?: string
          leave_year_end?: string
          leave_year_start?: string
          new_hours_accrued?: number | null
          new_hours_carried_over?: number | null
          new_hours_taken?: number | null
          old_hours_accrued?: number | null
          old_hours_carried_over?: number | null
          old_hours_taken?: number | null
          old_updated_at?: string | null
          reason?: string
          source_table?: string
          taken_delta?: number | null
          tenant_id?: string
        }
        Relationships: []
      }
      holiday_balances: {
        Row: {
          created_at: string
          employee_id: string
          hours_accrued: number | null
          hours_carried_over: number | null
          hours_taken: number | null
          id: string
          leave_year_end: string
          leave_year_start: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          employee_id: string
          hours_accrued?: number | null
          hours_carried_over?: number | null
          hours_taken?: number | null
          id?: string
          leave_year_end: string
          leave_year_start: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          employee_id?: string
          hours_accrued?: number | null
          hours_carried_over?: number | null
          hours_taken?: number | null
          id?: string
          leave_year_end?: string
          leave_year_start?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "holiday_balances_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "holiday_balances_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "holiday_balances_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      holiday_integrity_log: {
        Row: {
          check_type: string
          details: Json | null
          employee_id: string | null
          employee_name: string | null
          id: string
          leave_year: number
          resolved_at: string | null
          resolved_by: string | null
          run_at: string
          severity: string
          status: string
          tenant_id: string
        }
        Insert: {
          check_type: string
          details?: Json | null
          employee_id?: string | null
          employee_name?: string | null
          id?: string
          leave_year: number
          resolved_at?: string | null
          resolved_by?: string | null
          run_at?: string
          severity?: string
          status?: string
          tenant_id: string
        }
        Update: {
          check_type?: string
          details?: Json | null
          employee_id?: string | null
          employee_name?: string | null
          id?: string
          leave_year?: number
          resolved_at?: string | null
          resolved_by?: string | null
          run_at?: string
          severity?: string
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "holiday_integrity_log_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "holiday_integrity_log_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "holiday_integrity_log_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      holiday_ledger: {
        Row: {
          amount: number | null
          created_at: string
          created_by: string | null
          employee_id: string
          entry_date: string
          entry_type: Database["public"]["Enums"]["holiday_ledger_entry_type"]
          hours: number
          id: string
          leave_year_start: string
          notes: string | null
          source_id: string | null
          source_table: string | null
          tenant_id: string
        }
        Insert: {
          amount?: number | null
          created_at?: string
          created_by?: string | null
          employee_id: string
          entry_date?: string
          entry_type: Database["public"]["Enums"]["holiday_ledger_entry_type"]
          hours?: number
          id?: string
          leave_year_start: string
          notes?: string | null
          source_id?: string | null
          source_table?: string | null
          tenant_id: string
        }
        Update: {
          amount?: number | null
          created_at?: string
          created_by?: string | null
          employee_id?: string
          entry_date?: string
          entry_type?: Database["public"]["Enums"]["holiday_ledger_entry_type"]
          hours?: number
          id?: string
          leave_year_start?: string
          notes?: string | null
          source_id?: string | null
          source_table?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "holiday_ledger_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "holiday_ledger_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "holiday_ledger_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      holiday_payments: {
        Row: {
          created_at: string
          employee_id: string | null
          employee_name: string
          holiday_taken_date: string | null
          hours: number
          id: string
          leave_year_end: string | null
          leave_year_start: string | null
          notes: string | null
          payroll_period_id: string
          rate: number
          tenant_id: string
          total: number
        }
        Insert: {
          created_at?: string
          employee_id?: string | null
          employee_name: string
          holiday_taken_date?: string | null
          hours: number
          id?: string
          leave_year_end?: string | null
          leave_year_start?: string | null
          notes?: string | null
          payroll_period_id: string
          rate: number
          tenant_id: string
          total: number
        }
        Update: {
          created_at?: string
          employee_id?: string | null
          employee_name?: string
          holiday_taken_date?: string | null
          hours?: number
          id?: string
          leave_year_end?: string | null
          leave_year_start?: string | null
          notes?: string | null
          payroll_period_id?: string
          rate?: number
          tenant_id?: string
          total?: number
        }
        Relationships: [
          {
            foreignKeyName: "holiday_payments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "holiday_payments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "holiday_payments_payroll_period_id_fkey"
            columns: ["payroll_period_id"]
            isOneToOne: false
            referencedRelation: "payroll_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "holiday_payments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      holiday_requests: {
        Row: {
          created_at: string
          employee_id: string
          end_date: string
          hours_requested: number
          id: string
          reason: string | null
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          start_date: string
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          employee_id: string
          end_date: string
          hours_requested?: number
          id?: string
          reason?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          start_date: string
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          employee_id?: string
          end_date?: string
          hours_requested?: number
          id?: string
          reason?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          start_date?: string
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "holiday_requests_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "holiday_requests_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "holiday_requests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      impersonation_log: {
        Row: {
          ended_at: string | null
          id: string
          impersonated_role: string
          impersonated_user_label: string | null
          platform_admin_id: string
          sandbox_tenant_id: string
          started_at: string
        }
        Insert: {
          ended_at?: string | null
          id?: string
          impersonated_role: string
          impersonated_user_label?: string | null
          platform_admin_id: string
          sandbox_tenant_id: string
          started_at?: string
        }
        Update: {
          ended_at?: string | null
          id?: string
          impersonated_role?: string
          impersonated_user_label?: string | null
          platform_admin_id?: string
          sandbox_tenant_id?: string
          started_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "impersonation_log_sandbox_tenant_id_fkey"
            columns: ["sandbox_tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      incident_access_grants: {
        Row: {
          can_view_medical: boolean
          can_view_senior: boolean
          granted_at: string
          granted_by: string | null
          id: string
          note: string | null
          tenant_id: string
          user_id: string
        }
        Insert: {
          can_view_medical?: boolean
          can_view_senior?: boolean
          granted_at?: string
          granted_by?: string | null
          id?: string
          note?: string | null
          tenant_id: string
          user_id: string
        }
        Update: {
          can_view_medical?: boolean
          can_view_senior?: boolean
          granted_at?: string
          granted_by?: string | null
          id?: string
          note?: string | null
          tenant_id?: string
          user_id?: string
        }
        Relationships: []
      }
      incident_amendments: {
        Row: {
          amended_by: string | null
          amended_by_name: string | null
          changes: Json
          created_at: string
          id: string
          incident_id: string
          reason: string
          tenant_id: string
        }
        Insert: {
          amended_by?: string | null
          amended_by_name?: string | null
          changes?: Json
          created_at?: string
          id?: string
          incident_id: string
          reason: string
          tenant_id: string
        }
        Update: {
          amended_by?: string | null
          amended_by_name?: string | null
          changes?: Json
          created_at?: string
          id?: string
          incident_id?: string
          reason?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "incident_amendments_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "incident_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      incident_evidence: {
        Row: {
          created_at: string
          file_name: string | null
          file_path: string | null
          id: string
          incident_id: string
          kind: string
          label: string | null
          tenant_id: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          file_name?: string | null
          file_path?: string | null
          id?: string
          incident_id: string
          kind?: string
          label?: string | null
          tenant_id: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          file_name?: string | null
          file_path?: string | null
          id?: string
          incident_id?: string
          kind?: string
          label?: string | null
          tenant_id?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "incident_evidence_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "incident_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      incident_reports: {
        Row: {
          action_deadline: string | null
          authority_notified: boolean
          authority_reference: string | null
          branch: string | null
          branch_location_id: string | null
          category: string
          closed_at: string | null
          closed_by: string | null
          confidentiality: string
          created_at: string
          created_by: string | null
          description: string | null
          details: Json
          due_at: string | null
          evidence_available: boolean
          findings: string | null
          id: string
          immediate_action: string | null
          immediate_controls: string | null
          incident_date: string | null
          incident_time: string | null
          insurance_notified: boolean
          licence_condition_28: boolean
          location_detail: string | null
          manager_notified: boolean
          manager_notified_name: string | null
          manager_signature: string | null
          outcome: string | null
          people_involved: string | null
          report_number: string | null
          reported_by_employee_id: string | null
          reported_by_name: string | null
          responsible_job_title: string | null
          responsible_person: string | null
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          riddor_assessment: string | null
          riddor_flagged: boolean
          root_cause: string | null
          status: string
          submitted_at: string | null
          submitted_by: string | null
          tenant_id: string
          training_required: string | null
          updated_at: string
        }
        Insert: {
          action_deadline?: string | null
          authority_notified?: boolean
          authority_reference?: string | null
          branch?: string | null
          branch_location_id?: string | null
          category: string
          closed_at?: string | null
          closed_by?: string | null
          confidentiality?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          details?: Json
          due_at?: string | null
          evidence_available?: boolean
          findings?: string | null
          id?: string
          immediate_action?: string | null
          immediate_controls?: string | null
          incident_date?: string | null
          incident_time?: string | null
          insurance_notified?: boolean
          licence_condition_28?: boolean
          location_detail?: string | null
          manager_notified?: boolean
          manager_notified_name?: string | null
          manager_signature?: string | null
          outcome?: string | null
          people_involved?: string | null
          report_number?: string | null
          reported_by_employee_id?: string | null
          reported_by_name?: string | null
          responsible_job_title?: string | null
          responsible_person?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          riddor_assessment?: string | null
          riddor_flagged?: boolean
          root_cause?: string | null
          status?: string
          submitted_at?: string | null
          submitted_by?: string | null
          tenant_id: string
          training_required?: string | null
          updated_at?: string
        }
        Update: {
          action_deadline?: string | null
          authority_notified?: boolean
          authority_reference?: string | null
          branch?: string | null
          branch_location_id?: string | null
          category?: string
          closed_at?: string | null
          closed_by?: string | null
          confidentiality?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          details?: Json
          due_at?: string | null
          evidence_available?: boolean
          findings?: string | null
          id?: string
          immediate_action?: string | null
          immediate_controls?: string | null
          incident_date?: string | null
          incident_time?: string | null
          insurance_notified?: boolean
          licence_condition_28?: boolean
          location_detail?: string | null
          manager_notified?: boolean
          manager_notified_name?: string | null
          manager_signature?: string | null
          outcome?: string | null
          people_involved?: string | null
          report_number?: string | null
          reported_by_employee_id?: string | null
          reported_by_name?: string | null
          responsible_job_title?: string | null
          responsible_person?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          riddor_assessment?: string | null
          riddor_flagged?: boolean
          root_cause?: string | null
          status?: string
          submitted_at?: string | null
          submitted_by?: string | null
          tenant_id?: string
          training_required?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "incident_reports_branch_location_id_fkey"
            columns: ["branch_location_id"]
            isOneToOne: false
            referencedRelation: "branch_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incident_reports_reported_by_employee_id_fkey"
            columns: ["reported_by_employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incident_reports_reported_by_employee_id_fkey"
            columns: ["reported_by_employee_id"]
            isOneToOne: false
            referencedRelation: "employees_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      incident_witness_statements: {
        Row: {
          file_path: string | null
          id: string
          incident_id: string
          statement: string | null
          taken_at: string
          taken_by: string | null
          tenant_id: string
          witness_name: string
          witness_role: string | null
        }
        Insert: {
          file_path?: string | null
          id?: string
          incident_id: string
          statement?: string | null
          taken_at?: string
          taken_by?: string | null
          tenant_id: string
          witness_name: string
          witness_role?: string | null
        }
        Update: {
          file_path?: string | null
          id?: string
          incident_id?: string
          statement?: string | null
          taken_at?: string
          taken_by?: string | null
          tenant_id?: string
          witness_name?: string
          witness_role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "incident_witness_statements_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "incident_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      induction_assessments: {
        Row: {
          answers: Json
          attempt_number: number
          created_at: string
          employee_id: string | null
          id: string
          pack_id: string
          passed: boolean
          score: number
          submitted_at: string
          tenant_id: string
          total: number
        }
        Insert: {
          answers?: Json
          attempt_number?: number
          created_at?: string
          employee_id?: string | null
          id?: string
          pack_id: string
          passed?: boolean
          score?: number
          submitted_at?: string
          tenant_id: string
          total?: number
        }
        Update: {
          answers?: Json
          attempt_number?: number
          created_at?: string
          employee_id?: string | null
          id?: string
          pack_id?: string
          passed?: boolean
          score?: number
          submitted_at?: string
          tenant_id?: string
          total?: number
        }
        Relationships: [
          {
            foreignKeyName: "induction_assessments_pack_id_fkey"
            columns: ["pack_id"]
            isOneToOne: false
            referencedRelation: "induction_packs"
            referencedColumns: ["id"]
          },
        ]
      }
      induction_declarations: {
        Row: {
          answers: Json
          created_at: string
          employee_id: string | null
          has_yes_answer: boolean
          id: string
          manager_review_notes: string | null
          pack_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          reviewed_by_name: string | null
          signature_data: string | null
          signed_at: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          answers?: Json
          created_at?: string
          employee_id?: string | null
          has_yes_answer?: boolean
          id?: string
          manager_review_notes?: string | null
          pack_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewed_by_name?: string | null
          signature_data?: string | null
          signed_at?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          answers?: Json
          created_at?: string
          employee_id?: string | null
          has_yes_answer?: boolean
          id?: string
          manager_review_notes?: string | null
          pack_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewed_by_name?: string | null
          signature_data?: string | null
          signed_at?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "induction_declarations_pack_id_fkey"
            columns: ["pack_id"]
            isOneToOne: true
            referencedRelation: "induction_packs"
            referencedColumns: ["id"]
          },
        ]
      }
      induction_lesson_approvals: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          approved_by_name: string | null
          created_at: string
          id: string
          lesson_key: string
          lesson_version: string
          notes: string | null
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          approved_by_name?: string | null
          created_at?: string
          id?: string
          lesson_key: string
          lesson_version: string
          notes?: string | null
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          approved_by_name?: string | null
          created_at?: string
          id?: string
          lesson_key?: string
          lesson_version?: string
          notes?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "induction_lesson_approvals_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      induction_lesson_progress: {
        Row: {
          acknowledged_understood: boolean
          completed_at: string | null
          created_at: string
          employee_id: string
          id: string
          lesson_key: string
          lesson_version: string
          pack_role: string
          started_at: string
          tenant_id: string
        }
        Insert: {
          acknowledged_understood?: boolean
          completed_at?: string | null
          created_at?: string
          employee_id: string
          id?: string
          lesson_key: string
          lesson_version: string
          pack_role: string
          started_at?: string
          tenant_id: string
        }
        Update: {
          acknowledged_understood?: boolean
          completed_at?: string | null
          created_at?: string
          employee_id?: string
          id?: string
          lesson_key?: string
          lesson_version?: string
          pack_role?: string
          started_at?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "induction_lesson_progress_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "induction_lesson_progress_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "induction_lesson_progress_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      induction_modules: {
        Row: {
          acknowledged_at: string | null
          created_at: string
          id: string
          module_key: string
          pack_id: string
          read_at: string | null
          sort_order: number
          tenant_id: string
          title: string
        }
        Insert: {
          acknowledged_at?: string | null
          created_at?: string
          id?: string
          module_key: string
          pack_id: string
          read_at?: string | null
          sort_order?: number
          tenant_id: string
          title: string
        }
        Update: {
          acknowledged_at?: string | null
          created_at?: string
          id?: string
          module_key?: string
          pack_id?: string
          read_at?: string | null
          sort_order?: number
          tenant_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "induction_modules_pack_id_fkey"
            columns: ["pack_id"]
            isOneToOne: false
            referencedRelation: "induction_packs"
            referencedColumns: ["id"]
          },
        ]
      }
      induction_pack_items: {
        Row: {
          acknowledged_at: string | null
          created_at: string
          document_category: string | null
          document_id: string | null
          document_name: string
          document_version: number
          file_path: string | null
          id: string
          pack_id: string
          requires_signature: boolean
          signature_data: string | null
          sort_order: number
          tenant_id: string
          viewed_at: string | null
        }
        Insert: {
          acknowledged_at?: string | null
          created_at?: string
          document_category?: string | null
          document_id?: string | null
          document_name: string
          document_version?: number
          file_path?: string | null
          id?: string
          pack_id: string
          requires_signature?: boolean
          signature_data?: string | null
          sort_order?: number
          tenant_id: string
          viewed_at?: string | null
        }
        Update: {
          acknowledged_at?: string | null
          created_at?: string
          document_category?: string | null
          document_id?: string | null
          document_name?: string
          document_version?: number
          file_path?: string | null
          id?: string
          pack_id?: string
          requires_signature?: boolean
          signature_data?: string | null
          sort_order?: number
          tenant_id?: string
          viewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "induction_pack_items_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "compliance_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "induction_pack_items_pack_id_fkey"
            columns: ["pack_id"]
            isOneToOne: false
            referencedRelation: "induction_packs"
            referencedColumns: ["id"]
          },
        ]
      }
      induction_packs: {
        Row: {
          auto_assigned: boolean
          branch: string | null
          completed_at: string | null
          created_at: string
          employee_id: string
          final_signature_data: string | null
          final_statement_text: string | null
          id: string
          includes_alcohol: boolean
          is_test_send: boolean
          issued_by: string | null
          issued_by_name: string | null
          opened_at: string | null
          recipient_email: string | null
          reminder_count: number
          reminder_sent_at: string | null
          sent_at: string
          staff_role: string | null
          status: string
          tenant_id: string
          token: string
          token_expires_at: string
          updated_at: string
        }
        Insert: {
          auto_assigned?: boolean
          branch?: string | null
          completed_at?: string | null
          created_at?: string
          employee_id: string
          final_signature_data?: string | null
          final_statement_text?: string | null
          id?: string
          includes_alcohol?: boolean
          is_test_send?: boolean
          issued_by?: string | null
          issued_by_name?: string | null
          opened_at?: string | null
          recipient_email?: string | null
          reminder_count?: number
          reminder_sent_at?: string | null
          sent_at?: string
          staff_role?: string | null
          status?: string
          tenant_id: string
          token: string
          token_expires_at?: string
          updated_at?: string
        }
        Update: {
          auto_assigned?: boolean
          branch?: string | null
          completed_at?: string | null
          created_at?: string
          employee_id?: string
          final_signature_data?: string | null
          final_statement_text?: string | null
          id?: string
          includes_alcohol?: boolean
          is_test_send?: boolean
          issued_by?: string | null
          issued_by_name?: string | null
          opened_at?: string | null
          recipient_email?: string | null
          reminder_count?: number
          reminder_sent_at?: string | null
          sent_at?: string
          staff_role?: string | null
          status?: string
          tenant_id?: string
          token?: string
          token_expires_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "induction_packs_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "induction_packs_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      induction_practical_items: {
        Row: {
          applicable: boolean
          created_at: string
          employee_id: string | null
          group_key: string
          id: string
          label: string
          notes: string | null
          pack_id: string
          sort_order: number
          tenant_id: string
          updated_at: string
          verified_at: string | null
          verified_by: string | null
          verified_by_name: string | null
        }
        Insert: {
          applicable?: boolean
          created_at?: string
          employee_id?: string | null
          group_key: string
          id?: string
          label: string
          notes?: string | null
          pack_id: string
          sort_order?: number
          tenant_id: string
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
          verified_by_name?: string | null
        }
        Update: {
          applicable?: boolean
          created_at?: string
          employee_id?: string | null
          group_key?: string
          id?: string
          label?: string
          notes?: string | null
          pack_id?: string
          sort_order?: number
          tenant_id?: string
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
          verified_by_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "induction_practical_items_pack_id_fkey"
            columns: ["pack_id"]
            isOneToOne: false
            referencedRelation: "induction_packs"
            referencedColumns: ["id"]
          },
        ]
      }
      inspection_checklist_items: {
        Row: {
          branch: string
          branch_location_id: string | null
          created_at: string
          detail: string | null
          displayed: boolean
          id: string
          label: string
          last_reviewed_at: string | null
          notes: string | null
          physical_copy_held: boolean
          required: boolean
          sort_order: number
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          branch: string
          branch_location_id?: string | null
          created_at?: string
          detail?: string | null
          displayed?: boolean
          id?: string
          label: string
          last_reviewed_at?: string | null
          notes?: string | null
          physical_copy_held?: boolean
          required?: boolean
          sort_order?: number
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          branch?: string
          branch_location_id?: string | null
          created_at?: string
          detail?: string | null
          displayed?: boolean
          id?: string
          label?: string
          last_reviewed_at?: string | null
          notes?: string | null
          physical_copy_held?: boolean
          required?: boolean
          sort_order?: number
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inspection_checklist_items_branch_location_id_fkey"
            columns: ["branch_location_id"]
            isOneToOne: false
            referencedRelation: "branch_locations"
            referencedColumns: ["id"]
          },
        ]
      }
      licence_document_issues: {
        Row: {
          access_token: string | null
          authorised_count: number
          branch: string
          branch_location_id: string | null
          created_at: string
          delivery_method: string
          file_path: string | null
          id: string
          is_test_record: boolean
          issued_by: string | null
          issued_by_name: string | null
          licence_id: string | null
          listed_count: number
          message: string | null
          open_count: number
          opened_at: string | null
          recipient_email: string | null
          recipient_name: string | null
          revoked_at: string | null
          revoked_by: string | null
          snapshot: Json
          subject_type: string
          tenant_id: string
          token_expires_at: string | null
        }
        Insert: {
          access_token?: string | null
          authorised_count?: number
          branch: string
          branch_location_id?: string | null
          created_at?: string
          delivery_method?: string
          file_path?: string | null
          id?: string
          is_test_record?: boolean
          issued_by?: string | null
          issued_by_name?: string | null
          licence_id?: string | null
          listed_count?: number
          message?: string | null
          open_count?: number
          opened_at?: string | null
          recipient_email?: string | null
          recipient_name?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          snapshot?: Json
          subject_type: string
          tenant_id: string
          token_expires_at?: string | null
        }
        Update: {
          access_token?: string | null
          authorised_count?: number
          branch?: string
          branch_location_id?: string | null
          created_at?: string
          delivery_method?: string
          file_path?: string | null
          id?: string
          is_test_record?: boolean
          issued_by?: string | null
          issued_by_name?: string | null
          licence_id?: string | null
          listed_count?: number
          message?: string | null
          open_count?: number
          opened_at?: string | null
          recipient_email?: string | null
          recipient_name?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          snapshot?: Json
          subject_type?: string
          tenant_id?: string
          token_expires_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "licence_document_issues_branch_location_id_fkey"
            columns: ["branch_location_id"]
            isOneToOne: false
            referencedRelation: "branch_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "licence_document_issues_licence_id_fkey"
            columns: ["licence_id"]
            isOneToOne: false
            referencedRelation: "premises_licences"
            referencedColumns: ["id"]
          },
        ]
      }
      licence_signature_requests: {
        Row: {
          authorisation_id: string | null
          branch: string | null
          branch_location_id: string | null
          created_at: string
          declined_note: string | null
          document_body: Json
          document_title: string
          employee_id: string | null
          expires_at: string
          id: string
          is_test_record: boolean
          licence_id: string | null
          personal_licence_number: string | null
          read_at: string | null
          recipient_email: string
          recipient_name: string
          recipient_role: string | null
          sent_by: string | null
          sent_by_name: string | null
          signature: string | null
          signed_at: string | null
          signed_document_path: string | null
          signer_ip: string | null
          signer_name: string | null
          signer_user_agent: string | null
          status: string
          subject_type: string
          tenant_id: string
          token: string
          updated_at: string
        }
        Insert: {
          authorisation_id?: string | null
          branch?: string | null
          branch_location_id?: string | null
          created_at?: string
          declined_note?: string | null
          document_body?: Json
          document_title: string
          employee_id?: string | null
          expires_at?: string
          id?: string
          is_test_record?: boolean
          licence_id?: string | null
          personal_licence_number?: string | null
          read_at?: string | null
          recipient_email: string
          recipient_name: string
          recipient_role?: string | null
          sent_by?: string | null
          sent_by_name?: string | null
          signature?: string | null
          signed_at?: string | null
          signed_document_path?: string | null
          signer_ip?: string | null
          signer_name?: string | null
          signer_user_agent?: string | null
          status?: string
          subject_type: string
          tenant_id: string
          token: string
          updated_at?: string
        }
        Update: {
          authorisation_id?: string | null
          branch?: string | null
          branch_location_id?: string | null
          created_at?: string
          declined_note?: string | null
          document_body?: Json
          document_title?: string
          employee_id?: string | null
          expires_at?: string
          id?: string
          is_test_record?: boolean
          licence_id?: string | null
          personal_licence_number?: string | null
          read_at?: string | null
          recipient_email?: string
          recipient_name?: string
          recipient_role?: string | null
          sent_by?: string | null
          sent_by_name?: string | null
          signature?: string | null
          signed_at?: string | null
          signed_document_path?: string | null
          signer_ip?: string | null
          signer_name?: string | null
          signer_user_agent?: string | null
          status?: string
          subject_type?: string
          tenant_id?: string
          token?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "licence_signature_requests_authorisation_id_fkey"
            columns: ["authorisation_id"]
            isOneToOne: false
            referencedRelation: "alcohol_authorisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "licence_signature_requests_branch_location_id_fkey"
            columns: ["branch_location_id"]
            isOneToOne: false
            referencedRelation: "branch_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "licence_signature_requests_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "licence_signature_requests_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "licence_signature_requests_licence_id_fkey"
            columns: ["licence_id"]
            isOneToOne: false
            referencedRelation: "premises_licences"
            referencedColumns: ["id"]
          },
        ]
      }
      location_settings: {
        Row: {
          accident_book_location: string | null
          address: string | null
          allow_mobile_clock_in: boolean
          allow_open_shifts: boolean
          allow_shift_offers: boolean
          allow_shift_swaps: boolean
          allow_web_clock_in: boolean
          auto_approve_timesheets: boolean
          branch: string
          created_at: string
          default_break_minutes: number
          display_name: string
          enforce_break_after_hours: number
          evacuation_report_to: string | null
          fire_alarm_call_points: string | null
          fire_assembly_point: string | null
          fire_exit_routes: string | null
          fire_hazard_reporting_route: string | null
          first_aid_kit_location: string | null
          geofence_radius_meters: number
          id: string
          minimum_shift_length_minutes: number
          operating_hours: Json
          require_geofence: boolean
          require_gps_on_clock_in: boolean
          scheduling_suggestion_order: string
          temperature_check_times: string | null
          tenant_id: string
          timezone: string
          updated_at: string
        }
        Insert: {
          accident_book_location?: string | null
          address?: string | null
          allow_mobile_clock_in?: boolean
          allow_open_shifts?: boolean
          allow_shift_offers?: boolean
          allow_shift_swaps?: boolean
          allow_web_clock_in?: boolean
          auto_approve_timesheets?: boolean
          branch: string
          created_at?: string
          default_break_minutes?: number
          display_name: string
          enforce_break_after_hours?: number
          evacuation_report_to?: string | null
          fire_alarm_call_points?: string | null
          fire_assembly_point?: string | null
          fire_exit_routes?: string | null
          fire_hazard_reporting_route?: string | null
          first_aid_kit_location?: string | null
          geofence_radius_meters?: number
          id?: string
          minimum_shift_length_minutes?: number
          operating_hours?: Json
          require_geofence?: boolean
          require_gps_on_clock_in?: boolean
          scheduling_suggestion_order?: string
          temperature_check_times?: string | null
          tenant_id: string
          timezone?: string
          updated_at?: string
        }
        Update: {
          accident_book_location?: string | null
          address?: string | null
          allow_mobile_clock_in?: boolean
          allow_open_shifts?: boolean
          allow_shift_offers?: boolean
          allow_shift_swaps?: boolean
          allow_web_clock_in?: boolean
          auto_approve_timesheets?: boolean
          branch?: string
          created_at?: string
          default_break_minutes?: number
          display_name?: string
          enforce_break_after_hours?: number
          evacuation_report_to?: string | null
          fire_alarm_call_points?: string | null
          fire_assembly_point?: string | null
          fire_exit_routes?: string | null
          fire_hazard_reporting_route?: string | null
          first_aid_kit_location?: string | null
          geofence_radius_meters?: number
          id?: string
          minimum_shift_length_minutes?: number
          operating_hours?: Json
          require_geofence?: boolean
          require_gps_on_clock_in?: boolean
          scheduling_suggestion_order?: string
          temperature_check_times?: string | null
          tenant_id?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "location_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      module_signal_mappings: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          mapping_source: string
          module_id: string
          notes: string | null
          priority: number
          signal_tag: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          mapping_source?: string
          module_id: string
          notes?: string | null
          priority?: number
          signal_tag: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          mapping_source?: string
          module_id?: string
          notes?: string | null
          priority?: number
          signal_tag?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "module_signal_mappings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          announcements: boolean
          created_at: string
          documents: boolean
          id: string
          leave_updates: boolean
          marketplace_activity: boolean
          schedule_updates: boolean
          tenant_id: string
          training: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          announcements?: boolean
          created_at?: string
          documents?: boolean
          id?: string
          leave_updates?: boolean
          marketplace_activity?: boolean
          schedule_updates?: boolean
          tenant_id: string
          training?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          announcements?: boolean
          created_at?: string
          documents?: boolean
          id?: string
          leave_updates?: boolean
          marketplace_activity?: boolean
          schedule_updates?: boolean
          tenant_id?: string
          training?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_preferences_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          event_type: string
          id: string
          is_read: boolean
          link: string | null
          metadata: Json | null
          read_at: string | null
          tenant_id: string
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          event_type: string
          id?: string
          is_read?: boolean
          link?: string | null
          metadata?: Json | null
          read_at?: string | null
          tenant_id: string
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          event_type?: string
          id?: string
          is_read?: boolean
          link?: string | null
          metadata?: Json | null
          read_at?: string | null
          tenant_id?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_progress: {
        Row: {
          completed: boolean
          completed_at: string | null
          completed_by: string | null
          created_at: string
          employee_id: string
          id: string
          notes: string | null
          template_id: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          completed?: boolean
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          employee_id: string
          id?: string
          notes?: string | null
          template_id: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          completed?: boolean
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          employee_id?: string
          id?: string
          notes?: string | null
          template_id?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_progress_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onboarding_progress_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onboarding_progress_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "onboarding_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onboarding_progress_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_templates: {
        Row: {
          category: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          sort_order: number
          tenant_id: string
          title: string
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          sort_order?: number
          tenant_id: string
          title: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          sort_order?: number
          tenant_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      operational_signals: {
        Row: {
          confidence: string | null
          created_at: string
          id: string
          location_id: string | null
          metadata: Json | null
          severity: string | null
          signal_date: string
          signal_tag: string
          source_record_id: string
          source_table: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          confidence?: string | null
          created_at?: string
          id?: string
          location_id?: string | null
          metadata?: Json | null
          severity?: string | null
          signal_date: string
          signal_tag: string
          source_record_id: string
          source_table: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          confidence?: string | null
          created_at?: string
          id?: string
          location_id?: string | null
          metadata?: Json | null
          severity?: string | null
          signal_date?: string
          signal_tag?: string
          source_record_id?: string
          source_table?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "operational_signals_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_adjustments: {
        Row: {
          changed_by: string | null
          created_at: string
          delta: number | null
          employee_id: string
          field_name: string
          id: string
          new_value: number | null
          note: string | null
          old_value: number | null
          payroll_entry_id: string
          payroll_period_id: string
          tenant_id: string
        }
        Insert: {
          changed_by?: string | null
          created_at?: string
          delta?: number | null
          employee_id: string
          field_name: string
          id?: string
          new_value?: number | null
          note?: string | null
          old_value?: number | null
          payroll_entry_id: string
          payroll_period_id: string
          tenant_id: string
        }
        Update: {
          changed_by?: string | null
          created_at?: string
          delta?: number | null
          employee_id?: string
          field_name?: string
          id?: string
          new_value?: number | null
          note?: string | null
          old_value?: number | null
          payroll_entry_id?: string
          payroll_period_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payroll_adjustments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_adjustments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_adjustments_payroll_entry_id_fkey"
            columns: ["payroll_entry_id"]
            isOneToOne: false
            referencedRelation: "payroll_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_adjustments_payroll_period_id_fkey"
            columns: ["payroll_period_id"]
            isOneToOne: false
            referencedRelation: "payroll_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_adjustments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_entries: {
        Row: {
          adjustment_note: string | null
          bank_details_exported: boolean | null
          created_at: string
          employee_id: string
          holiday_accrued_hours: number | null
          hourly_rate: number
          id: string
          imported_hours: number | null
          notes: string | null
          payroll_period_id: string
          performance_bonus: number | null
          service_charge: number | null
          special_bonus: number | null
          tenant_id: string
          timesheet_hours: number
          total_pay: number
          updated_at: string
        }
        Insert: {
          adjustment_note?: string | null
          bank_details_exported?: boolean | null
          created_at?: string
          employee_id: string
          holiday_accrued_hours?: number | null
          hourly_rate: number
          id?: string
          imported_hours?: number | null
          notes?: string | null
          payroll_period_id: string
          performance_bonus?: number | null
          service_charge?: number | null
          special_bonus?: number | null
          tenant_id: string
          timesheet_hours?: number
          total_pay?: number
          updated_at?: string
        }
        Update: {
          adjustment_note?: string | null
          bank_details_exported?: boolean | null
          created_at?: string
          employee_id?: string
          holiday_accrued_hours?: number | null
          hourly_rate?: number
          id?: string
          imported_hours?: number | null
          notes?: string | null
          payroll_period_id?: string
          performance_bonus?: number | null
          service_charge?: number | null
          special_bonus?: number | null
          tenant_id?: string
          timesheet_hours?: number
          total_pay?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payroll_entries_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_entries_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_entries_payroll_period_id_fkey"
            columns: ["payroll_period_id"]
            isOneToOne: false
            referencedRelation: "payroll_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_entries_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_entry_locations: {
        Row: {
          created_at: string
          department: string | null
          employee_id: string
          hours: number
          id: string
          imported_source: string | null
          location_name: string
          payroll_entry_id: string
          payroll_period_id: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          department?: string | null
          employee_id: string
          hours?: number
          id?: string
          imported_source?: string | null
          location_name: string
          payroll_entry_id: string
          payroll_period_id: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          department?: string | null
          employee_id?: string
          hours?: number
          id?: string
          imported_source?: string | null
          location_name?: string
          payroll_entry_id?: string
          payroll_period_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payroll_entry_locations_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_entry_locations_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_entry_locations_payroll_entry_id_fkey"
            columns: ["payroll_entry_id"]
            isOneToOne: false
            referencedRelation: "payroll_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_entry_locations_payroll_period_id_fkey"
            columns: ["payroll_period_id"]
            isOneToOne: false
            referencedRelation: "payroll_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_entry_locations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_import_aliases: {
        Row: {
          branch_id: string | null
          confirmed_at: string
          confirmed_by: string | null
          created_at: string
          employee_id: string
          id: string
          is_active: boolean
          last_used_at: string | null
          normalised_timesheet_name: string
          raw_timesheet_name: string
          source_system: string
          tenant_id: string
          updated_at: string
          usage_count: number
        }
        Insert: {
          branch_id?: string | null
          confirmed_at?: string
          confirmed_by?: string | null
          created_at?: string
          employee_id: string
          id?: string
          is_active?: boolean
          last_used_at?: string | null
          normalised_timesheet_name: string
          raw_timesheet_name: string
          source_system?: string
          tenant_id: string
          updated_at?: string
          usage_count?: number
        }
        Update: {
          branch_id?: string | null
          confirmed_at?: string
          confirmed_by?: string | null
          created_at?: string
          employee_id?: string
          id?: string
          is_active?: boolean
          last_used_at?: string | null
          normalised_timesheet_name?: string
          raw_timesheet_name?: string
          source_system?: string
          tenant_id?: string
          updated_at?: string
          usage_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "payroll_import_aliases_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_import_aliases_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_import_aliases_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_imports: {
        Row: {
          created_at: string
          errors: Json | null
          file_name: string
          file_path: string | null
          id: string
          import_status: string | null
          imported_by: string | null
          payroll_period_id: string | null
          records_imported: number | null
          tenant_id: string
        }
        Insert: {
          created_at?: string
          errors?: Json | null
          file_name: string
          file_path?: string | null
          id?: string
          import_status?: string | null
          imported_by?: string | null
          payroll_period_id?: string | null
          records_imported?: number | null
          tenant_id: string
        }
        Update: {
          created_at?: string
          errors?: Json | null
          file_name?: string
          file_path?: string | null
          id?: string
          import_status?: string | null
          imported_by?: string | null
          payroll_period_id?: string | null
          records_imported?: number | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payroll_imports_payroll_period_id_fkey"
            columns: ["payroll_period_id"]
            isOneToOne: false
            referencedRelation: "payroll_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_imports_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_nmw_audit: {
        Row: {
          actual_hours: number
          age_at_period_start: number | null
          age_band: string
          calculation_basis: Json
          checked_at: string
          checked_by: string | null
          created_at: string
          effective_rate: number | null
          eligible_pay: number
          employee_id: string
          id: string
          is_apprentice: boolean
          override_reason: string | null
          payroll_entry_id: string | null
          payroll_period_id: string
          required_rate: number
          status: string
          tenant_id: string
        }
        Insert: {
          actual_hours?: number
          age_at_period_start?: number | null
          age_band: string
          calculation_basis?: Json
          checked_at?: string
          checked_by?: string | null
          created_at?: string
          effective_rate?: number | null
          eligible_pay?: number
          employee_id: string
          id?: string
          is_apprentice?: boolean
          override_reason?: string | null
          payroll_entry_id?: string | null
          payroll_period_id: string
          required_rate: number
          status: string
          tenant_id: string
        }
        Update: {
          actual_hours?: number
          age_at_period_start?: number | null
          age_band?: string
          calculation_basis?: Json
          checked_at?: string
          checked_by?: string | null
          created_at?: string
          effective_rate?: number | null
          eligible_pay?: number
          employee_id?: string
          id?: string
          is_apprentice?: boolean
          override_reason?: string | null
          payroll_entry_id?: string | null
          payroll_period_id?: string
          required_rate?: number
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payroll_nmw_audit_payroll_entry_id_fkey"
            columns: ["payroll_entry_id"]
            isOneToOne: false
            referencedRelation: "payroll_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_nmw_audit_payroll_period_id_fkey"
            columns: ["payroll_period_id"]
            isOneToOne: false
            referencedRelation: "payroll_periods"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_overpayments: {
        Row: {
          created_at: string
          created_by: string | null
          employee_id: string
          estimated_overlap_hours: number
          estimated_overpayment: number
          hourly_rate: number
          id: string
          notes: string | null
          overlap_end_date: string
          overlap_start_date: string
          payroll_period_id: string
          recovered_amount: number | null
          recovered_in_period_id: string | null
          recovery_method: string | null
          recovery_status: string
          service_charge: number
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          employee_id: string
          estimated_overlap_hours?: number
          estimated_overpayment?: number
          hourly_rate: number
          id?: string
          notes?: string | null
          overlap_end_date: string
          overlap_start_date: string
          payroll_period_id: string
          recovered_amount?: number | null
          recovered_in_period_id?: string | null
          recovery_method?: string | null
          recovery_status?: string
          service_charge?: number
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          employee_id?: string
          estimated_overlap_hours?: number
          estimated_overpayment?: number
          hourly_rate?: number
          id?: string
          notes?: string | null
          overlap_end_date?: string
          overlap_start_date?: string
          payroll_period_id?: string
          recovered_amount?: number | null
          recovered_in_period_id?: string | null
          recovery_method?: string | null
          recovery_status?: string
          service_charge?: number
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payroll_overpayments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_overpayments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_overpayments_payroll_period_id_fkey"
            columns: ["payroll_period_id"]
            isOneToOne: false
            referencedRelation: "payroll_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_overpayments_recovered_in_period_id_fkey"
            columns: ["recovered_in_period_id"]
            isOneToOne: false
            referencedRelation: "payroll_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_overpayments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_period_notes: {
        Row: {
          category: string | null
          created_at: string
          created_by: string | null
          employee_id: string
          id: string
          note: string
          payroll_period_id: string
          show_on_pdf: boolean
          tenant_id: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          created_by?: string | null
          employee_id: string
          id?: string
          note: string
          payroll_period_id: string
          show_on_pdf?: boolean
          tenant_id: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          created_by?: string | null
          employee_id?: string
          id?: string
          note?: string
          payroll_period_id?: string
          show_on_pdf?: boolean
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payroll_period_notes_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_period_notes_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_period_notes_payroll_period_id_fkey"
            columns: ["payroll_period_id"]
            isOneToOne: false
            referencedRelation: "payroll_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_period_notes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_periods: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          end_date: string
          grand_total: number | null
          holidays_total: number | null
          id: string
          imported_by: string | null
          incentives_total: number | null
          notes: string | null
          pay_date: string | null
          period_name: string
          period_weeks: number | null
          sales_total: number | null
          start_date: string
          status: Database["public"]["Enums"]["payroll_status"]
          tenant_id: string
          timesheet_total: number | null
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          end_date: string
          grand_total?: number | null
          holidays_total?: number | null
          id?: string
          imported_by?: string | null
          incentives_total?: number | null
          notes?: string | null
          pay_date?: string | null
          period_name: string
          period_weeks?: number | null
          sales_total?: number | null
          start_date: string
          status?: Database["public"]["Enums"]["payroll_status"]
          tenant_id: string
          timesheet_total?: number | null
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          end_date?: string
          grand_total?: number | null
          holidays_total?: number | null
          id?: string
          imported_by?: string | null
          incentives_total?: number | null
          notes?: string | null
          pay_date?: string | null
          period_name?: string
          period_weeks?: number | null
          sales_total?: number | null
          start_date?: string
          status?: Database["public"]["Enums"]["payroll_status"]
          tenant_id?: string
          timesheet_total?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payroll_periods_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_admins: {
        Row: {
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      premises_licence_conditions: {
        Row: {
          branch_location_id: string | null
          condition_number: string | null
          corrective_action_id: string | null
          created_at: string
          created_by: string | null
          evidence_required: string | null
          frequency: string | null
          id: string
          last_check: string | null
          legal_wording: string
          licence_id: string
          next_check: string | null
          related_document_id: string | null
          related_training_id: string | null
          requirement_category: string | null
          responsible_job_title: string | null
          responsible_person: string | null
          sort_order: number
          staff_instruction: string | null
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          branch_location_id?: string | null
          condition_number?: string | null
          corrective_action_id?: string | null
          created_at?: string
          created_by?: string | null
          evidence_required?: string | null
          frequency?: string | null
          id?: string
          last_check?: string | null
          legal_wording: string
          licence_id: string
          next_check?: string | null
          related_document_id?: string | null
          related_training_id?: string | null
          requirement_category?: string | null
          responsible_job_title?: string | null
          responsible_person?: string | null
          sort_order?: number
          staff_instruction?: string | null
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          branch_location_id?: string | null
          condition_number?: string | null
          corrective_action_id?: string | null
          created_at?: string
          created_by?: string | null
          evidence_required?: string | null
          frequency?: string | null
          id?: string
          last_check?: string | null
          legal_wording?: string
          licence_id?: string
          next_check?: string | null
          related_document_id?: string | null
          related_training_id?: string | null
          requirement_category?: string | null
          responsible_job_title?: string | null
          responsible_person?: string | null
          sort_order?: number
          staff_instruction?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "premises_licence_conditions_branch_location_id_fkey"
            columns: ["branch_location_id"]
            isOneToOne: false
            referencedRelation: "branch_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "premises_licence_conditions_corrective_action_id_fkey"
            columns: ["corrective_action_id"]
            isOneToOne: false
            referencedRelation: "compliance_actions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "premises_licence_conditions_licence_id_fkey"
            columns: ["licence_id"]
            isOneToOne: false
            referencedRelation: "premises_licences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "premises_licence_conditions_related_document_id_fkey"
            columns: ["related_document_id"]
            isOneToOne: false
            referencedRelation: "compliance_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      premises_licences: {
        Row: {
          alcohol_hours: string | null
          branch: string
          branch_location_id: string | null
          challenge_25_document_id: string | null
          confirmation_note: string | null
          created_at: string
          created_by: string | null
          display_location: string | null
          display_photo_path: string | null
          display_required: boolean
          dps_authorisation_document_id: string | null
          dps_name: string | null
          dps_personal_licence_number: string | null
          id: string
          issue_date: string | null
          issuing_authority: string | null
          last_physical_check: string | null
          last_verified_date: string | null
          late_night_refreshment_hours: string | null
          latest_variation_date: string | null
          latest_version_printed: boolean
          licence_document_id: string | null
          licence_holder: string | null
          licence_number: string | null
          licence_status: string
          licence_summary_document_id: string | null
          licensable_activities: string[]
          licensed_plan_document_id: string | null
          needs_confirmation: boolean
          notes: string | null
          off_sales: boolean
          on_sales: boolean
          opening_hours: string | null
          physical_check_by: string | null
          premises_address: string | null
          premises_name: string | null
          replacement_needed: boolean
          section_57_document_id: string | null
          tenant_id: string
          updated_at: string
          verified_by: string | null
        }
        Insert: {
          alcohol_hours?: string | null
          branch: string
          branch_location_id?: string | null
          challenge_25_document_id?: string | null
          confirmation_note?: string | null
          created_at?: string
          created_by?: string | null
          display_location?: string | null
          display_photo_path?: string | null
          display_required?: boolean
          dps_authorisation_document_id?: string | null
          dps_name?: string | null
          dps_personal_licence_number?: string | null
          id?: string
          issue_date?: string | null
          issuing_authority?: string | null
          last_physical_check?: string | null
          last_verified_date?: string | null
          late_night_refreshment_hours?: string | null
          latest_variation_date?: string | null
          latest_version_printed?: boolean
          licence_document_id?: string | null
          licence_holder?: string | null
          licence_number?: string | null
          licence_status?: string
          licence_summary_document_id?: string | null
          licensable_activities?: string[]
          licensed_plan_document_id?: string | null
          needs_confirmation?: boolean
          notes?: string | null
          off_sales?: boolean
          on_sales?: boolean
          opening_hours?: string | null
          physical_check_by?: string | null
          premises_address?: string | null
          premises_name?: string | null
          replacement_needed?: boolean
          section_57_document_id?: string | null
          tenant_id: string
          updated_at?: string
          verified_by?: string | null
        }
        Update: {
          alcohol_hours?: string | null
          branch?: string
          branch_location_id?: string | null
          challenge_25_document_id?: string | null
          confirmation_note?: string | null
          created_at?: string
          created_by?: string | null
          display_location?: string | null
          display_photo_path?: string | null
          display_required?: boolean
          dps_authorisation_document_id?: string | null
          dps_name?: string | null
          dps_personal_licence_number?: string | null
          id?: string
          issue_date?: string | null
          issuing_authority?: string | null
          last_physical_check?: string | null
          last_verified_date?: string | null
          late_night_refreshment_hours?: string | null
          latest_variation_date?: string | null
          latest_version_printed?: boolean
          licence_document_id?: string | null
          licence_holder?: string | null
          licence_number?: string | null
          licence_status?: string
          licence_summary_document_id?: string | null
          licensable_activities?: string[]
          licensed_plan_document_id?: string | null
          needs_confirmation?: boolean
          notes?: string | null
          off_sales?: boolean
          on_sales?: boolean
          opening_hours?: string | null
          physical_check_by?: string | null
          premises_address?: string | null
          premises_name?: string | null
          replacement_needed?: boolean
          section_57_document_id?: string | null
          tenant_id?: string
          updated_at?: string
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "premises_licences_branch_location_id_fkey"
            columns: ["branch_location_id"]
            isOneToOne: false
            referencedRelation: "branch_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "premises_licences_challenge_25_document_id_fkey"
            columns: ["challenge_25_document_id"]
            isOneToOne: false
            referencedRelation: "compliance_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "premises_licences_dps_authorisation_document_id_fkey"
            columns: ["dps_authorisation_document_id"]
            isOneToOne: false
            referencedRelation: "compliance_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "premises_licences_licence_document_id_fkey"
            columns: ["licence_document_id"]
            isOneToOne: false
            referencedRelation: "compliance_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "premises_licences_licence_summary_document_id_fkey"
            columns: ["licence_summary_document_id"]
            isOneToOne: false
            referencedRelation: "compliance_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "premises_licences_licensed_plan_document_id_fkey"
            columns: ["licensed_plan_document_id"]
            isOneToOne: false
            referencedRelation: "compliance_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "premises_licences_section_57_document_id_fkey"
            columns: ["section_57_document_id"]
            isOneToOne: false
            referencedRelation: "compliance_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      return_to_work_forms: {
        Row: {
          absence_record_id: string
          adjustments_needed: string | null
          completed_at: string | null
          completed_by: string | null
          created_at: string
          doctor_consulted: boolean | null
          doctor_note_provided: boolean | null
          employee_id: string
          fit_to_return: boolean | null
          follow_up_date: string | null
          follow_up_notes: string | null
          follow_up_required: boolean | null
          id: string
          manager_comments: string | null
          reason_for_absence: string | null
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          absence_record_id: string
          adjustments_needed?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          doctor_consulted?: boolean | null
          doctor_note_provided?: boolean | null
          employee_id: string
          fit_to_return?: boolean | null
          follow_up_date?: string | null
          follow_up_notes?: string | null
          follow_up_required?: boolean | null
          id?: string
          manager_comments?: string | null
          reason_for_absence?: string | null
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          absence_record_id?: string
          adjustments_needed?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          doctor_consulted?: boolean | null
          doctor_note_provided?: boolean | null
          employee_id?: string
          fit_to_return?: boolean | null
          follow_up_date?: string | null
          follow_up_notes?: string | null
          follow_up_required?: boolean | null
          id?: string
          manager_comments?: string | null
          reason_for_absence?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "return_to_work_forms_absence_record_id_fkey"
            columns: ["absence_record_id"]
            isOneToOne: false
            referencedRelation: "absence_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "return_to_work_forms_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "return_to_work_forms_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "return_to_work_forms_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          granted: boolean
          id: string
          permission_key: string
          role: string
          tenant_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          granted?: boolean
          id?: string
          permission_key: string
          role: string
          tenant_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          granted?: boolean
          id?: string
          permission_key?: string
          role?: string
          tenant_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      sandbox_tenants: {
        Row: {
          created_at: string
          created_by: string
          id: string
          last_impersonated_at: string | null
          last_qa_note_at: string | null
          last_rebuilt_at: string | null
          last_smoke_test_at: string | null
          preset_name: string
          qa_status: string | null
          seed_config: Json | null
          setup_state: string
          tenant_id: string
          test_users: Json
          testing_notes: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          last_impersonated_at?: string | null
          last_qa_note_at?: string | null
          last_rebuilt_at?: string | null
          last_smoke_test_at?: string | null
          preset_name?: string
          qa_status?: string | null
          seed_config?: Json | null
          setup_state?: string
          tenant_id: string
          test_users?: Json
          testing_notes?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          last_impersonated_at?: string | null
          last_qa_note_at?: string | null
          last_rebuilt_at?: string | null
          last_smoke_test_at?: string | null
          preset_name?: string
          qa_status?: string | null
          seed_config?: Json | null
          setup_state?: string
          tenant_id?: string
          test_users?: Json
          testing_notes?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sandbox_tenants_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      schedule_template_shifts: {
        Row: {
          break_minutes: number | null
          created_at: string
          day_of_week: number
          department: string | null
          employee_id: string | null
          end_time: string
          id: string
          notes: string | null
          required_headcount: number
          role: string | null
          start_time: string
          template_id: string
          tenant_id: string
        }
        Insert: {
          break_minutes?: number | null
          created_at?: string
          day_of_week: number
          department?: string | null
          employee_id?: string | null
          end_time: string
          id?: string
          notes?: string | null
          required_headcount?: number
          role?: string | null
          start_time: string
          template_id: string
          tenant_id: string
        }
        Update: {
          break_minutes?: number | null
          created_at?: string
          day_of_week?: number
          department?: string | null
          employee_id?: string | null
          end_time?: string
          id?: string
          notes?: string | null
          required_headcount?: number
          role?: string | null
          start_time?: string
          template_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "schedule_template_shifts_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_template_shifts_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_template_shifts_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "schedule_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_template_shifts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      schedule_templates: {
        Row: {
          branch: string
          created_at: string
          created_by: string | null
          department: string
          id: string
          is_archived: boolean
          is_default: boolean
          name: string
          scope: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          branch: string
          created_at?: string
          created_by?: string | null
          department: string
          id?: string
          is_archived?: boolean
          is_default?: boolean
          name: string
          scope?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          branch?: string
          created_at?: string
          created_by?: string | null
          department?: string
          id?: string
          is_archived?: boolean
          is_default?: boolean
          name?: string
          scope?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "schedule_templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      service_charge_employee_rates: {
        Row: {
          created_at: string
          created_by: string | null
          custom_rate_per_hour: number
          effective_from: string
          effective_to: string | null
          employee_id: string
          id: string
          is_active: boolean
          notes: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          custom_rate_per_hour?: number
          effective_from?: string
          effective_to?: string | null
          employee_id: string
          id?: string
          is_active?: boolean
          notes?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          custom_rate_per_hour?: number
          effective_from?: string
          effective_to?: string | null
          employee_id?: string
          id?: string
          is_active?: boolean
          notes?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_charge_employee_rates_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_charge_employee_rates_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_charge_employee_rates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      service_charge_location_settings: {
        Row: {
          branch: string
          calculation_model: string
          created_at: string
          default_rate_per_hour: number | null
          enabled: boolean
          id: string
          notes: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          branch: string
          calculation_model?: string
          created_at?: string
          default_rate_per_hour?: number | null
          enabled?: boolean
          id?: string
          notes?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          branch?: string
          calculation_model?: string
          created_at?: string
          default_rate_per_hour?: number | null
          enabled?: boolean
          id?: string
          notes?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_charge_location_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      service_charge_role_rates: {
        Row: {
          created_at: string
          created_by: string | null
          effective_from: string
          effective_to: string | null
          id: string
          is_active: boolean
          notes: string | null
          rate_per_hour: number
          role_name: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          effective_from?: string
          effective_to?: string | null
          id?: string
          is_active?: boolean
          notes?: string | null
          rate_per_hour?: number
          role_name: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          effective_from?: string
          effective_to?: string | null
          id?: string
          is_active?: boolean
          notes?: string | null
          rate_per_hour?: number
          role_name?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_charge_role_rates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      shift_alerts: {
        Row: {
          alert_message: string
          alert_type: string
          created_at: string
          employee_id: string
          id: string
          resolution_note: string | null
          resolved: boolean
          resolved_at: string | null
          resolved_by: string | null
          shift_id: string | null
          tenant_id: string
          time_entry_id: string | null
        }
        Insert: {
          alert_message: string
          alert_type: string
          created_at?: string
          employee_id: string
          id?: string
          resolution_note?: string | null
          resolved?: boolean
          resolved_at?: string | null
          resolved_by?: string | null
          shift_id?: string | null
          tenant_id: string
          time_entry_id?: string | null
        }
        Update: {
          alert_message?: string
          alert_type?: string
          created_at?: string
          employee_id?: string
          id?: string
          resolution_note?: string | null
          resolved?: boolean
          resolved_at?: string | null
          resolved_by?: string | null
          shift_id?: string | null
          tenant_id?: string
          time_entry_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shift_alerts_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_alerts_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_alerts_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_alerts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_alerts_time_entry_id_fkey"
            columns: ["time_entry_id"]
            isOneToOne: false
            referencedRelation: "time_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      shift_marketplace: {
        Row: {
          created_at: string
          id: string
          listing_type: string
          notes: string | null
          offered_by: string | null
          shift_id: string
          status: string
          swap_target_shift_id: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          listing_type?: string
          notes?: string | null
          offered_by?: string | null
          shift_id: string
          status?: string
          swap_target_shift_id?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          listing_type?: string
          notes?: string | null
          offered_by?: string | null
          shift_id?: string
          status?: string
          swap_target_shift_id?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shift_marketplace_offered_by_fkey"
            columns: ["offered_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_marketplace_offered_by_fkey"
            columns: ["offered_by"]
            isOneToOne: false
            referencedRelation: "employees_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_marketplace_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_marketplace_swap_target_shift_id_fkey"
            columns: ["swap_target_shift_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_marketplace_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      shift_marketplace_requests: {
        Row: {
          created_at: string
          id: string
          listing_id: string
          notes: string | null
          requested_by: string
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          listing_id: string
          notes?: string | null
          requested_by: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          listing_id?: string
          notes?: string | null
          requested_by?: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shift_marketplace_requests_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "shift_marketplace"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_marketplace_requests_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_marketplace_requests_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "employees_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_marketplace_requests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      shifts: {
        Row: {
          branch: string
          created_at: string
          created_by: string | null
          department: string
          employee_id: string | null
          end_time: string
          id: string
          is_published: boolean
          notes: string | null
          published_at: string | null
          published_by: string | null
          shift_date: string
          start_time: string
          status: Database["public"]["Enums"]["shift_status"]
          tenant_id: string
          updated_at: string
        }
        Insert: {
          branch: string
          created_at?: string
          created_by?: string | null
          department: string
          employee_id?: string | null
          end_time: string
          id?: string
          is_published?: boolean
          notes?: string | null
          published_at?: string | null
          published_by?: string | null
          shift_date: string
          start_time: string
          status?: Database["public"]["Enums"]["shift_status"]
          tenant_id: string
          updated_at?: string
        }
        Update: {
          branch?: string
          created_at?: string
          created_by?: string | null
          department?: string
          employee_id?: string | null
          end_time?: string
          id?: string
          is_published?: boolean
          notes?: string | null
          published_at?: string | null
          published_by?: string | null
          shift_date?: string
          start_time?: string
          status?: Database["public"]["Enums"]["shift_status"]
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shifts_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shifts_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shifts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      signing_tokens: {
        Row: {
          created_at: string
          employee_document_id: string
          employee_id: string
          expires_at: string
          id: string
          signer_type: string
          tenant_id: string
          token: string
          used_at: string | null
          used_by_ip: string | null
          used_by_user_agent: string | null
        }
        Insert: {
          created_at?: string
          employee_document_id: string
          employee_id: string
          expires_at: string
          id?: string
          signer_type: string
          tenant_id: string
          token?: string
          used_at?: string | null
          used_by_ip?: string | null
          used_by_user_agent?: string | null
        }
        Update: {
          created_at?: string
          employee_document_id?: string
          employee_id?: string
          expires_at?: string
          id?: string
          signer_type?: string
          tenant_id?: string
          token?: string
          used_at?: string | null
          used_by_ip?: string | null
          used_by_user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "signing_tokens_employee_document_id_fkey"
            columns: ["employee_document_id"]
            isOneToOne: false
            referencedRelation: "employee_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "signing_tokens_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "signing_tokens_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "signing_tokens_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_announcements: {
        Row: {
          content: string
          created_at: string
          created_by: string | null
          expires_at: string | null
          id: string
          priority: string
          published_at: string | null
          target_branches: string[] | null
          target_departments: string[] | null
          tenant_id: string
          title: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          priority?: string
          published_at?: string | null
          target_branches?: string[] | null
          target_departments?: string[] | null
          tenant_id: string
          title: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          priority?: string
          published_at?: string | null
          target_branches?: string[] | null
          target_departments?: string[] | null
          tenant_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_announcements_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_transfers: {
        Row: {
          created_at: string
          employee_id: string
          end_date: string | null
          from_branch: string
          id: string
          is_temporary: boolean
          reason: string | null
          status: string
          tenant_id: string
          to_branch: string
          transfer_date: string
          transferred_by: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          employee_id: string
          end_date?: string | null
          from_branch: string
          id?: string
          is_temporary?: boolean
          reason?: string | null
          status?: string
          tenant_id: string
          to_branch: string
          transfer_date: string
          transferred_by?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          employee_id?: string
          end_date?: string | null
          from_branch?: string
          id?: string
          is_temporary?: boolean
          reason?: string | null
          status?: string
          tenant_id?: string
          to_branch?: string
          transfer_date?: string
          transferred_by?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_transfers_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_transfers_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_transfers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_plans: {
        Row: {
          billing_model: string
          created_at: string
          currency: string
          description: string | null
          enabled_modules: Json
          features: Json
          id: string
          is_active: boolean
          max_employees: number | null
          max_locations: number | null
          name: string
          plan_version: number
          price_annual: number
          price_monthly: number
          price_per_employee_annual: number
          price_per_employee_monthly: number
          slug: string
          sort_order: number
          superseded_by: string | null
          updated_at: string
        }
        Insert: {
          billing_model?: string
          created_at?: string
          currency?: string
          description?: string | null
          enabled_modules?: Json
          features?: Json
          id?: string
          is_active?: boolean
          max_employees?: number | null
          max_locations?: number | null
          name: string
          plan_version?: number
          price_annual?: number
          price_monthly?: number
          price_per_employee_annual?: number
          price_per_employee_monthly?: number
          slug: string
          sort_order?: number
          superseded_by?: string | null
          updated_at?: string
        }
        Update: {
          billing_model?: string
          created_at?: string
          currency?: string
          description?: string | null
          enabled_modules?: Json
          features?: Json
          id?: string
          is_active?: boolean
          max_employees?: number | null
          max_locations?: number | null
          name?: string
          plan_version?: number
          price_annual?: number
          price_monthly?: number
          price_per_employee_annual?: number
          price_per_employee_monthly?: number
          slug?: string
          sort_order?: number
          superseded_by?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_plans_superseded_by_fkey"
            columns: ["superseded_by"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      talent_applications: {
        Row: {
          applicant_user_id: string
          applied_at: string
          cover_message: string | null
          created_at: string
          id: string
          reviewed_at: string | null
          status: string
          talent_profile_id: string
          updated_at: string
          vacancy_id: string
        }
        Insert: {
          applicant_user_id: string
          applied_at?: string
          cover_message?: string | null
          created_at?: string
          id?: string
          reviewed_at?: string | null
          status?: string
          talent_profile_id: string
          updated_at?: string
          vacancy_id: string
        }
        Update: {
          applicant_user_id?: string
          applied_at?: string
          cover_message?: string | null
          created_at?: string
          id?: string
          reviewed_at?: string | null
          status?: string
          talent_profile_id?: string
          updated_at?: string
          vacancy_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "talent_applications_talent_profile_id_fkey"
            columns: ["talent_profile_id"]
            isOneToOne: false
            referencedRelation: "talent_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "talent_applications_vacancy_id_fkey"
            columns: ["vacancy_id"]
            isOneToOne: false
            referencedRelation: "talent_vacancies"
            referencedColumns: ["id"]
          },
        ]
      }
      talent_audit_log: {
        Row: {
          action: string
          created_at: string
          id: string
          new_data: Json | null
          old_data: Json | null
          performed_by: string | null
          talent_profile_id: string
          tenant_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          performed_by?: string | null
          talent_profile_id: string
          tenant_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          performed_by?: string | null
          talent_profile_id?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "talent_audit_log_talent_profile_id_fkey"
            columns: ["talent_profile_id"]
            isOneToOne: false
            referencedRelation: "talent_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "talent_audit_log_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      talent_blocks: {
        Row: {
          blocked_tenant_id: string
          created_at: string
          id: string
          reason: string | null
          talent_profile_id: string
        }
        Insert: {
          blocked_tenant_id: string
          created_at?: string
          id?: string
          reason?: string | null
          talent_profile_id: string
        }
        Update: {
          blocked_tenant_id?: string
          created_at?: string
          id?: string
          reason?: string | null
          talent_profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "talent_blocks_blocked_tenant_id_fkey"
            columns: ["blocked_tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "talent_blocks_talent_profile_id_fkey"
            columns: ["talent_profile_id"]
            isOneToOne: false
            referencedRelation: "talent_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      talent_contact_unlocks: {
        Row: {
          blocked_at: string | null
          candidate_responded_at: string | null
          candidate_response: string
          conversation_id: string | null
          created_at: string
          expires_at: string
          id: string
          purchase_id: string | null
          talent_profile_id: string
          tenant_id: string
          unlocked_at: string
          unlocked_by: string
        }
        Insert: {
          blocked_at?: string | null
          candidate_responded_at?: string | null
          candidate_response?: string
          conversation_id?: string | null
          created_at?: string
          expires_at: string
          id?: string
          purchase_id?: string | null
          talent_profile_id: string
          tenant_id: string
          unlocked_at?: string
          unlocked_by: string
        }
        Update: {
          blocked_at?: string | null
          candidate_responded_at?: string | null
          candidate_response?: string
          conversation_id?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          purchase_id?: string | null
          talent_profile_id?: string
          tenant_id?: string
          unlocked_at?: string
          unlocked_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "talent_contact_unlocks_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "talent_credit_purchases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "talent_contact_unlocks_talent_profile_id_fkey"
            columns: ["talent_profile_id"]
            isOneToOne: false
            referencedRelation: "talent_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "talent_contact_unlocks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      talent_conversations: {
        Row: {
          application_id: string | null
          conversation_type: string
          created_at: string
          employer_tenant_id: string
          id: string
          status: string
          talent_profile_id: string
          updated_at: string
        }
        Insert: {
          application_id?: string | null
          conversation_type?: string
          created_at?: string
          employer_tenant_id: string
          id?: string
          status?: string
          talent_profile_id: string
          updated_at?: string
        }
        Update: {
          application_id?: string | null
          conversation_type?: string
          created_at?: string
          employer_tenant_id?: string
          id?: string
          status?: string
          talent_profile_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "talent_conversations_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "talent_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "talent_conversations_employer_tenant_id_fkey"
            columns: ["employer_tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "talent_conversations_talent_profile_id_fkey"
            columns: ["talent_profile_id"]
            isOneToOne: false
            referencedRelation: "talent_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      talent_credit_ledger: {
        Row: {
          amount: number
          balance_after: number
          created_at: string
          entry_type: string
          id: string
          idempotency_key: string | null
          purchase_id: string | null
          reason: string | null
          tenant_id: string
          unlock_id: string | null
        }
        Insert: {
          amount: number
          balance_after: number
          created_at?: string
          entry_type: string
          id?: string
          idempotency_key?: string | null
          purchase_id?: string | null
          reason?: string | null
          tenant_id: string
          unlock_id?: string | null
        }
        Update: {
          amount?: number
          balance_after?: number
          created_at?: string
          entry_type?: string
          id?: string
          idempotency_key?: string | null
          purchase_id?: string | null
          reason?: string | null
          tenant_id?: string
          unlock_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "talent_credit_ledger_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "talent_credit_purchases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "talent_credit_ledger_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "talent_credit_ledger_unlock_id_fkey"
            columns: ["unlock_id"]
            isOneToOne: false
            referencedRelation: "talent_contact_unlocks"
            referencedColumns: ["id"]
          },
        ]
      }
      talent_credit_packs: {
        Row: {
          created_at: string
          credits: number
          id: string
          is_active: boolean
          name: string
          price_amount: number
          price_currency: string
          sort_order: number
          updated_at: string
          validity_days: number
        }
        Insert: {
          created_at?: string
          credits: number
          id?: string
          is_active?: boolean
          name: string
          price_amount: number
          price_currency?: string
          sort_order?: number
          updated_at?: string
          validity_days?: number
        }
        Update: {
          created_at?: string
          credits?: number
          id?: string
          is_active?: boolean
          name?: string
          price_amount?: number
          price_currency?: string
          sort_order?: number
          updated_at?: string
          validity_days?: number
        }
        Relationships: []
      }
      talent_credit_purchases: {
        Row: {
          cancelled_at: string | null
          created_at: string
          credits_purchased: number
          credits_remaining: number
          expired_at: string | null
          expires_at: string
          failed_at: string | null
          id: string
          idempotency_key: string | null
          pack_id: string
          paid_at: string | null
          payment_method: string | null
          price_currency: string
          price_paid: number
          purchased_by: string
          refunded_at: string | null
          status: string
          stripe_payment_id: string | null
          stripe_session_id: string | null
          tenant_id: string
        }
        Insert: {
          cancelled_at?: string | null
          created_at?: string
          credits_purchased: number
          credits_remaining: number
          expired_at?: string | null
          expires_at: string
          failed_at?: string | null
          id?: string
          idempotency_key?: string | null
          pack_id: string
          paid_at?: string | null
          payment_method?: string | null
          price_currency?: string
          price_paid: number
          purchased_by: string
          refunded_at?: string | null
          status?: string
          stripe_payment_id?: string | null
          stripe_session_id?: string | null
          tenant_id: string
        }
        Update: {
          cancelled_at?: string | null
          created_at?: string
          credits_purchased?: number
          credits_remaining?: number
          expired_at?: string | null
          expires_at?: string
          failed_at?: string | null
          id?: string
          idempotency_key?: string | null
          pack_id?: string
          paid_at?: string | null
          payment_method?: string | null
          price_currency?: string
          price_paid?: number
          purchased_by?: string
          refunded_at?: string | null
          status?: string
          stripe_payment_id?: string | null
          stripe_session_id?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "talent_credit_purchases_pack_id_fkey"
            columns: ["pack_id"]
            isOneToOne: false
            referencedRelation: "talent_credit_packs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "talent_credit_purchases_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      talent_credit_wallets: {
        Row: {
          balance: number
          created_at: string
          id: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          balance?: number
          created_at?: string
          id?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          balance?: number
          created_at?: string
          id?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "talent_credit_wallets_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      talent_interest_actions: {
        Row: {
          action_type: Database["public"]["Enums"]["talent_action_type"]
          created_at: string
          created_by: string | null
          id: string
          notes: string | null
          talent_profile_id: string
          talent_request_id: string | null
          tenant_id: string
        }
        Insert: {
          action_type: Database["public"]["Enums"]["talent_action_type"]
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          talent_profile_id: string
          talent_request_id?: string | null
          tenant_id: string
        }
        Update: {
          action_type?: Database["public"]["Enums"]["talent_action_type"]
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          talent_profile_id?: string
          talent_request_id?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "talent_interest_actions_talent_profile_id_fkey"
            columns: ["talent_profile_id"]
            isOneToOne: false
            referencedRelation: "talent_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "talent_interest_actions_talent_request_id_fkey"
            columns: ["talent_request_id"]
            isOneToOne: false
            referencedRelation: "talent_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "talent_interest_actions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      talent_messages: {
        Row: {
          conversation_id: string
          created_at: string
          id: string
          message_text: string | null
          message_type: string
          metadata: Json | null
          read_at: string | null
          sender_type: string
          sender_user_id: string
        }
        Insert: {
          conversation_id: string
          created_at?: string
          id?: string
          message_text?: string | null
          message_type?: string
          metadata?: Json | null
          read_at?: string | null
          sender_type: string
          sender_user_id: string
        }
        Update: {
          conversation_id?: string
          created_at?: string
          id?: string
          message_text?: string | null
          message_type?: string
          metadata?: Json | null
          read_at?: string | null
          sender_type?: string
          sender_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "talent_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "talent_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      talent_profiles: {
        Row: {
          available_from: string | null
          contact_visibility: boolean
          created_at: string
          employee_id: string
          employment_type_preference: string[] | null
          id: string
          languages: string[] | null
          open_to_work_flag: boolean
          opted_in_at: string | null
          opted_out_at: string | null
          preferred_countries: string[] | null
          preferred_locations: string[] | null
          preferred_regions: string[] | null
          preferred_roles: string[] | null
          preferred_work_radius_km: number | null
          profile_summary: string | null
          seeking_visibility: Database["public"]["Enums"]["talent_seeking_visibility"]
          talent_pool_status: Database["public"]["Enums"]["talent_pool_status"]
          tenant_id: string
          updated_at: string
          visibility_mode: Database["public"]["Enums"]["talent_visibility_mode"]
          willing_to_relocate: boolean | null
          willing_to_travel: boolean | null
          work_eligibility_countries: string[] | null
          years_experience: number | null
        }
        Insert: {
          available_from?: string | null
          contact_visibility?: boolean
          created_at?: string
          employee_id: string
          employment_type_preference?: string[] | null
          id?: string
          languages?: string[] | null
          open_to_work_flag?: boolean
          opted_in_at?: string | null
          opted_out_at?: string | null
          preferred_countries?: string[] | null
          preferred_locations?: string[] | null
          preferred_regions?: string[] | null
          preferred_roles?: string[] | null
          preferred_work_radius_km?: number | null
          profile_summary?: string | null
          seeking_visibility?: Database["public"]["Enums"]["talent_seeking_visibility"]
          talent_pool_status?: Database["public"]["Enums"]["talent_pool_status"]
          tenant_id: string
          updated_at?: string
          visibility_mode?: Database["public"]["Enums"]["talent_visibility_mode"]
          willing_to_relocate?: boolean | null
          willing_to_travel?: boolean | null
          work_eligibility_countries?: string[] | null
          years_experience?: number | null
        }
        Update: {
          available_from?: string | null
          contact_visibility?: boolean
          created_at?: string
          employee_id?: string
          employment_type_preference?: string[] | null
          id?: string
          languages?: string[] | null
          open_to_work_flag?: boolean
          opted_in_at?: string | null
          opted_out_at?: string | null
          preferred_countries?: string[] | null
          preferred_locations?: string[] | null
          preferred_regions?: string[] | null
          preferred_roles?: string[] | null
          preferred_work_radius_km?: number | null
          profile_summary?: string | null
          seeking_visibility?: Database["public"]["Enums"]["talent_seeking_visibility"]
          talent_pool_status?: Database["public"]["Enums"]["talent_pool_status"]
          tenant_id?: string
          updated_at?: string
          visibility_mode?: Database["public"]["Enums"]["talent_visibility_mode"]
          willing_to_relocate?: boolean | null
          willing_to_travel?: boolean | null
          work_eligibility_countries?: string[] | null
          years_experience?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "talent_profiles_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: true
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "talent_profiles_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: true
            referencedRelation: "employees_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "talent_profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      talent_request_matches: {
        Row: {
          created_at: string
          geography_match: boolean | null
          id: string
          match_reasoning: string | null
          match_score: number | null
          skill_match: boolean | null
          status: string
          talent_profile_id: string
          talent_request_id: string
          visibility_match: boolean | null
        }
        Insert: {
          created_at?: string
          geography_match?: boolean | null
          id?: string
          match_reasoning?: string | null
          match_score?: number | null
          skill_match?: boolean | null
          status?: string
          talent_profile_id: string
          talent_request_id: string
          visibility_match?: boolean | null
        }
        Update: {
          created_at?: string
          geography_match?: boolean | null
          id?: string
          match_reasoning?: string | null
          match_score?: number | null
          skill_match?: boolean | null
          status?: string
          talent_profile_id?: string
          talent_request_id?: string
          visibility_match?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "talent_request_matches_talent_profile_id_fkey"
            columns: ["talent_profile_id"]
            isOneToOne: false
            referencedRelation: "talent_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "talent_request_matches_talent_request_id_fkey"
            columns: ["talent_request_id"]
            isOneToOne: false
            referencedRelation: "talent_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      talent_requests: {
        Row: {
          country: string | null
          created_at: string
          created_by: string | null
          department: string | null
          employment_type: string | null
          id: string
          location: string | null
          notes: string | null
          region: string | null
          required_skills: string[] | null
          required_training: string[] | null
          role: string
          status: string
          tenant_id: string
          updated_at: string
          urgency: string | null
        }
        Insert: {
          country?: string | null
          created_at?: string
          created_by?: string | null
          department?: string | null
          employment_type?: string | null
          id?: string
          location?: string | null
          notes?: string | null
          region?: string | null
          required_skills?: string[] | null
          required_training?: string[] | null
          role: string
          status?: string
          tenant_id: string
          updated_at?: string
          urgency?: string | null
        }
        Update: {
          country?: string | null
          created_at?: string
          created_by?: string | null
          department?: string | null
          employment_type?: string | null
          id?: string
          location?: string | null
          notes?: string | null
          region?: string | null
          required_skills?: string[] | null
          required_training?: string[] | null
          role?: string
          status?: string
          tenant_id?: string
          updated_at?: string
          urgency?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "talent_requests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      talent_vacancies: {
        Row: {
          closes_at: string | null
          country: string | null
          created_at: string
          created_by: string | null
          description: string | null
          employment_type: string | null
          hourly_rate_max: number | null
          hourly_rate_min: number | null
          id: string
          location: string | null
          published_at: string | null
          salary_max: number | null
          salary_min: number | null
          start_date: string | null
          status: string
          tenant_id: string
          title: string
          updated_at: string
          urgency: string | null
        }
        Insert: {
          closes_at?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          employment_type?: string | null
          hourly_rate_max?: number | null
          hourly_rate_min?: number | null
          id?: string
          location?: string | null
          published_at?: string | null
          salary_max?: number | null
          salary_min?: number | null
          start_date?: string | null
          status?: string
          tenant_id: string
          title: string
          updated_at?: string
          urgency?: string | null
        }
        Update: {
          closes_at?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          employment_type?: string | null
          hourly_rate_max?: number | null
          hourly_rate_min?: number | null
          id?: string
          location?: string | null
          published_at?: string | null
          salary_max?: number | null
          salary_min?: number | null
          start_date?: string | null
          status?: string
          tenant_id?: string
          title?: string
          updated_at?: string
          urgency?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "talent_vacancies_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      talent_visibility_permissions: {
        Row: {
          allowed_country: string | null
          allowed_region: string | null
          allowed_tenant_id: string | null
          created_at: string
          id: string
          talent_profile_id: string
          visibility_level: string
        }
        Insert: {
          allowed_country?: string | null
          allowed_region?: string | null
          allowed_tenant_id?: string | null
          created_at?: string
          id?: string
          talent_profile_id: string
          visibility_level?: string
        }
        Update: {
          allowed_country?: string | null
          allowed_region?: string | null
          allowed_tenant_id?: string | null
          created_at?: string
          id?: string
          talent_profile_id?: string
          visibility_level?: string
        }
        Relationships: [
          {
            foreignKeyName: "talent_visibility_permissions_allowed_tenant_id_fkey"
            columns: ["allowed_tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "talent_visibility_permissions_talent_profile_id_fkey"
            columns: ["talent_profile_id"]
            isOneToOne: false
            referencedRelation: "talent_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_invitations: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          employee_id: string | null
          expires_at: string
          id: string
          invited_by: string | null
          last_reminder_at: string | null
          opened_at: string | null
          reminder_count: number
          role: Database["public"]["Enums"]["tenant_role"]
          status: string
          tenant_id: string
          token: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          employee_id?: string | null
          expires_at?: string
          id?: string
          invited_by?: string | null
          last_reminder_at?: string | null
          opened_at?: string | null
          reminder_count?: number
          role?: Database["public"]["Enums"]["tenant_role"]
          status?: string
          tenant_id: string
          token?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          employee_id?: string | null
          expires_at?: string
          id?: string
          invited_by?: string | null
          last_reminder_at?: string | null
          opened_at?: string | null
          reminder_count?: number
          role?: Database["public"]["Enums"]["tenant_role"]
          status?: string
          tenant_id?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_invitations_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_invitations_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_invitations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_leave_settings: {
        Row: {
          accrual_rate: number | null
          auto_calculate_accrual: boolean
          created_at: string
          id: string
          include_service_charge_in_holiday: boolean
          leave_year_start_day: number | null
          leave_year_start_month: number | null
          max_carryover_days: number | null
          rounding_precision: number
          standard_day_hours: number | null
          standard_week_hours: number | null
          tenant_id: string
          updated_at: string
          workdays_per_week: number | null
        }
        Insert: {
          accrual_rate?: number | null
          auto_calculate_accrual?: boolean
          created_at?: string
          id?: string
          include_service_charge_in_holiday?: boolean
          leave_year_start_day?: number | null
          leave_year_start_month?: number | null
          max_carryover_days?: number | null
          rounding_precision?: number
          standard_day_hours?: number | null
          standard_week_hours?: number | null
          tenant_id: string
          updated_at?: string
          workdays_per_week?: number | null
        }
        Update: {
          accrual_rate?: number | null
          auto_calculate_accrual?: boolean
          created_at?: string
          id?: string
          include_service_charge_in_holiday?: boolean
          leave_year_start_day?: number | null
          leave_year_start_month?: number | null
          max_carryover_days?: number | null
          rounding_precision?: number
          standard_day_hours?: number | null
          standard_week_hours?: number | null
          tenant_id?: string
          updated_at?: string
          workdays_per_week?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "tenant_leave_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_members: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          role: Database["public"]["Enums"]["tenant_role"]
          tenant_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          role?: Database["public"]["Enums"]["tenant_role"]
          tenant_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          role?: Database["public"]["Enums"]["tenant_role"]
          tenant_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_members_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_onboarding_requirements: {
        Row: {
          created_at: string
          display_order: number
          id: string
          is_critical: boolean
          is_required: boolean
          requirement_key: string
          requirement_label: string
          requirement_type: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          is_critical?: boolean
          is_required?: boolean
          requirement_key: string
          requirement_label: string
          requirement_type?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          is_critical?: boolean
          is_required?: boolean
          requirement_key?: string
          requirement_label?: string
          requirement_type?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_onboarding_requirements_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_onboarding_state: {
        Row: {
          completed_at: string | null
          completed_steps: Json
          created_at: string
          current_step: number
          id: string
          tenant_id: string
          updated_at: string
          wizard_data: Json
        }
        Insert: {
          completed_at?: string | null
          completed_steps?: Json
          created_at?: string
          current_step?: number
          id?: string
          tenant_id: string
          updated_at?: string
          wizard_data?: Json
        }
        Update: {
          completed_at?: string | null
          completed_steps?: Json
          created_at?: string
          current_step?: number
          id?: string
          tenant_id?: string
          updated_at?: string
          wizard_data?: Json
        }
        Relationships: [
          {
            foreignKeyName: "tenant_onboarding_state_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_preferences: {
        Row: {
          category: string
          id: string
          preferences: Json
          tenant_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          category: string
          id?: string
          preferences?: Json
          tenant_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          category?: string
          id?: string
          preferences?: Json
          tenant_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenant_preferences_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_subscriptions: {
        Row: {
          billing_cycle: string
          cancelled_at: string | null
          created_at: string
          current_period_end: string
          current_period_start: string
          grace_period_days: number
          id: string
          last_payment_at: string | null
          locked_currency: string | null
          locked_price_per_employee: number | null
          payment_due_date: string | null
          plan_id: string
          plan_version_at_signup: number | null
          price_locked: boolean
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          tenant_id: string
          trial_ends_at: string | null
          updated_at: string
        }
        Insert: {
          billing_cycle?: string
          cancelled_at?: string | null
          created_at?: string
          current_period_end?: string
          current_period_start?: string
          grace_period_days?: number
          id?: string
          last_payment_at?: string | null
          locked_currency?: string | null
          locked_price_per_employee?: number | null
          payment_due_date?: string | null
          plan_id: string
          plan_version_at_signup?: number | null
          price_locked?: boolean
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          tenant_id: string
          trial_ends_at?: string | null
          updated_at?: string
        }
        Update: {
          billing_cycle?: string
          cancelled_at?: string | null
          created_at?: string
          current_period_end?: string
          current_period_start?: string
          grace_period_days?: number
          id?: string
          last_payment_at?: string | null
          locked_currency?: string | null
          locked_price_per_employee?: number | null
          payment_due_date?: string | null
          plan_id?: string
          plan_version_at_signup?: number | null
          price_locked?: boolean
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          tenant_id?: string
          trial_ends_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_subscriptions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_templates: {
        Row: {
          business_type: string
          created_at: string
          created_by: string | null
          description: string | null
          icon: string | null
          id: string
          is_active: boolean
          is_platform_template: boolean
          name: string
          slug: string
          template_data: Json
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          business_type?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          is_platform_template?: boolean
          name: string
          slug: string
          template_data?: Json
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          business_type?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          is_platform_template?: boolean
          name?: string
          slug?: string
          template_data?: Json
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          address: string | null
          compliance_notes: string | null
          country: string
          created_at: string
          currency: string | null
          default_pay_model: string | null
          email: string | null
          enabled_modules: Json
          founding_partner: boolean
          founding_partner_expires_at: string | null
          id: string
          legal_name: string | null
          logo_url: string | null
          name: string
          payroll_frequency: string | null
          service_charge_enabled: boolean | null
          settings: Json
          slug: string
          status: Database["public"]["Enums"]["tenant_status"]
          timezone: string
          updated_at: string
          work_countries: string[] | null
        }
        Insert: {
          address?: string | null
          compliance_notes?: string | null
          country?: string
          created_at?: string
          currency?: string | null
          default_pay_model?: string | null
          email?: string | null
          enabled_modules?: Json
          founding_partner?: boolean
          founding_partner_expires_at?: string | null
          id?: string
          legal_name?: string | null
          logo_url?: string | null
          name: string
          payroll_frequency?: string | null
          service_charge_enabled?: boolean | null
          settings?: Json
          slug: string
          status?: Database["public"]["Enums"]["tenant_status"]
          timezone?: string
          updated_at?: string
          work_countries?: string[] | null
        }
        Update: {
          address?: string | null
          compliance_notes?: string | null
          country?: string
          created_at?: string
          currency?: string | null
          default_pay_model?: string | null
          email?: string | null
          enabled_modules?: Json
          founding_partner?: boolean
          founding_partner_expires_at?: string | null
          id?: string
          legal_name?: string | null
          logo_url?: string | null
          name?: string
          payroll_frequency?: string | null
          service_charge_enabled?: boolean | null
          settings?: Json
          slug?: string
          status?: Database["public"]["Enums"]["tenant_status"]
          timezone?: string
          updated_at?: string
          work_countries?: string[] | null
        }
        Relationships: []
      }
      time_entries: {
        Row: {
          adjusted_by: string | null
          adjustment_reason: string | null
          approved_at: string | null
          approved_by: string | null
          branch: string
          break_minutes: number | null
          clock_in_latitude: number | null
          clock_in_longitude: number | null
          clock_in_time: string
          clock_in_within_geofence: boolean | null
          clock_out_latitude: number | null
          clock_out_longitude: number | null
          clock_out_time: string | null
          clock_out_within_geofence: boolean | null
          created_at: string
          department: string
          employee_id: string
          id: string
          manager_adjusted: boolean
          manager_override: boolean | null
          notes: string | null
          override_reason: string | null
          scheduled_end: string | null
          scheduled_start: string | null
          shift_id: string | null
          status: Database["public"]["Enums"]["time_entry_status"]
          tenant_id: string
          total_hours: number | null
          updated_at: string
        }
        Insert: {
          adjusted_by?: string | null
          adjustment_reason?: string | null
          approved_at?: string | null
          approved_by?: string | null
          branch: string
          break_minutes?: number | null
          clock_in_latitude?: number | null
          clock_in_longitude?: number | null
          clock_in_time: string
          clock_in_within_geofence?: boolean | null
          clock_out_latitude?: number | null
          clock_out_longitude?: number | null
          clock_out_time?: string | null
          clock_out_within_geofence?: boolean | null
          created_at?: string
          department: string
          employee_id: string
          id?: string
          manager_adjusted?: boolean
          manager_override?: boolean | null
          notes?: string | null
          override_reason?: string | null
          scheduled_end?: string | null
          scheduled_start?: string | null
          shift_id?: string | null
          status?: Database["public"]["Enums"]["time_entry_status"]
          tenant_id: string
          total_hours?: number | null
          updated_at?: string
        }
        Update: {
          adjusted_by?: string | null
          adjustment_reason?: string | null
          approved_at?: string | null
          approved_by?: string | null
          branch?: string
          break_minutes?: number | null
          clock_in_latitude?: number | null
          clock_in_longitude?: number | null
          clock_in_time?: string
          clock_in_within_geofence?: boolean | null
          clock_out_latitude?: number | null
          clock_out_longitude?: number | null
          clock_out_time?: string | null
          clock_out_within_geofence?: boolean | null
          created_at?: string
          department?: string
          employee_id?: string
          id?: string
          manager_adjusted?: boolean
          manager_override?: boolean | null
          notes?: string | null
          override_reason?: string | null
          scheduled_end?: string | null
          scheduled_start?: string | null
          shift_id?: string | null
          status?: Database["public"]["Enums"]["time_entry_status"]
          tenant_id?: string
          total_hours?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "time_entries_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entries_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entries_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entries_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      timesheet_review_actions: {
        Row: {
          action_by: string | null
          action_type: string
          created_at: string
          id: string
          notes: string | null
          tenant_id: string
          time_entry_id: string
        }
        Insert: {
          action_by?: string | null
          action_type: string
          created_at?: string
          id?: string
          notes?: string | null
          tenant_id: string
          time_entry_id: string
        }
        Update: {
          action_by?: string | null
          action_type?: string
          created_at?: string
          id?: string
          notes?: string | null
          tenant_id?: string
          time_entry_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "timesheet_review_actions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timesheet_review_actions_time_entry_id_fkey"
            columns: ["time_entry_id"]
            isOneToOne: false
            referencedRelation: "time_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      training_assignments: {
        Row: {
          acknowledged_at: string | null
          assigned_at: string
          assigned_by: string | null
          assignment_source: string
          completed_at: string | null
          created_at: string
          document_id: string
          due_date: string | null
          employee_id: string
          id: string
          is_mandatory: boolean
          module_version: number | null
          notes: string | null
          quiz_passed: boolean | null
          quiz_score: number | null
          reminder_count: number
          score: number | null
          signed_off_at: string | null
          signed_off_by: string | null
          signoff_checklist: Json | null
          signoff_required: boolean
          signoff_status: string | null
          status: string
          tenant_id: string
          updated_at: string
          viewed_at: string | null
        }
        Insert: {
          acknowledged_at?: string | null
          assigned_at?: string
          assigned_by?: string | null
          assignment_source?: string
          completed_at?: string | null
          created_at?: string
          document_id: string
          due_date?: string | null
          employee_id: string
          id?: string
          is_mandatory?: boolean
          module_version?: number | null
          notes?: string | null
          quiz_passed?: boolean | null
          quiz_score?: number | null
          reminder_count?: number
          score?: number | null
          signed_off_at?: string | null
          signed_off_by?: string | null
          signoff_checklist?: Json | null
          signoff_required?: boolean
          signoff_status?: string | null
          status?: string
          tenant_id: string
          updated_at?: string
          viewed_at?: string | null
        }
        Update: {
          acknowledged_at?: string | null
          assigned_at?: string
          assigned_by?: string | null
          assignment_source?: string
          completed_at?: string | null
          created_at?: string
          document_id?: string
          due_date?: string | null
          employee_id?: string
          id?: string
          is_mandatory?: boolean
          module_version?: number | null
          notes?: string | null
          quiz_passed?: boolean | null
          quiz_score?: number | null
          reminder_count?: number
          score?: number | null
          signed_off_at?: string | null
          signed_off_by?: string | null
          signoff_checklist?: Json | null
          signoff_required?: boolean
          signoff_status?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
          viewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "training_assignments_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "training_library"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_assignments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_assignments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_assignments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      training_audit_log: {
        Row: {
          acting_user_id: string | null
          action: string
          assignment_id: string | null
          created_at: string
          document_id: string | null
          employee_id: string | null
          id: string
          metadata: Json | null
          tenant_id: string
        }
        Insert: {
          acting_user_id?: string | null
          action: string
          assignment_id?: string | null
          created_at?: string
          document_id?: string | null
          employee_id?: string | null
          id?: string
          metadata?: Json | null
          tenant_id: string
        }
        Update: {
          acting_user_id?: string | null
          action?: string
          assignment_id?: string | null
          created_at?: string
          document_id?: string | null
          employee_id?: string | null
          id?: string
          metadata?: Json | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_audit_log_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "training_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_audit_log_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "training_library"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_audit_log_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_audit_log_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_audit_log_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      training_auto_rules: {
        Row: {
          apply_to_new_starters: boolean
          created_at: string
          document_id: string
          due_days_after_start: number | null
          id: string
          is_active: boolean
          rule_name: string
          target_departments: string[] | null
          target_locations: string[] | null
          target_roles: string[] | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          apply_to_new_starters?: boolean
          created_at?: string
          document_id: string
          due_days_after_start?: number | null
          id?: string
          is_active?: boolean
          rule_name: string
          target_departments?: string[] | null
          target_locations?: string[] | null
          target_roles?: string[] | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          apply_to_new_starters?: boolean
          created_at?: string
          document_id?: string
          due_days_after_start?: number | null
          id?: string
          is_active?: boolean
          rule_name?: string
          target_departments?: string[] | null
          target_locations?: string[] | null
          target_roles?: string[] | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_auto_rules_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "training_library"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_auto_rules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      training_effectiveness_records: {
        Row: {
          baseline_signal_count: number
          confidence_level: string
          created_at: string
          delta_count: number
          delta_percent: number
          employee_id: string | null
          evaluation_type: string
          evaluation_window_days: number
          id: string
          location_id: string | null
          measured_at: string
          module_id: string
          notes: string | null
          post_training_signal_count: number
          result_status: string
          signal_types: string[]
          tenant_id: string
          updated_at: string
        }
        Insert: {
          baseline_signal_count?: number
          confidence_level?: string
          created_at?: string
          delta_count?: number
          delta_percent?: number
          employee_id?: string | null
          evaluation_type?: string
          evaluation_window_days?: number
          id?: string
          location_id?: string | null
          measured_at?: string
          module_id: string
          notes?: string | null
          post_training_signal_count?: number
          result_status?: string
          signal_types?: string[]
          tenant_id: string
          updated_at?: string
        }
        Update: {
          baseline_signal_count?: number
          confidence_level?: string
          created_at?: string
          delta_count?: number
          delta_percent?: number
          employee_id?: string | null
          evaluation_type?: string
          evaluation_window_days?: number
          id?: string
          location_id?: string | null
          measured_at?: string
          module_id?: string
          notes?: string | null
          post_training_signal_count?: number
          result_status?: string
          signal_types?: string[]
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_effectiveness_records_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_effectiveness_records_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_effectiveness_records_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "branch_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_effectiveness_records_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      training_files: {
        Row: {
          created_at: string
          file_name: string
          file_path: string
          file_size: number | null
          file_type: string | null
          id: string
          module_id: string
          tenant_id: string | null
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          file_name: string
          file_path: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          module_id: string
          tenant_id?: string | null
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          file_name?: string
          file_path?: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          module_id?: string
          tenant_id?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "training_files_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "training_library"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_files_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      training_library: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          archived_at: string | null
          audience_scope: string | null
          category: string
          change_log: string | null
          completion_type: string
          content_type: string
          content_url: string | null
          counts_toward_readiness: boolean
          created_at: string
          created_by: string | null
          description: string | null
          effective_date: string | null
          estimated_minutes: number | null
          expiry_date: string | null
          file_path: string | null
          id: string
          is_active: boolean
          is_mandatory: boolean
          last_reviewed_at: string | null
          last_reviewed_by: string | null
          pass_mark: number | null
          previous_version_id: string | null
          published_at: string | null
          refresher_days: number | null
          requires_acknowledgement: boolean
          requires_completion: boolean
          requires_quiz: boolean
          retry_limit: number | null
          review_date: string | null
          source_module_id: string | null
          source_type: string
          standards_metadata: Json | null
          status: string
          summary: string | null
          target_departments: string[] | null
          target_locations: string[] | null
          target_roles: string[] | null
          tenant_id: string | null
          title: string
          updated_at: string
          version: number
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          archived_at?: string | null
          audience_scope?: string | null
          category?: string
          change_log?: string | null
          completion_type?: string
          content_type?: string
          content_url?: string | null
          counts_toward_readiness?: boolean
          created_at?: string
          created_by?: string | null
          description?: string | null
          effective_date?: string | null
          estimated_minutes?: number | null
          expiry_date?: string | null
          file_path?: string | null
          id?: string
          is_active?: boolean
          is_mandatory?: boolean
          last_reviewed_at?: string | null
          last_reviewed_by?: string | null
          pass_mark?: number | null
          previous_version_id?: string | null
          published_at?: string | null
          refresher_days?: number | null
          requires_acknowledgement?: boolean
          requires_completion?: boolean
          requires_quiz?: boolean
          retry_limit?: number | null
          review_date?: string | null
          source_module_id?: string | null
          source_type?: string
          standards_metadata?: Json | null
          status?: string
          summary?: string | null
          target_departments?: string[] | null
          target_locations?: string[] | null
          target_roles?: string[] | null
          tenant_id?: string | null
          title: string
          updated_at?: string
          version?: number
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          archived_at?: string | null
          audience_scope?: string | null
          category?: string
          change_log?: string | null
          completion_type?: string
          content_type?: string
          content_url?: string | null
          counts_toward_readiness?: boolean
          created_at?: string
          created_by?: string | null
          description?: string | null
          effective_date?: string | null
          estimated_minutes?: number | null
          expiry_date?: string | null
          file_path?: string | null
          id?: string
          is_active?: boolean
          is_mandatory?: boolean
          last_reviewed_at?: string | null
          last_reviewed_by?: string | null
          pass_mark?: number | null
          previous_version_id?: string | null
          published_at?: string | null
          refresher_days?: number | null
          requires_acknowledgement?: boolean
          requires_completion?: boolean
          requires_quiz?: boolean
          retry_limit?: number | null
          review_date?: string | null
          source_module_id?: string | null
          source_type?: string
          standards_metadata?: Json | null
          status?: string
          summary?: string | null
          target_departments?: string[] | null
          target_locations?: string[] | null
          target_roles?: string[] | null
          tenant_id?: string | null
          title?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "training_library_previous_version_id_fkey"
            columns: ["previous_version_id"]
            isOneToOne: false
            referencedRelation: "training_library"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_library_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      training_module_evidence: {
        Row: {
          confidence_level: string
          created_at: string
          created_by: string | null
          document_id: string
          evidence_type: string
          id: string
          is_active: boolean
          source_notes: string | null
          source_organisation: string | null
          source_region: string | null
          source_title: string
          source_url: string | null
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          confidence_level?: string
          created_at?: string
          created_by?: string | null
          document_id: string
          evidence_type?: string
          id?: string
          is_active?: boolean
          source_notes?: string | null
          source_organisation?: string | null
          source_region?: string | null
          source_title: string
          source_url?: string | null
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          confidence_level?: string
          created_at?: string
          created_by?: string | null
          document_id?: string
          evidence_type?: string
          id?: string
          is_active?: boolean
          source_notes?: string | null
          source_organisation?: string | null
          source_region?: string | null
          source_title?: string
          source_url?: string | null
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_module_evidence_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "training_library"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_module_evidence_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      training_quiz_attempts: {
        Row: {
          answers_json: Json | null
          assignment_id: string
          attempt_number: number
          completed_at: string
          created_at: string
          document_id: string
          employee_id: string
          id: string
          passed: boolean
          score: number
          started_at: string | null
          tenant_id: string
        }
        Insert: {
          answers_json?: Json | null
          assignment_id: string
          attempt_number?: number
          completed_at?: string
          created_at?: string
          document_id: string
          employee_id: string
          id?: string
          passed?: boolean
          score?: number
          started_at?: string | null
          tenant_id: string
        }
        Update: {
          answers_json?: Json | null
          assignment_id?: string
          attempt_number?: number
          completed_at?: string
          created_at?: string
          document_id?: string
          employee_id?: string
          id?: string
          passed?: boolean
          score?: number
          started_at?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_quiz_attempts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      training_quiz_questions: {
        Row: {
          correct_option: number
          created_at: string
          display_order: number
          document_id: string
          explanation: string | null
          id: string
          options: Json
          question: string
          question_type: string
          tenant_id: string | null
        }
        Insert: {
          correct_option?: number
          created_at?: string
          display_order?: number
          document_id: string
          explanation?: string | null
          id?: string
          options?: Json
          question: string
          question_type?: string
          tenant_id?: string | null
        }
        Update: {
          correct_option?: number
          created_at?: string
          display_order?: number
          document_id?: string
          explanation?: string | null
          id?: string
          options?: Json
          question?: string
          question_type?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "training_quiz_questions_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "training_library"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_quiz_questions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      training_records: {
        Row: {
          certificate_file_path: string | null
          certification_name: string
          certification_type: string
          created_at: string
          date_obtained: string
          employee_id: string
          expiry_date: string | null
          id: string
          notes: string | null
          provider: string | null
          recorded_by: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          certificate_file_path?: string | null
          certification_name: string
          certification_type?: string
          created_at?: string
          date_obtained: string
          employee_id: string
          expiry_date?: string | null
          id?: string
          notes?: string | null
          provider?: string | null
          recorded_by?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          certificate_file_path?: string | null
          certification_name?: string
          certification_type?: string
          created_at?: string
          date_obtained?: string
          employee_id?: string
          expiry_date?: string | null
          id?: string
          notes?: string | null
          provider?: string | null
          recorded_by?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_records_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_records_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_records_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      training_review_insights: {
        Row: {
          confidence_level: string
          created_at: string
          created_by: string | null
          customer_impact: string | null
          document_id: string | null
          frequency_level: string
          id: string
          insight_tag: string
          is_active: boolean
          market_scope: string | null
          operational_problem: string | null
          review_channel: string | null
          suggested_training_response: string | null
          summary: string
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          confidence_level?: string
          created_at?: string
          created_by?: string | null
          customer_impact?: string | null
          document_id?: string | null
          frequency_level?: string
          id?: string
          insight_tag: string
          is_active?: boolean
          market_scope?: string | null
          operational_problem?: string | null
          review_channel?: string | null
          suggested_training_response?: string | null
          summary: string
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          confidence_level?: string
          created_at?: string
          created_by?: string | null
          customer_impact?: string | null
          document_id?: string | null
          frequency_level?: string
          id?: string
          insight_tag?: string
          is_active?: boolean
          market_scope?: string | null
          operational_problem?: string | null
          review_channel?: string | null
          suggested_training_response?: string | null
          summary?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_review_insights_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "training_library"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_review_insights_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      training_signoff_templates: {
        Row: {
          checklist: Json
          created_at: string
          id: string
          module_id: string
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          checklist?: Json
          created_at?: string
          id?: string
          module_id: string
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          checklist?: Json
          created_at?: string
          id?: string
          module_id?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_signoff_templates_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "training_library"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_signoff_templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          tenant_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          tenant_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      employees_safe: {
        Row: {
          archived_at: string | null
          created_at: string | null
          department: string | null
          employee_ref: string | null
          end_date: string | null
          forename: string | null
          id: string | null
          nationality: string | null
          notes: string | null
          start_date: string | null
          status: Database["public"]["Enums"]["employee_status"] | null
          surname: string | null
          tenant_id: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          archived_at?: string | null
          created_at?: string | null
          department?: string | null
          employee_ref?: string | null
          end_date?: string | null
          forename?: string | null
          id?: string | null
          nationality?: string | null
          notes?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["employee_status"] | null
          surname?: string | null
          tenant_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          archived_at?: string | null
          created_at?: string | null
          department?: string | null
          employee_ref?: string | null
          end_date?: string | null
          forename?: string | null
          id?: string | null
          nationality?: string | null
          notes?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["employee_status"] | null
          surname?: string | null
          tenant_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employees_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      activate_contract_terms: {
        Args: { _contract_id: string }
        Returns: {
          actual_service_charge_paid: number | null
          annual_salary: number | null
          base_hourly_rate: number | null
          contract_id: string | null
          contracted_hours: number | null
          contracted_hours_basis: string | null
          created_at: string
          created_by: string | null
          department: string | null
          effective_from: string
          effective_to: string | null
          employee_id: string
          employment_type: string | null
          estimated_service_charge_rate: number | null
          guaranteed_service_charge_rate: number | null
          holiday_entitlement_method: string | null
          hourly_rate: number | null
          id: string
          is_apprentice: boolean | null
          notice_period_weeks: number | null
          overtime_model: string | null
          pay_type: string | null
          probation_end_date: string | null
          role_title: string | null
          root_contract_id: string | null
          service_charge_eligible: boolean | null
          service_charge_policy_note: string | null
          source_amendment_id: string | null
          source_type: string
          status: string
          tenant_id: string
          tronc_scheme_name: string | null
          updated_at: string
          version_number: number
          work_location: string | null
        }
        SetofOptions: {
          from: "*"
          to: "employee_contract_terms"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      activate_scheduled_employment_terms: { Args: never; Returns: number }
      allocate_contract_reference: {
        Args: { _prefix?: string; _tenant_id: string }
        Returns: string
      }
      apply_to_vacancy: {
        Args: {
          _cover_message?: string
          _talent_profile_id: string
          _vacancy_id: string
        }
        Returns: Json
      }
      calculate_country_holiday_accrual: {
        Args: { _employee_id: string; _hours_worked: number }
        Returns: number
      }
      calculate_holiday_accrual: {
        Args: { hours_worked: number }
        Returns: number
      }
      can_read_storage_object: { Args: { _name: string }; Returns: boolean }
      can_view_incident: {
        Args: { _confidentiality: string; _tenant_id: string }
        Returns: boolean
      }
      ensure_accrual_ledger_for_entry: {
        Args: { _entry_id: string }
        Returns: undefined
      }
      expire_talent_credits: { Args: never; Returns: Json }
      finalise_talent_purchase: {
        Args: { _actor_id?: string; _new_status: string; _purchase_id: string }
        Returns: Json
      }
      get_active_employment_terms: {
        Args: { _as_of?: string; _employee_id: string }
        Returns: {
          actual_service_charge_paid: number | null
          annual_salary: number | null
          base_hourly_rate: number | null
          contract_id: string | null
          contracted_hours: number | null
          contracted_hours_basis: string | null
          created_at: string
          created_by: string | null
          department: string | null
          effective_from: string
          effective_to: string | null
          employee_id: string
          employment_type: string | null
          estimated_service_charge_rate: number | null
          guaranteed_service_charge_rate: number | null
          holiday_entitlement_method: string | null
          hourly_rate: number | null
          id: string
          is_apprentice: boolean | null
          notice_period_weeks: number | null
          overtime_model: string | null
          pay_type: string | null
          probation_end_date: string | null
          role_title: string | null
          root_contract_id: string | null
          service_charge_eligible: boolean | null
          service_charge_policy_note: string | null
          source_amendment_id: string | null
          source_type: string
          status: string
          tenant_id: string
          tronc_scheme_name: string | null
          updated_at: string
          version_number: number
          work_location: string | null
        }
        SetofOptions: {
          from: "*"
          to: "employee_contract_terms"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      get_scheduled_employment_terms: {
        Args: { _employee_id: string }
        Returns: {
          actual_service_charge_paid: number | null
          annual_salary: number | null
          base_hourly_rate: number | null
          contract_id: string | null
          contracted_hours: number | null
          contracted_hours_basis: string | null
          created_at: string
          created_by: string | null
          department: string | null
          effective_from: string
          effective_to: string | null
          employee_id: string
          employment_type: string | null
          estimated_service_charge_rate: number | null
          guaranteed_service_charge_rate: number | null
          holiday_entitlement_method: string | null
          hourly_rate: number | null
          id: string
          is_apprentice: boolean | null
          notice_period_weeks: number | null
          overtime_model: string | null
          pay_type: string | null
          probation_end_date: string | null
          role_title: string | null
          root_contract_id: string | null
          service_charge_eligible: boolean | null
          service_charge_policy_note: string | null
          source_amendment_id: string | null
          source_type: string
          status: string
          tenant_id: string
          tronc_scheme_name: string | null
          updated_at: string
          version_number: number
          work_location: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "employee_contract_terms"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      has_any_role: { Args: never; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_tenant_role: {
        Args: {
          _role: Database["public"]["Enums"]["tenant_role"]
          _tenant_id: string
        }
        Returns: boolean
      }
      is_locked_contract_object: { Args: { _name: string }; Returns: boolean }
      is_platform_admin: { Args: never; Returns: boolean }
      is_supervisor_only: { Args: never; Returns: boolean }
      is_supervisor_or_above: { Args: never; Returns: boolean }
      is_tenant_admin: { Args: { _tenant_id: string }; Returns: boolean }
      is_tenant_manager_or_above: {
        Args: { _tenant_id: string }
        Returns: boolean
      }
      is_tenant_member: { Args: { _tenant_id: string }; Returns: boolean }
      is_tenant_supervisor_or_above: {
        Args: { _tenant_id: string }
        Returns: boolean
      }
      link_user_to_employee: {
        Args: { _email: string; _user_id: string }
        Returns: Json
      }
      mark_talent_messages_read: {
        Args: { _conversation_id: string; _reader_sender_type: string }
        Returns: undefined
      }
      purchase_talent_credits: { Args: { _pack_id: string }; Returns: Json }
      reconcile_talent_wallet: { Args: { _tenant_id: string }; Returns: Json }
      respond_to_contact_request: {
        Args: { _block_reason?: string; _response: string; _unlock_id: string }
        Returns: Json
      }
      rotate_pending_invitation: {
        Args: { _invitation_id: string }
        Returns: {
          email: string
          expires_at: string
          invitation_id: string
          token: string
        }[]
      }
      seed_default_departments: {
        Args: { _tenant_id: string }
        Returns: undefined
      }
      storage_path_tenant_allowed: { Args: { _name: string }; Returns: boolean }
      unlock_talent_contact: {
        Args: { _intro_message?: string; _talent_profile_id: string }
        Returns: Json
      }
    }
    Enums: {
      app_role: "admin" | "manager" | "viewer" | "staff" | "supervisor"
      audit_action:
        | "create"
        | "update"
        | "delete"
        | "approve"
        | "reject"
        | "import"
      document_type:
        | "contract"
        | "id_document"
        | "passport"
        | "right_to_work"
        | "visa"
        | "driving_license"
        | "bank_statement"
        | "p45"
        | "p60"
        | "other"
      employee_status: "active" | "leaver" | "starter" | "onboarding"
      holiday_ledger_entry_type:
        | "accrual"
        | "carry_over_in"
        | "holiday_taken"
        | "manual_adjustment"
        | "correction"
        | "payout_on_termination"
        | "carry_over_out"
        | "expiry"
      payroll_status: "draft" | "pending" | "approved" | "rejected"
      shift_status: "scheduled" | "open" | "cancelled"
      talent_action_type:
        | "view_profile"
        | "shortlist"
        | "express_interest"
        | "request_contact"
        | "reject"
        | "withdraw"
      talent_pool_status:
        | "not_available"
        | "open_to_work"
        | "available_now"
        | "available_from_date"
        | "hidden"
        | "archived"
      talent_seeking_visibility:
        | "not_looking"
        | "discreetly_open"
        | "actively_available"
        | "selected_employers"
        | "specific_country_region"
      talent_visibility_mode:
        | "hidden"
        | "previous_employer_only"
        | "selected_companies"
        | "approved_country_region"
        | "all_approved"
      tenant_role:
        | "company_admin"
        | "manager"
        | "supervisor"
        | "employee"
        | "viewer"
      tenant_status:
        | "active"
        | "suspended"
        | "trial"
        | "cancelled"
        | "pending_setup"
      time_entry_status: "clocked_in" | "pending" | "approved" | "rejected"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "manager", "viewer", "staff", "supervisor"],
      audit_action: [
        "create",
        "update",
        "delete",
        "approve",
        "reject",
        "import",
      ],
      document_type: [
        "contract",
        "id_document",
        "passport",
        "right_to_work",
        "visa",
        "driving_license",
        "bank_statement",
        "p45",
        "p60",
        "other",
      ],
      employee_status: ["active", "leaver", "starter", "onboarding"],
      holiday_ledger_entry_type: [
        "accrual",
        "carry_over_in",
        "holiday_taken",
        "manual_adjustment",
        "correction",
        "payout_on_termination",
        "carry_over_out",
        "expiry",
      ],
      payroll_status: ["draft", "pending", "approved", "rejected"],
      shift_status: ["scheduled", "open", "cancelled"],
      talent_action_type: [
        "view_profile",
        "shortlist",
        "express_interest",
        "request_contact",
        "reject",
        "withdraw",
      ],
      talent_pool_status: [
        "not_available",
        "open_to_work",
        "available_now",
        "available_from_date",
        "hidden",
        "archived",
      ],
      talent_seeking_visibility: [
        "not_looking",
        "discreetly_open",
        "actively_available",
        "selected_employers",
        "specific_country_region",
      ],
      talent_visibility_mode: [
        "hidden",
        "previous_employer_only",
        "selected_companies",
        "approved_country_region",
        "all_approved",
      ],
      tenant_role: [
        "company_admin",
        "manager",
        "supervisor",
        "employee",
        "viewer",
      ],
      tenant_status: [
        "active",
        "suspended",
        "trial",
        "cancelled",
        "pending_setup",
      ],
      time_entry_status: ["clocked_in", "pending", "approved", "rejected"],
    },
  },
} as const
