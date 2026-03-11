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
    PostgrestVersion: "14.1"
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
      branch_locations: {
        Row: {
          address: string | null
          branch: Database["public"]["Enums"]["branch_type"]
          created_at: string
          display_name: string
          geofence_radius_meters: number
          id: string
          latitude: number
          longitude: number
          tenant_id: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          branch: Database["public"]["Enums"]["branch_type"]
          created_at?: string
          display_name: string
          geofence_radius_meters?: number
          id?: string
          latitude: number
          longitude: number
          tenant_id: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          branch?: Database["public"]["Enums"]["branch_type"]
          created_at?: string
          display_name?: string
          geofence_radius_meters?: number
          id?: string
          latitude?: number
          longitude?: number
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
          created_at: string
          default_pay_day: string | null
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
          created_at?: string
          default_pay_day?: string | null
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
          created_at?: string
          default_pay_day?: string | null
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
      contract_signatures: {
        Row: {
          consent_text: string
          created_at: string
          employee_document_id: string
          employee_id: string
          id: string
          ip_address: string | null
          signed_at: string
          signer_name: string
          signer_type: string
          tenant_id: string
          user_agent: string | null
        }
        Insert: {
          consent_text: string
          created_at?: string
          employee_document_id: string
          employee_id: string
          id?: string
          ip_address?: string | null
          signed_at?: string
          signer_name: string
          signer_type: string
          tenant_id: string
          user_agent?: string | null
        }
        Update: {
          consent_text?: string
          created_at?: string
          employee_document_id?: string
          employee_id?: string
          id?: string
          ip_address?: string | null
          signed_at?: string
          signer_name?: string
          signer_type?: string
          tenant_id?: string
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
            foreignKeyName: "contract_signatures_tenant_id_fkey"
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
            foreignKeyName: "disciplinary_records_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_branches: {
        Row: {
          branch: Database["public"]["Enums"]["branch_type"]
          created_at: string
          employee_id: string
          id: string
          is_primary: boolean | null
          tenant_id: string
        }
        Insert: {
          branch: Database["public"]["Enums"]["branch_type"]
          created_at?: string
          employee_id: string
          id?: string
          is_primary?: boolean | null
          tenant_id: string
        }
        Update: {
          branch?: Database["public"]["Enums"]["branch_type"]
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
            foreignKeyName: "employee_changes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_documents: {
        Row: {
          created_at: string
          document_name: string
          document_type: Database["public"]["Enums"]["document_type"]
          employee_id: string
          expires_at: string | null
          file_path: string
          file_size: number | null
          id: string
          mime_type: string | null
          notes: string | null
          tenant_id: string
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          document_name: string
          document_type: Database["public"]["Enums"]["document_type"]
          employee_id: string
          expires_at?: string | null
          file_path: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          notes?: string | null
          tenant_id: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          document_name?: string
          document_type?: Database["public"]["Enums"]["document_type"]
          employee_id?: string
          expires_at?: string | null
          file_path?: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          notes?: string | null
          tenant_id?: string
          updated_at?: string
          uploaded_by?: string | null
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
            foreignKeyName: "employee_documents_tenant_id_fkey"
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
          created_at: string
          department: Database["public"]["Enums"]["department_type"]
          employee_ref: string | null
          end_date: string | null
          forename: string
          hourly_rate: number
          id: string
          nationality: string | null
          ni_number: string | null
          notes: string | null
          passport_no: string | null
          residence_permit: string | null
          service_charge: number | null
          settlement_status: string | null
          sharing_code: string | null
          sort_code: string | null
          start_date: string | null
          status: Database["public"]["Enums"]["employee_status"]
          surname: string
          tenant_id: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          archived_at?: string | null
          bank_account_no?: string | null
          created_at?: string
          department: Database["public"]["Enums"]["department_type"]
          employee_ref?: string | null
          end_date?: string | null
          forename: string
          hourly_rate: number
          id?: string
          nationality?: string | null
          ni_number?: string | null
          notes?: string | null
          passport_no?: string | null
          residence_permit?: string | null
          service_charge?: number | null
          settlement_status?: string | null
          sharing_code?: string | null
          sort_code?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["employee_status"]
          surname: string
          tenant_id: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          archived_at?: string | null
          bank_account_no?: string | null
          created_at?: string
          department?: Database["public"]["Enums"]["department_type"]
          employee_ref?: string | null
          end_date?: string | null
          forename?: string
          hourly_rate?: number
          id?: string
          nationality?: string | null
          ni_number?: string | null
          notes?: string | null
          passport_no?: string | null
          residence_permit?: string | null
          service_charge?: number | null
          settlement_status?: string | null
          sharing_code?: string | null
          sort_code?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["employee_status"]
          surname?: string
          tenant_id?: string
          updated_at?: string
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
      location_settings: {
        Row: {
          address: string | null
          allow_mobile_clock_in: boolean
          allow_open_shifts: boolean
          allow_shift_offers: boolean
          allow_shift_swaps: boolean
          allow_web_clock_in: boolean
          auto_approve_timesheets: boolean
          branch: Database["public"]["Enums"]["branch_type"]
          created_at: string
          default_break_minutes: number
          display_name: string
          enforce_break_after_hours: number
          geofence_radius_meters: number
          id: string
          minimum_shift_length_minutes: number
          operating_hours: Json
          require_geofence: boolean
          require_gps_on_clock_in: boolean
          scheduling_suggestion_order: string
          tenant_id: string
          timezone: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          allow_mobile_clock_in?: boolean
          allow_open_shifts?: boolean
          allow_shift_offers?: boolean
          allow_shift_swaps?: boolean
          allow_web_clock_in?: boolean
          auto_approve_timesheets?: boolean
          branch: Database["public"]["Enums"]["branch_type"]
          created_at?: string
          default_break_minutes?: number
          display_name: string
          enforce_break_after_hours?: number
          geofence_radius_meters?: number
          id?: string
          minimum_shift_length_minutes?: number
          operating_hours?: Json
          require_geofence?: boolean
          require_gps_on_clock_in?: boolean
          scheduling_suggestion_order?: string
          tenant_id: string
          timezone?: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          allow_mobile_clock_in?: boolean
          allow_open_shifts?: boolean
          allow_shift_offers?: boolean
          allow_shift_swaps?: boolean
          allow_web_clock_in?: boolean
          auto_approve_timesheets?: boolean
          branch?: Database["public"]["Enums"]["branch_type"]
          created_at?: string
          default_break_minutes?: number
          display_name?: string
          enforce_break_after_hours?: number
          geofence_radius_meters?: number
          id?: string
          minimum_shift_length_minutes?: number
          operating_hours?: Json
          require_geofence?: boolean
          require_gps_on_clock_in?: boolean
          scheduling_suggestion_order?: string
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
            foreignKeyName: "return_to_work_forms_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      schedule_template_shifts: {
        Row: {
          created_at: string
          day_of_week: number
          employee_id: string | null
          end_time: string
          id: string
          notes: string | null
          start_time: string
          template_id: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          day_of_week: number
          employee_id?: string | null
          end_time: string
          id?: string
          notes?: string | null
          start_time: string
          template_id: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          day_of_week?: number
          employee_id?: string | null
          end_time?: string
          id?: string
          notes?: string | null
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
          name: string
          tenant_id: string
        }
        Insert: {
          branch: string
          created_at?: string
          created_by?: string | null
          department: string
          id?: string
          name: string
          tenant_id: string
        }
        Update: {
          branch?: string
          created_at?: string
          created_by?: string | null
          department?: string
          id?: string
          name?: string
          tenant_id?: string
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
      shifts: {
        Row: {
          branch: Database["public"]["Enums"]["branch_type"]
          created_at: string
          created_by: string | null
          department: Database["public"]["Enums"]["department_type"]
          employee_id: string | null
          end_time: string
          id: string
          is_published: boolean
          notes: string | null
          published_at: string | null
          shift_date: string
          start_time: string
          status: Database["public"]["Enums"]["shift_status"]
          tenant_id: string
          updated_at: string
        }
        Insert: {
          branch: Database["public"]["Enums"]["branch_type"]
          created_at?: string
          created_by?: string | null
          department: Database["public"]["Enums"]["department_type"]
          employee_id?: string | null
          end_time: string
          id?: string
          is_published?: boolean
          notes?: string | null
          published_at?: string | null
          shift_date: string
          start_time: string
          status?: Database["public"]["Enums"]["shift_status"]
          tenant_id: string
          updated_at?: string
        }
        Update: {
          branch?: Database["public"]["Enums"]["branch_type"]
          created_at?: string
          created_by?: string | null
          department?: Database["public"]["Enums"]["department_type"]
          employee_id?: string | null
          end_time?: string
          id?: string
          is_published?: boolean
          notes?: string | null
          published_at?: string | null
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
      subscription_plans: {
        Row: {
          created_at: string
          description: string | null
          enabled_modules: Json
          features: Json
          id: string
          is_active: boolean
          max_employees: number | null
          max_locations: number | null
          name: string
          price_annual: number
          price_monthly: number
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          enabled_modules?: Json
          features?: Json
          id?: string
          is_active?: boolean
          max_employees?: number | null
          max_locations?: number | null
          name: string
          price_annual?: number
          price_monthly?: number
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          enabled_modules?: Json
          features?: Json
          id?: string
          is_active?: boolean
          max_employees?: number | null
          max_locations?: number | null
          name?: string
          price_annual?: number
          price_monthly?: number
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      tenant_invitations: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string | null
          role: Database["public"]["Enums"]["tenant_role"]
          status: string
          tenant_id: string
          token: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          role?: Database["public"]["Enums"]["tenant_role"]
          status?: string
          tenant_id: string
          token?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          role?: Database["public"]["Enums"]["tenant_role"]
          status?: string
          tenant_id?: string
          token?: string
        }
        Relationships: [
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
      tenant_subscriptions: {
        Row: {
          billing_cycle: string
          cancelled_at: string | null
          created_at: string
          current_period_end: string
          current_period_start: string
          id: string
          plan_id: string
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
          id?: string
          plan_id: string
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
          id?: string
          plan_id?: string
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
          country: string
          created_at: string
          email: string | null
          enabled_modules: Json
          id: string
          logo_url: string | null
          name: string
          settings: Json
          slug: string
          status: Database["public"]["Enums"]["tenant_status"]
          timezone: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          country?: string
          created_at?: string
          email?: string | null
          enabled_modules?: Json
          id?: string
          logo_url?: string | null
          name: string
          settings?: Json
          slug: string
          status?: Database["public"]["Enums"]["tenant_status"]
          timezone?: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          country?: string
          created_at?: string
          email?: string | null
          enabled_modules?: Json
          id?: string
          logo_url?: string | null
          name?: string
          settings?: Json
          slug?: string
          status?: Database["public"]["Enums"]["tenant_status"]
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      time_entries: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          branch: Database["public"]["Enums"]["branch_type"]
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
          department: Database["public"]["Enums"]["department_type"]
          employee_id: string
          id: string
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
          approved_at?: string | null
          approved_by?: string | null
          branch: Database["public"]["Enums"]["branch_type"]
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
          department: Database["public"]["Enums"]["department_type"]
          employee_id: string
          id?: string
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
          approved_at?: string | null
          approved_by?: string | null
          branch?: Database["public"]["Enums"]["branch_type"]
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
          department?: Database["public"]["Enums"]["department_type"]
          employee_id?: string
          id?: string
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
            foreignKeyName: "training_records_tenant_id_fkey"
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
      [_ in never]: never
    }
    Functions: {
      calculate_holiday_accrual: {
        Args: { hours_worked: number }
        Returns: number
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
      is_admin: { Args: never; Returns: boolean }
      is_manager_or_above: { Args: never; Returns: boolean }
      is_platform_admin: { Args: never; Returns: boolean }
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
      branch_type: "Fitzrovia" | "Carnaby" | "Brixton"
      department_type: "FOH" | "BOH" | "CPU"
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
      employee_status: "active" | "leaver" | "starter"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
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
      branch_type: ["Fitzrovia", "Carnaby", "Brixton"],
      department_type: ["FOH", "BOH", "CPU"],
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
      employee_status: ["active", "leaver", "starter"],
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
