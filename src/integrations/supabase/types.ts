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
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      employee_branches: {
        Row: {
          branch: Database["public"]["Enums"]["branch_type"]
          created_at: string
          employee_id: string
          id: string
          is_primary: boolean | null
        }
        Insert: {
          branch: Database["public"]["Enums"]["branch_type"]
          created_at?: string
          employee_id: string
          id?: string
          is_primary?: boolean | null
        }
        Update: {
          branch?: Database["public"]["Enums"]["branch_type"]
          created_at?: string
          employee_id?: string
          id?: string
          is_primary?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_branches_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
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
        }
        Relationships: [
          {
            foreignKeyName: "employee_changes_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
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
        ]
      }
      employees: {
        Row: {
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
          updated_at: string
        }
        Insert: {
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
          updated_at?: string
        }
        Update: {
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
          updated_at?: string
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
        ]
      }
      holiday_payments: {
        Row: {
          created_at: string
          employee_id: string | null
          employee_name: string
          hours: number
          id: string
          notes: string | null
          payroll_period_id: string
          rate: number
          total: number
        }
        Insert: {
          created_at?: string
          employee_id?: string | null
          employee_name: string
          hours: number
          id?: string
          notes?: string | null
          payroll_period_id: string
          rate: number
          total: number
        }
        Update: {
          created_at?: string
          employee_id?: string | null
          employee_name?: string
          hours?: number
          id?: string
          notes?: string | null
          payroll_period_id?: string
          rate?: number
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
        ]
      }
      payroll_entries: {
        Row: {
          bank_details_exported: boolean | null
          created_at: string
          employee_id: string
          holiday_accrued_hours: number | null
          hourly_rate: number
          id: string
          notes: string | null
          payroll_period_id: string
          performance_bonus: number | null
          service_charge: number | null
          special_bonus: number | null
          timesheet_hours: number
          total_pay: number
          updated_at: string
        }
        Insert: {
          bank_details_exported?: boolean | null
          created_at?: string
          employee_id: string
          holiday_accrued_hours?: number | null
          hourly_rate: number
          id?: string
          notes?: string | null
          payroll_period_id: string
          performance_bonus?: number | null
          service_charge?: number | null
          special_bonus?: number | null
          timesheet_hours?: number
          total_pay?: number
          updated_at?: string
        }
        Update: {
          bank_details_exported?: boolean | null
          created_at?: string
          employee_id?: string
          holiday_accrued_hours?: number | null
          hourly_rate?: number
          id?: string
          notes?: string | null
          payroll_period_id?: string
          performance_bonus?: number | null
          service_charge?: number | null
          special_bonus?: number | null
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
        }
        Relationships: [
          {
            foreignKeyName: "payroll_imports_payroll_period_id_fkey"
            columns: ["payroll_period_id"]
            isOneToOne: false
            referencedRelation: "payroll_periods"
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
          start_date: string
          status: Database["public"]["Enums"]["payroll_status"]
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
          start_date: string
          status?: Database["public"]["Enums"]["payroll_status"]
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
          start_date?: string
          status?: Database["public"]["Enums"]["payroll_status"]
          timesheet_total?: number | null
          updated_at?: string
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
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
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
      is_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "manager" | "viewer"
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
      payroll_status: "draft" | "pending" | "approved" | "rejected"
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
      app_role: ["admin", "manager", "viewer"],
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
      payroll_status: ["draft", "pending", "approved", "rejected"],
    },
  },
} as const
