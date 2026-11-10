
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "clients": {
                  Row: {
                    "address_line1": string | null,"address_line2": string | null,"archived_at": string | null,"city": string | null,"contact_name": string | null,"country_code": string,"created_at": string,"currency": string,"default_rate_minor": number | null,"email": string | null,"id": string,"name": string,"notes": string | null,"owner_id": string,"phone": string | null,"postal_code": string | null,"region": string | null,"tax_id": string | null,"updated_at": string,"website": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "address_line1"?: string | null,"address_line2"?: string | null,"archived_at"?: string | null,"city"?: string | null,"contact_name"?: string | null,"country_code"?: string,"created_at"?: string,"currency"?: string,"default_rate_minor"?: number | null,"email"?: string | null,"id"?: string,"name": string,"notes"?: string | null,"owner_id"?: string,"phone"?: string | null,"postal_code"?: string | null,"region"?: string | null,"tax_id"?: string | null,"updated_at"?: string,"website"?: string | null
                  }
                  Update: {
                    "address_line1"?: string | null,"address_line2"?: string | null,"archived_at"?: string | null,"city"?: string | null,"contact_name"?: string | null,"country_code"?: string,"created_at"?: string,"currency"?: string,"default_rate_minor"?: number | null,"email"?: string | null,"id"?: string,"name"?: string,"notes"?: string | null,"owner_id"?: string,"phone"?: string | null,"postal_code"?: string | null,"region"?: string | null,"tax_id"?: string | null,"updated_at"?: string,"website"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"expenses": {
                  Row: {
                    "amount_minor": number,"category": string,"created_at": string,"currency": string,"id": string,"notes": string | null,"owner_id": string,"spent_on": string,"tax_minor": number,"title": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "amount_minor": number,"category": string,"created_at"?: string,"currency"?: string,"id"?: string,"notes"?: string | null,"owner_id"?: string,"spent_on"?: string,"tax_minor"?: number,"title": string,"updated_at"?: string
                  }
                  Update: {
                    "amount_minor"?: number,"category"?: string,"created_at"?: string,"currency"?: string,"id"?: string,"notes"?: string | null,"owner_id"?: string,"spent_on"?: string,"tax_minor"?: number,"title"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"income_entries": {
                  Row: {
                    "amount_minor": number,"client_id": string | null,"created_at": string,"currency": string,"id": string,"notes": string | null,"owner_id": string,"received_on": string,"tax_minor": number,"title": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "amount_minor": number,"client_id"?: string | null,"created_at"?: string,"currency"?: string,"id"?: string,"notes"?: string | null,"owner_id"?: string,"received_on"?: string,"tax_minor"?: number,"title": string,"updated_at"?: string
                  }
                  Update: {
                    "amount_minor"?: number,"client_id"?: string | null,"created_at"?: string,"currency"?: string,"id"?: string,"notes"?: string | null,"owner_id"?: string,"received_on"?: string,"tax_minor"?: number,"title"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "income_entries_client_same_owner"
      columns: ["client_id","owner_id"]
isOneToOne: false
      referencedRelation: "clients"
      referencedColumns: ["id","owner_id"]
    }
                  ]
                },"invoice_lines": {
                  Row: {
                    "amount_minor": number,"created_at": string,"description": string,"id": string,"invoice_id": string,"owner_id": string,"position": number,"project_id": string | null,"quantity": number,"unit_price_minor": number,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "amount_minor"?: number,"created_at"?: string,"description": string,"id"?: string,"invoice_id": string,"owner_id"?: string,"position"?: number,"project_id"?: string | null,"quantity"?: number,"unit_price_minor": number,"updated_at"?: string
                  }
                  Update: {
                    "amount_minor"?: number,"created_at"?: string,"description"?: string,"id"?: string,"invoice_id"?: string,"owner_id"?: string,"position"?: number,"project_id"?: string | null,"quantity"?: number,"unit_price_minor"?: number,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "invoice_lines_invoice_same_owner"
      columns: ["invoice_id","owner_id"]
isOneToOne: false
      referencedRelation: "invoices"
      referencedColumns: ["id","owner_id"]
    },{
      foreignKeyName: "invoice_lines_project_same_owner"
      columns: ["project_id","owner_id"]
isOneToOne: false
      referencedRelation: "projects"
      referencedColumns: ["id","owner_id"]
    }
                  ]
                },"invoices": {
                  Row: {
                    "client_id": string,"client_snapshot": Json | null,"created_at": string,"currency": string,"due_date": string,"id": string,"issue_date": string,"issuer_snapshot": Json | null,"notes": string | null,"number": string,"owner_id": string,"paid_at": string | null,"sent_at": string | null,"status": string,"subtotal_minor": number,"tax_minor": number,"tax_name": string | null,"tax_rate_bps": number,"total_minor": number,"updated_at": string,"voided_at": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "client_id": string,"client_snapshot"?: Json | null,"created_at"?: string,"currency": string,"due_date"?: string,"id"?: string,"issue_date"?: string,"issuer_snapshot"?: Json | null,"notes"?: string | null,"number": string,"owner_id"?: string,"paid_at"?: string | null,"sent_at"?: string | null,"status"?: string,"subtotal_minor"?: number,"tax_minor"?: number,"tax_name"?: string | null,"tax_rate_bps"?: number,"total_minor"?: number,"updated_at"?: string,"voided_at"?: string | null
                  }
                  Update: {
                    "client_id"?: string,"client_snapshot"?: Json | null,"created_at"?: string,"currency"?: string,"due_date"?: string,"id"?: string,"issue_date"?: string,"issuer_snapshot"?: Json | null,"notes"?: string | null,"number"?: string,"owner_id"?: string,"paid_at"?: string | null,"sent_at"?: string | null,"status"?: string,"subtotal_minor"?: number,"tax_minor"?: number,"tax_name"?: string | null,"tax_rate_bps"?: number,"total_minor"?: number,"updated_at"?: string,"voided_at"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "invoices_client_same_owner"
      columns: ["client_id","owner_id"]
isOneToOne: false
      referencedRelation: "clients"
      referencedColumns: ["id","owner_id"]
    }
                  ]
                },"notes": {
                  Row: {
                    "body": string,"client_id": string | null,"created_at": string,"id": string,"owner_id": string,"pinned": boolean,"project_id": string | null,"space": string,"title": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "body"?: string,"client_id"?: string | null,"created_at"?: string,"id"?: string,"owner_id"?: string,"pinned"?: boolean,"project_id"?: string | null,"space"?: string,"title"?: string,"updated_at"?: string
                  }
                  Update: {
                    "body"?: string,"client_id"?: string | null,"created_at"?: string,"id"?: string,"owner_id"?: string,"pinned"?: boolean,"project_id"?: string | null,"space"?: string,"title"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "notes_client_same_owner"
      columns: ["client_id","owner_id"]
isOneToOne: false
      referencedRelation: "clients"
      referencedColumns: ["id","owner_id"]
    },{
      foreignKeyName: "notes_project_same_owner"
      columns: ["project_id","owner_id"]
isOneToOne: false
      referencedRelation: "projects"
      referencedColumns: ["id","owner_id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "address_line1": string | null,"address_line2": string | null,"business_email": string | null,"business_name": string | null,"business_phone": string | null,"city": string | null,"country_code": string,"created_at": string,"display_name": string | null,"gst_number": string | null,"id": string,"invoice_footer": string | null,"invoice_prefix": string,"next_invoice_number": number,"payment_terms_days": number,"postal_code": string | null,"region": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "address_line1"?: string | null,"address_line2"?: string | null,"business_email"?: string | null,"business_name"?: string | null,"business_phone"?: string | null,"city"?: string | null,"country_code"?: string,"created_at"?: string,"display_name"?: string | null,"gst_number"?: string | null,"id": string,"invoice_footer"?: string | null,"invoice_prefix"?: string,"next_invoice_number"?: number,"payment_terms_days"?: number,"postal_code"?: string | null,"region"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "address_line1"?: string | null,"address_line2"?: string | null,"business_email"?: string | null,"business_name"?: string | null,"business_phone"?: string | null,"city"?: string | null,"country_code"?: string,"created_at"?: string,"display_name"?: string | null,"gst_number"?: string | null,"id"?: string,"invoice_footer"?: string | null,"invoice_prefix"?: string,"next_invoice_number"?: number,"payment_terms_days"?: number,"postal_code"?: string | null,"region"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"projects": {
                  Row: {
                    "billing_type": string,"budget_minutes": number | null,"client_id": string,"created_at": string,"currency": string,"description": string | null,"due_date": string | null,"fixed_fee_minor": number | null,"hourly_rate_minor": number | null,"id": string,"name": string,"owner_id": string,"start_date": string | null,"status": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "billing_type"?: string,"budget_minutes"?: number | null,"client_id": string,"created_at"?: string,"currency"?: string,"description"?: string | null,"due_date"?: string | null,"fixed_fee_minor"?: number | null,"hourly_rate_minor"?: number | null,"id"?: string,"name": string,"owner_id"?: string,"start_date"?: string | null,"status"?: string,"updated_at"?: string
                  }
                  Update: {
                    "billing_type"?: string,"budget_minutes"?: number | null,"client_id"?: string,"created_at"?: string,"currency"?: string,"description"?: string | null,"due_date"?: string | null,"fixed_fee_minor"?: number | null,"hourly_rate_minor"?: number | null,"id"?: string,"name"?: string,"owner_id"?: string,"start_date"?: string | null,"status"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "projects_client_same_owner"
      columns: ["client_id","owner_id"]
isOneToOne: false
      referencedRelation: "clients"
      referencedColumns: ["id","owner_id"]
    }
                  ]
                },"tasks": {
                  Row: {
                    "completed_at": string | null,"created_at": string,"due_date": string | null,"estimate_minutes": number | null,"id": string,"notes": string | null,"owner_id": string,"priority": number,"project_id": string | null,"status": string,"title": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "completed_at"?: string | null,"created_at"?: string,"due_date"?: string | null,"estimate_minutes"?: number | null,"id"?: string,"notes"?: string | null,"owner_id"?: string,"priority"?: number,"project_id"?: string | null,"status"?: string,"title": string,"updated_at"?: string
                  }
                  Update: {
                    "completed_at"?: string | null,"created_at"?: string,"due_date"?: string | null,"estimate_minutes"?: number | null,"id"?: string,"notes"?: string | null,"owner_id"?: string,"priority"?: number,"project_id"?: string | null,"status"?: string,"title"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "tasks_project_same_owner"
      columns: ["project_id","owner_id"]
isOneToOne: false
      referencedRelation: "projects"
      referencedColumns: ["id","owner_id"]
    }
                  ]
                },"time_entries": {
                  Row: {
                    "billable": boolean,"client_id": string | null,"created_at": string,"description": string | null,"ended_at": string | null,"id": string,"invoice_line_id": string | null,"owner_id": string,"project_id": string | null,"started_at": string,"task_id": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "billable"?: boolean,"client_id"?: string | null,"created_at"?: string,"description"?: string | null,"ended_at"?: string | null,"id"?: string,"invoice_line_id"?: string | null,"owner_id"?: string,"project_id"?: string | null,"started_at"?: string,"task_id"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "billable"?: boolean,"client_id"?: string | null,"created_at"?: string,"description"?: string | null,"ended_at"?: string | null,"id"?: string,"invoice_line_id"?: string | null,"owner_id"?: string,"project_id"?: string | null,"started_at"?: string,"task_id"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "time_entries_client_same_owner"
      columns: ["client_id","owner_id"]
isOneToOne: false
      referencedRelation: "clients"
      referencedColumns: ["id","owner_id"]
    },{
      foreignKeyName: "time_entries_invoice_line_same_owner"
      columns: ["invoice_line_id","owner_id"]
isOneToOne: false
      referencedRelation: "invoice_lines"
      referencedColumns: ["id","owner_id"]
    },{
      foreignKeyName: "time_entries_project_same_owner"
      columns: ["project_id","owner_id"]
isOneToOne: false
      referencedRelation: "projects"
      referencedColumns: ["id","owner_id"]
    },{
      foreignKeyName: "time_entries_task_same_owner"
      columns: ["task_id","owner_id"]
isOneToOne: false
      referencedRelation: "tasks"
      referencedColumns: ["id","owner_id"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "allocate_invoice_number":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"start_timer":
{ Args: { "p_billable"?: boolean,"p_client_id"?: string,"p_description"?: string,"p_project_id"?: string,"p_task_id"?: string }; Returns: {
              "billable": boolean,
"client_id": string | null,
"created_at": string,
"description": string | null,
"ended_at": string | null,
"id": string,
"invoice_line_id": string | null,
"owner_id": string,
"project_id": string | null,
"started_at": string,
"task_id": string | null,
"updated_at": string
            }
                          SetofOptions: {
        from: "*"
        to: "time_entries"
        isOneToOne: true
        isSetofReturn: false
      } },
"stop_timer":
{ Args: Record<PropertyKey, never>; Returns: {
              "billable": boolean,
"client_id": string | null,
"created_at": string,
"description": string | null,
"ended_at": string | null,
"id": string,
"invoice_line_id": string | null,
"owner_id": string,
"project_id": string | null,
"started_at": string,
"task_id": string | null,
"updated_at": string
            }[]
                          SetofOptions: {
        from: "*"
        to: "time_entries"
        isOneToOne: false
        isSetofReturn: true
      } }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            
          }
        }
} as const
